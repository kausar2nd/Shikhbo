import math
import os
import warnings
from collections import defaultdict
from pathlib import Path

from huggingface_hub import InferenceClient
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from rank_bm25 import BM25Okapi

warnings.filterwarnings("ignore")

# ── Config ───────
EMBEDDING_MODEL = "BAAI/bge-m3"
HF_ACCESS_TOKEN = os.getenv("HF_ACCESS_TOKEN")

VECTOR_WEIGHT = 0.6
BM25_WEIGHT = 0.4
TOP_K = 3
RRF_K = 60


# ── Helpers ──────
def _matches_filter(
    metadata: dict,
    class_filter: str | None,
    subject_filter: str | None,
) -> bool:
    if class_filter and metadata.get("class", "").upper() != class_filter.upper():
        return False

    if subject_filter and metadata.get("subject", "").upper() != subject_filter.upper():
        return False

    return True


# ── Embeddings ───
class HFEmbeddings(Embeddings):
    """HuggingFace Inference API embeddings with mean pooling and L2 normalization."""

    def __init__(
        self,
        model_name: str = EMBEDDING_MODEL,
        api_token: str | None = None,
    ):
        token = api_token or HF_ACCESS_TOKEN
        if not token:
            raise ValueError("HF_ACCESS_TOKEN environment variable is not set.")

        self.model_name = model_name
        self.client = InferenceClient(
            provider="hf-inference",
            api_key=token,
        )

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def _embed(self, text: str) -> list[float]:
        raw = self.client.feature_extraction(
            text,
            model=self.model_name,
        )

        if hasattr(raw, "tolist"):
            raw = raw.tolist()

        if isinstance(raw, list) and raw and isinstance(raw[0], list):
            raw = self._mean_pool(raw)

        vector = [float(v) for v in raw]
        return self._l2_normalize(vector)

    @staticmethod
    def _mean_pool(token_embeddings: list[list[float]]) -> list[float]:
        n = len(token_embeddings)
        dim = len(token_embeddings[0])

        return [sum(token_embeddings[i][d] for i in range(n)) / n for d in range(dim)]

    @staticmethod
    def _l2_normalize(vector: list[float]) -> list[float]:
        norm = math.sqrt(sum(x * x for x in vector))
        return vector if norm == 0 else [x / norm for x in vector]


# ── Retriever ────
class Retriever:
    def __init__(self, embedding_model: str = EMBEDDING_MODEL):
        db_dir = (
            Path(__file__).resolve().parent.parent.parent / "knowledge_base"
        )

        if not db_dir.exists():
            raise FileNotFoundError(f"Database directory not found: {db_dir}")

        self.embeddings = HFEmbeddings(model_name=embedding_model)

        print("Loading FAISS index...")

        self.vector_store = FAISS.load_local(
            str(db_dir),
            embeddings=self.embeddings,
            allow_dangerous_deserialization=True,
        )

        self._docs: list[Document] = list(self.vector_store.docstore._dict.values())

        print(f"Loaded {len(self._docs)} documents.")

        print("Building BM25 index...")

        tokenized_docs = [doc.page_content.lower().split() for doc in self._docs]

        self._bm25 = BM25Okapi(tokenized_docs)

        print("Retriever ready.")

    # ── Public ─
    def retrieve(
        self,
        query: str,
        class_filter: str | None = None,
        subject_filter: str | None = None,
    ) -> list[Document]:

        vector_hits = self._vector_search(
            query,
            class_filter,
            subject_filter,
        )

        bm25_hits = self._bm25_search(
            query,
            class_filter,
            subject_filter,
        )

        return self._fuse(vector_hits, bm25_hits)

    # ── Dense Retrieval
    def _vector_search(
        self,
        query: str,
        class_filter: str | None,
        subject_filter: str | None,
    ) -> list[Document]:

        candidates = self.vector_store.similarity_search(
            query,
            k=TOP_K * 5,
        )

        filtered = [
            doc
            for doc in candidates
            if _matches_filter(
                doc.metadata,
                class_filter,
                subject_filter,
            )
        ]
        return filtered[:TOP_K]

    # ── Sparse Retrieval
    def _bm25_search(
        self,
        query: str,
        class_filter: str | None,
        subject_filter: str | None,
    ) -> list[Document]:
        scores = self._bm25.get_scores(query.lower().split()).tolist()
        scored = [
            (doc, score)
            for doc, score in zip(self._docs, scores)
            if _matches_filter(
                doc.metadata,
                class_filter,
                subject_filter,
            )
        ]
        scored.sort(
            key=lambda item: item[1],
            reverse=True,
        )

        return [doc for doc, _ in scored[:TOP_K]]

    # ── Weighted Reciprocal Rank Fusion ───────────────────────────────────
    def _fuse(
        self,
        vector_hits: list[Document],
        bm25_hits: list[Document],
    ) -> list[Document]:
        scores = defaultdict(float)
        doc_map: dict[str, Document] = {}

        for rank, doc in enumerate(vector_hits, start=1):
            uid = doc.metadata.get("source", str(id(doc)))

            scores[uid] += VECTOR_WEIGHT / (RRF_K + rank)
            doc_map[uid] = doc

        for rank, doc in enumerate(bm25_hits, start=1):
            uid = doc.metadata.get("source", str(id(doc)))

            scores[uid] += BM25_WEIGHT / (RRF_K + rank)
            doc_map[uid] = doc

        top_uids = sorted(
            scores,
            key=scores.get,
            reverse=True,
        )[:TOP_K]

        return [doc_map[uid] for uid in top_uids]


# ── Smoke Test ───
if __name__ == "__main__":
    query = "what is information and communication technology?"
    class_filter = "SSC"
    subject_filter = "ICT"

    retriever = Retriever()

    results = retriever.retrieve(
        query,
        class_filter,
        subject_filter,
    )

    print(
        f"\nTop {len(results)} results "
        f"(class={class_filter!r}, subject={subject_filter!r}):\n"
    )
