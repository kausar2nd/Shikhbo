import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import torch
from FlagEmbedding import FlagReranker
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from rank_bm25 import BM25Okapi

warnings.filterwarnings("ignore")

# ── Configuration

EMBEDDING_MODEL = "BAAI/bge-m3"
RERANKER_MODEL = "BAAI/bge-reranker-v2-m3"

VECTOR_WEIGHT = 0.6
BM25_WEIGHT = 0.4

TOP_K_RETRIEVE = 10
TOP_K_HYBRID = 10
TOP_K_FINAL = 3
FAST_TOP_K = 3

RRF_K = 60


# ── Utility
def _rrf_score(rank: int, k: int = RRF_K) -> float:
    return 1.0 / (k + rank)


def _matches_filter(
    metadata: dict,
    class_filter: Optional[str],
    subject_filter: Optional[str],
) -> bool:
    if class_filter and metadata.get("class", "").upper() != class_filter.upper():
        return False

    if subject_filter and metadata.get("subject", "").upper() != subject_filter.upper():
        return False

    return True


class Retriever:

    def __init__(
        self,
        embedding_model: str = EMBEDDING_MODEL,
        reranker_model: str = RERANKER_MODEL,
        vector_weight: float = VECTOR_WEIGHT,
        bm25_weight: float = BM25_WEIGHT,
        top_k_retrieve: int = TOP_K_RETRIEVE,
        top_k_hybrid: int = TOP_K_HYBRID,
        top_k_final: int = TOP_K_FINAL,
    ):
        self.embedding_model = embedding_model
        self.reranker_model = reranker_model

        self.vector_weight = vector_weight
        self.bm25_weight = bm25_weight

        self.top_k_retrieve = top_k_retrieve
        self.top_k_hybrid = top_k_hybrid
        self.top_k_final = top_k_final

        # ── DB directory
        project_root = Path(__file__).resolve().parent.parent.parent
        db_dir = project_root / "knowledge_base"

        if not db_dir.exists():
            raise FileNotFoundError(f"Database directory not found: {db_dir}")

        # ── Embedding model
        device = "cuda" if torch.cuda.is_available() else "cpu"

        print(f"Loading embedding model on {device}...")

        self.embeddings = HuggingFaceEmbeddings(
            model_name=embedding_model,
            encode_kwargs={
                "normalize_embeddings": True,
                "device": device,
            },
        )

        # ── FAISS vector store
        print("Loading FAISS index...")

        self.vector_store = FAISS.load_local(
            str(db_dir),
            self.embeddings,
            allow_dangerous_deserialization=True,
        )

        # ── Load all documents
        self._all_docs: List[Document] = list(self.vector_store.docstore._dict.values())

        print(f"Loaded {len(self._all_docs)} documents.")

        # ── BM25 setup
        print("Building BM25 index...")

        self._tokenized_corpus = [
            doc.page_content.lower().split() for doc in self._all_docs
        ]

        self._bm25 = BM25Okapi(self._tokenized_corpus)

        # ── Lazy-loaded reranker
        self._reranker: Optional[FlagReranker] = None

        print("Retriever ready.")

    # ── Dense retrieval
    def _vector_search(
        self,
        query: str,
        k: int,
        class_filter: Optional[str],
        subject_filter: Optional[str],
    ) -> List[Tuple[Document, float]]:

        filter_fn = None

        if class_filter or subject_filter:
            filter_fn = lambda meta: _matches_filter(
                meta,
                class_filter,
                subject_filter,
            )

        return self.vector_store.similarity_search_with_relevance_scores(
            query,
            k=k,
            filter=filter_fn,
        )

    # ── Sparse retrieval
    def _bm25_search(
        self,
        query: str,
        k: int,
        class_filter: Optional[str],
        subject_filter: Optional[str],
    ) -> List[Tuple[Document, float]]:

        query_tokens = query.lower().split()

        scores = self._bm25.get_scores(query_tokens).tolist()

        scored_docs = []

        for doc, score in zip(self._all_docs, scores):

            if not _matches_filter(
                doc.metadata,
                class_filter,
                subject_filter,
            ):
                continue

            scored_docs.append((doc, float(score)))

        scored_docs.sort(
            key=lambda x: x[1],
            reverse=True,
        )

        return scored_docs[:k]

    # ── Hybrid fusion (weighted RRF)
    def _hybrid_fuse(
        self,
        vector_results: List[Tuple[Document, float]],
        bm25_results: List[Tuple[Document, float]],
    ) -> List[Document]:

        scores: Dict[str, float] = {}
        doc_map: Dict[str, Document] = {}

        # Dense scores
        for rank, (doc, _) in enumerate(vector_results, start=1):

            uid = doc.metadata.get(
                "source",
                str(id(doc)),
            )

            scores[uid] = scores.get(uid, 0.0) + self.vector_weight * _rrf_score(rank)

            doc_map[uid] = doc

        # Sparse scores
        for rank, (doc, _) in enumerate(bm25_results, start=1):

            uid = doc.metadata.get(
                "source",
                str(id(doc)),
            )

            scores[uid] = scores.get(uid, 0.0) + self.bm25_weight * _rrf_score(rank)

            doc_map[uid] = doc

        top_uids = sorted(
            scores,
            key=scores.__getitem__,
            reverse=True,
        )[: self.top_k_hybrid]

        return [doc_map[uid] for uid in top_uids]

    # ── Cross-encoder reranking
    def _rerank(
        self,
        query: str,
        docs: List[Document],
    ) -> List[Document]:

        if not docs:
            return []

        if self._reranker is None:
            print(f"Loading reranker model ({self.reranker_model})...")

            self._reranker = FlagReranker(self.reranker_model)

        pairs = [[query, doc.page_content] for doc in docs]

        scores = self._reranker.compute_score(pairs)

        # Handle single result edge case
        if isinstance(scores, float):
            scores = [scores]

        for doc, score in zip(docs, scores):
            doc.metadata["reranker_score"] = float(score)

        return sorted(
            docs,
            key=lambda d: d.metadata.get(
                "reranker_score",
                float("-inf"),
            ),
            reverse=True,
        )[: self.top_k_final]

    # ── Public API
    def retrieve(
        self,
        query: str,
        class_filter: Optional[str] = None,
        subject_filter: Optional[str] = None,
        response_quality: str = "fast",
    ) -> List[Document]:

        k = self.top_k_retrieve

        # 1. Dense retrieval
        vector_results = self._vector_search(
            query=query,
            k=k,
            class_filter=class_filter,
            subject_filter=subject_filter,
        )

        # 2. Sparse retrieval
        bm25_results = self._bm25_search(
            query=query,
            k=k,
            class_filter=class_filter,
            subject_filter=subject_filter,
        )

        # 3. Hybrid fusion
        fused_candidates = self._hybrid_fuse(
            vector_results=vector_results,
            bm25_results=bm25_results,
        )

        # 4. Fast mode → skip reranker
        if isinstance(response_quality, str) and response_quality.lower() == "fast":
            return fused_candidates[:FAST_TOP_K]

        # 5. Cross-encoder reranking
        return self._rerank(
            query=query,
            docs=fused_candidates,
        )


# ─── Smoke Test
if __name__ == "__main__":

    query = "what is information and communication technology?"  # example query
    class_filter = "SSC"
    subject_filter = "ICT"

    retriever = Retriever()

    results = retriever.retrieve(
        query=query,
        class_filter=class_filter,
        subject_filter=subject_filter,
    )

    print(
        f"\nTop {len(results)} results for class={class_filter!r}, subject={subject_filter!r}:\n"
    )

    for idx, doc in enumerate(results, start=1):
        score = doc.metadata.get("reranker_score", float("nan"))
        print(f"[{idx}] reranker_score={score:.4f}")
        print(
            f"     class={doc.metadata.get('class')}  subject={doc.metadata.get('subject')}"
        )
        print(doc.page_content[:300])
        print("─" * 80)
