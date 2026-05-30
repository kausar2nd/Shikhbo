from typing import List
from langchain_core.documents import Document


class ContextBuilder:
    @staticmethod
    def _format_document(doc: Document, index: int) -> str:
        metadata = doc.metadata or {}

        class_level = metadata.get("class", "N/A")
        subject = metadata.get("subject", "N/A")
        chapter_no = metadata.get("chapter_no", "N/A")
        chapter_title = metadata.get("chapter_title", "N/A")
        topic = metadata.get("topic", "N/A")
        page_no = metadata.get("page_no", "N/A")

        return (
            f"[Document {index}]\n"
            f"Class: {class_level} | Subject: {subject}\n"
            f"Chapter {chapter_no}: {chapter_title}\n"
            f"Topic: {topic} | Page: {page_no}\n\n"
            f"Content:\n{doc.page_content.strip()}"
        )

    @staticmethod
    def aggregate(docs: List[Document]) -> str:
        if not docs:
            return "No context available."

        separator = "\n\n" + "─" * 60 + "\n\n"
        parts = [
            ContextBuilder._format_document(doc, i + 1) for i, doc in enumerate(docs)
        ]
        return separator.join(parts)
