import json
import logging

try:
    from scripts.utils.prompts import Prompts
    from scripts.pipeline.generator import Generator
    from scripts.pipeline.retriever import Retriever
except ImportError as e:
    from utils.prompts import Prompts
    from pipeline.generator import Generator
    from pipeline.retriever import Retriever

logger = logging.getLogger(__name__)

logger.info("Initializing AI Pipeline components...")
try:
    retriever = Retriever()
    generator = Generator()
    prompts = Prompts()
    logger.info("Pipeline components initialized.")
except Exception as e:
    logger.error(f"Failed to initialize pipeline components: {e}")


def run_pipeline_stream(user_json: dict):
    query = user_json.get("query", "")
    class_level = user_json.get("class_level", "")
    subject = user_json.get("subject", "")
    mode = user_json.get("mode") or "normal"
    response_quality = user_json.get("response_quality", "fast")
    messages = user_json.get("messages", [])

    logger.info(f"Running pipeline stream for query: {query}")

    try:
        docs = retriever.retrieve(
            query,
            class_filter=class_level,
            subject_filter=subject,
            response_quality=response_quality,
        )

        # Inject system prompt into messages if none exist
        if not any(m.get("role") == "system" for m in messages):
            system_prompt = prompts.get(
                query=query,
                class_level=class_level,
                subject=subject,
                curriculum=user_json.get("curriculum", ""),
                mode=mode,
            )
            system_instruction = system_prompt.replace("{context}", "").strip()
            messages.insert(0, {"role": "system", "content": system_instruction})

        # Generate stream
        for payload in generator.generate_stream(messages=messages, docs=docs):
            yield payload

    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        yield {"chunk": f"\nAn error occurred in the pipeline: {e}"}
        yield {"sources": []}


if __name__ == "__main__":
    from scripts.utils.user_data import UserData
    from scripts.utils.input_handler import InputHandler
    from scripts.utils.output_handler import OutputHandler

    # 1 - Get user data
    user_str = UserData().get_user("key_placeholder")
    user_data = json.loads(user_str)

    # 2 - Get user input (text, audio, or image)
    query = InputHandler().get_input()
    user_data["query"] = query

    # 3 - Run pipeline
    response_dict = run_pipeline_stream(user_data)

    # 4 - Output the response to the user
    OutputHandler().deliver(response_dict.get("answer", str(response_dict)))
