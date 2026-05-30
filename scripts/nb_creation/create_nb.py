import json
import os
import warnings
from pathlib import Path
from typing import List, Dict, Any

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message=".*fast tokenizer.*")

# Define paths
workspace_root = Path(__file__).resolve().parent.parent.parent
raw_data_dir = workspace_root / "raw_data"
knowledge_base_dir = workspace_root / "knowledge_base"

# Embedding model
EMBEDDING_MODEL = "BAAI/bge-m3"


def _format_chunk(item: Dict[str, Any]) -> str:
    # Extract metadata fields
    class_name = item.get("class", "")
    subject = item.get("subject", "")
    chapter_no = item.get("chapter_no", "")
    chapter_title = item.get("chapter_title", "")
    page_no = item.get("page_no", "")
    topics = item.get("topic", [])
    content = item.get("content", "")

    formatted_parts = []
    formatted_parts.append(f"Class: {class_name} - Subject: {subject}")
    formatted_parts.append(f"Chapter {chapter_no}: {chapter_title}")
    formatted_parts.append(f"Page: {page_no}")
    topics_str = ", ".join(topics)
    formatted_parts.append(f"Topics: {topics_str}")
    formatted_parts.append(f"Content:\n{content}")

    # Join all parts with newlines
    formatted_text = "\n".join(formatted_parts)

    return formatted_text


def get_jsonl_files() -> List[Path]:
    if not raw_data_dir.exists():
        raise FileNotFoundError(f"raw_data directory not found at {raw_data_dir}")

    jsonl_files = list(raw_data_dir.glob("*.jsonl"))
    if not jsonl_files:
        raise FileNotFoundError(f"No JSONL files found in {raw_data_dir}")

    print(f"[Found {len(jsonl_files)} JSONL files]")
    return jsonl_files


def read_jsonl_file(file_path: Path) -> List[dict]:
    documents = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                if line.strip():
                    try:
                        doc = json.loads(line)
                        documents.append(doc)
                    except json.JSONDecodeError as e:
                        print(
                            f"✗ Error parsing line {line_num} in {file_path.name}: {e}"
                        )
                        continue

        print(f"  ✓ Loaded {len(documents)} documents from {file_path.name}")
        return documents

    except Exception as e:
        print(f"✗ Error reading {file_path.name}: {e}")
        return []


def create_documents_from_jsonl(
    jsonl_data: List[dict], source_file: str
) -> List[Document]:
    documents = []

    for item in jsonl_data:
        if "content" not in item:
            print(
                f"⚠ Skipping item without 'content' field: {item.get('chunk_id', 'unknown')}"
            )
            continue

        # Format the educational content
        formatted_content = _format_chunk(item)

        # Create metadata from relevant fields
        metadata = {
            "chunk_id": item.get("chunk_id"),
            "class": item.get("class"),
            "subject": item.get("subject"),
            "chapter_no": item.get("chapter_no"),
            "chapter_title": item.get("chapter_title"),
            "page_no": item.get("page_no"),
            "source_file": source_file,
            "topic": item.get("topic"),
        }
        doc = Document(page_content=formatted_content, metadata=metadata)
        documents.append(doc)

    return documents


def build_vector_store(all_documents: List[Document]) -> FAISS:

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        encode_kwargs={"normalize_embeddings": True},
    )

    # Check if index already exists
    if knowledge_base_dir.exists() and (knowledge_base_dir / "index.faiss").exists():
        print(f"Loading existing index from {knowledge_base_dir}")
        vector_store = FAISS.load_local(
            str(knowledge_base_dir),
            embeddings,
            allow_dangerous_deserialization=True,
        )
        print(f"Adding {len(all_documents)} new documents to existing index...")
        vector_store.add_documents(all_documents)
    else:
        print(f"Creating new FAISS index with {len(all_documents)} documents...")
        vector_store = FAISS.from_documents(all_documents, embeddings)

    return vector_store


def save_vector_store(vector_store: FAISS) -> None:
    knowledge_base_dir.mkdir(parents=True, exist_ok=True)
    vector_store.save_local(str(knowledge_base_dir))
    print(f"Index saved to {knowledge_base_dir}")


def create_knowledge_database(rebuild: bool = False) -> None:
    try:
        jsonl_files = get_jsonl_files()

        # If rebuild is True, remove existing index
        if rebuild and knowledge_base_dir.exists():
            import shutil

            shutil.rmtree(knowledge_base_dir)
            print(f"Removed existing knowledge base for rebuild")

        # Read all JSONL files and create documents
        print("\n─── Reading JSONL Files ───")
        all_documents = []

        for jsonl_file in jsonl_files:
            print(f"Processing {jsonl_file.name}...")
            jsonl_data = read_jsonl_file(jsonl_file)
            documents = create_documents_from_jsonl(jsonl_data, jsonl_file.name)
            all_documents.extend(documents)

        print(f"\nTotal documents loaded: {len(all_documents)}")

        print("\n─── Building Vector Store ───")

        if not all_documents:
            print("No documents to process. Exiting.")
            return

        # Build vector store
        vector_store = build_vector_store(all_documents)

        # Save vector store
        save_vector_store(vector_store)

        print("\nKnowledge database creation successfully!")
        print(f"- Documents: {len(all_documents)}")
        print(f"- Location: {knowledge_base_dir}")

    except Exception as e:
        print(f"\n✗ Error creating knowledge database: {e}")
        raise


if __name__ == "__main__":
    create_knowledge_database(rebuild=False)
