import logging

try:
    from scripts.utils.prompts import Prompts
    from scripts.pipeline.generator import Generator
    from scripts.pipeline.retriever import Retriever
    from scripts.utils.context_builder import ContextBuilder
except ImportError:
    from utils.prompts import Prompts
    from generator import Generator
    from retriever import Retriever
    from utils.context_builder import ContextBuilder

logger = logging.getLogger(__name__)

MAX_DEPTH = 5  # keep last 5 user+assistant pairs

retriever = Retriever()
generator = Generator()
prompts = Prompts()
ctx_builder = ContextBuilder()


def run_pipeline_stream(user_json: dict):
    query = user_json.get("query", "")
    class_level = user_json.get("class_level", "")
    subject = user_json.get("subject", "")
    mode = user_json.get("mode") or "normal"
    curriculum = user_json.get("curriculum", "")
    messages = user_json.get("messages", [])
    file_path = user_json.get("file_path", None)
    logger.info(f"Running pipeline stream for query: {query}")

    yield {"status": "thinking"}

    # 1. Retrieve docs
    try:
        yield {"status": "retrieving"}
        docs = retriever.retrieve(
            query,
            class_filter=class_level,
            subject_filter=subject,
        )
    except Exception as e:
        logger.error(f"Error retrieving docs: {e}")
        docs = []

    # 2. Build full prompt with context injected
    has_file = file_path is not None and file_path != ""
    prompt_template = prompts.get(
        query=query,
        class_level=class_level,
        subject=subject,
        curriculum=curriculum,
        mode=mode,
        has_file=has_file,
    )
    context_text = ctx_builder.aggregate(docs) if docs else "No relevant context found."
    full_prompt = prompt_template.replace("{context}", context_text)

    # 3. Append current turn
    messages.append({"role": "user", "content": full_prompt})

    # 4. Trim to MAX_DEPTH pairs
    max_messages = MAX_DEPTH * 2
    if len(messages) > max_messages:
        messages = messages[len(messages) - max_messages :]

    yield {"status": "synthesizing"}

    # 5. Stream (pass file_path to generator)
    for payload in generator.generate_stream(
        messages=messages,
        docs=docs,
        file_path=file_path,
    ):
        yield payload


# ── Smoke test ────────────────────────────────────────────────

if __name__ == "__main__":
    messages = []

    while True:
        query = input("You: ").strip()
        if query.lower() in ("exit", "quit"):
            break

        user_json = {
            "query": query,
            "class_level": "SSC",
            "subject": "ICT",
            "curriculum": "NCTB",
            "mode": "normal",
            "messages": messages,
        }

        assistant_reply = ""
        for payload in run_pipeline_stream(user_json):
            if "chunk" in payload:
                print(payload["chunk"], end="", flush=True)
                assistant_reply += payload["chunk"]
            elif "sources" in payload and payload["sources"]:
                print("\nSources:\n- " + "\n- ".join(payload["sources"]))

        print()
        messages.append({"role": "assistant", "content": assistant_reply})
