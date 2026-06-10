import os
import sys
from google import genai
from pathlib import Path
from langchain_core.documents import Document
from typing import List, Generator as TypeGenerator

project_root = str(Path(__file__).parent.parent.parent.resolve())
if project_root not in sys.path:
    sys.path.insert(0, project_root)

DEFAULT_MODEL = "gemma-4-31b-it"


def format_sources(docs: List[Document]) -> List[str]:
    if not docs:
        return []
    sources = []
    for doc in docs:
        metadata = doc.metadata or {}
        class_level = metadata.get("class", "N/A")
        subject = metadata.get("subject", "N/A")
        chapter_no = metadata.get("chapter_no", "N/A")
        page_no = metadata.get("page_no", "N/A")
        sources.append(
            f"{class_level} {subject} — Chapter {chapter_no}, Page: {page_no}"
        )
    return list(dict.fromkeys(sources))


class Generator:

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        self.client = genai.Client(api_key=api_key)
        print(f"[Generator] Ready — model: {self.model}")

    def generate_stream(
        self,
        messages: list,
        docs: List[Document],
        include_sources: bool = True,
        file_path: str | None = None,
    ) -> TypeGenerator[dict, None, None]:

        if not docs and not file_path:
            yield {
                "chunk": "I could not find relevant information to answer your question.\n\n"
            }
            yield {"sources": []}
            return

        uploaded_file = None

        try:
            # Upload file to Gemini File API if provided
            if file_path and os.path.isfile(file_path):
                try:
                    yield {"status": "uploading file"}
                    uploaded_file = self.client.files.upload(file=file_path)
                    print(f"[Generator] File uploaded: {file_path}")
                except Exception as upload_exc:
                    print(f"[Generator] File upload failed: {upload_exc}")
                    yield {"chunk": f"\n\n[File upload failed: {upload_exc}]"}

            # Map to Gemini format — only "user" and "model" roles
            contents = []
            for i, msg in enumerate(messages):
                role = msg.get("role", "user")
                content = msg.get("content", "")
                gemini_role = "model" if role == "assistant" else "user"

                parts = [genai.types.Part(text=content)]

                # Attach the uploaded file to the last user message
                if (
                    uploaded_file
                    and gemini_role == "user"
                    and i == len(messages) - 1
                ):
                    parts.insert(0, uploaded_file)

                contents.append(
                    genai.types.Content(
                        role=gemini_role,
                        parts=parts,
                    )
                )

            response = self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=genai.types.GenerateContentConfig(temperature=0.2),
            )

            yield {"status": "generating answer"}

            for chunk in response:
                if chunk.text:
                    yield {"chunk": chunk.text}

            if include_sources:
                yield {"sources": format_sources(docs)}

        except Exception as exc:
            print(f"[Generator] Gemini error: {exc}")
            yield {"chunk": f"\n\nError during generation: {exc}"}
            yield {"sources": []}


# ── Smoke test ────────────────────────────────────────────────

if __name__ == "__main__":
    from scripts.pipeline.retriever import Retriever
    from scripts.utils.prompts import Prompts
    from scripts.utils.context_builder import ContextBuilder

    query = "What is photosynthesis?"
    retriever = Retriever()
    ctx_builder = ContextBuilder()
    prompts = Prompts()

    docs = retriever.retrieve(query, class_filter="SSC", subject_filter="Biology")

    prompt = prompts.get(
        query=query,
        class_level="SSC",
        subject="Biology",
        curriculum="NCTB",
        mode="simple",
    )
    context_text = ctx_builder.aggregate(docs) if docs else "No relevant context found."
    full_prompt = prompt.replace("{context}", context_text)

    for chunk in Generator().generate_stream(
        messages=[{"role": "user", "content": full_prompt}],
        docs=docs,
    ):
        if "chunk" in chunk:
            print(chunk["chunk"], end="", flush=True)
        elif "sources" in chunk:
            print("\nSources:\n- " + "\n- ".join(chunk["sources"]))
