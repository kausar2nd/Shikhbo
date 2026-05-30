import sys
import ollama
from urllib import response
from pathlib import Path
from langchain_core.documents import Document
from typing import List, Generator as TypeGenerator

project_root = str(Path(__file__).parent.parent.parent.resolve())
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from scripts.utils.context_builder import ContextBuilder

DEFAULT_MODEL = "gemma2:2b"


def format_sources(docs: List[Document]) -> List[str]:
    if not docs:
        return []

    sources = []
    for doc in docs:
        metadata = doc.metadata or {}
        class_level = metadata.get("class", "N/A")
        subject = metadata.get("subject", "N/A")
        chapter_no = metadata.get("chapter_no", "N/A")
        chapter_title = metadata.get("chapter_title", "N/A")
        page_no = metadata.get("page_no", "N/A")
        source = metadata.get("source", "NCTB")

        sources.append(
            f"{class_level} {subject} — Chapter {chapter_no} ({chapter_title}), "
            f"Page {page_no} [{source}]"
        )

    unique = list(dict.fromkeys(sources))
    return unique


class Generator:

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self.context_builder = ContextBuilder()
        print(f"[Generator] Ready — model: {self.model}")

    def generate_stream(
        self,
        messages: list,
        docs: List[Document],
        include_sources: bool = True,
    ) -> TypeGenerator[dict, None, None]:
        if not docs:
            yield {
                "chunk": "I could not find relevant information to answer your question.\n\n"
            }
            yield {"sources": []}
            return

        # 1. Format documents into a context block
        context = self.context_builder.aggregate(docs)

        # 2. Re-map the latest message to inject context
        if messages:
            last_msg = messages[-1]["content"]
            # Prepend context to the user's latest query
            augmented_query = (
                f"Context Information:\n{context}\n\nUser Query:\n{last_msg}"
            )
            messages[-1]["content"] = augmented_query

        try:
            stream = ollama.chat(
                model=self.model,
                messages=messages,
                stream=True,
                options={"temperature": 0.2},
            )

            for chunk in stream:
                if "message" in chunk and "content" in chunk["message"]:
                    text_chunk = chunk["message"]["content"]
                    if text_chunk:
                        yield {"chunk": text_chunk}

            if include_sources:
                sources = format_sources(docs)
                yield {"sources": sources}

        except Exception as exc:
            print(f"[Generator] Ollama generation error: {exc}")
            yield {
                "chunk": f"\n\nAn error occurred while generating the response: {exc}"
            }
            yield {"sources": []}


# ──────────────────────────────────────────────────────────────
# Smoke Test
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from scripts.utils.prompts import Prompts
    from retriever import Retriever

    query = "What is ICT?"
    mode = "simple"
    print(f"\n{'='*60}\nMode: {mode.upper()}\n{'='*60}")

    prompt_template = Prompts().get(
        query=query,
        class_level="SSC",
        subject="ICT",
        curriculum="NCTB",
        mode=mode,
    )

    docs = Retriever().retrieve(
        query=query,
        class_filter="SSC",
        subject_filter="ICT",
        response_quality="fast",
    )

    response = Generator().generate_stream(
        messages=[{"role": "user", "content": prompt_template}], docs=docs
    )

    for chunk in response:
        if "chunk" in chunk:
            print(chunk["chunk"], sep="", end="")
        if "sources" in chunk:
            print("\nSources:\n- " + "\n- ".join(chunk["sources"]))
