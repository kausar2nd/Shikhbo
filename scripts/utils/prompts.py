from enum import Enum
from dataclasses import dataclass

from scripts.utils.utils import get_language


class Mode(str, Enum):
    NORMAL = "normal"
    SIMPLE = "simple"
    QUIZ = "quiz"
    STEP_BY_STEP = "step_by_step"


@dataclass
class PromptConfig:
    query: str
    class_level: str
    subject: str
    curriculum: str
    mode: Mode
    language: str = "English"


class Prompts:

    _BASE = """\
You are an expert Bangladeshi tutor for {subject} at {class_level} level under the {curriculum} curriculum.

Respond in {language} unless the student asks otherwise.

The student's request:
<query>
{query}
</query>

Use the provided context as supporting knowledge.
Do not mention or quote the context directly.

<context>
{context}
</context>
"""

    _PROMPTS = {
        Mode.NORMAL: """\
{base}

Instructions:
- Answer according to the student's actual question.
- Be conversational and clear.
- Start simple, then go deeper if needed.
- Use examples and analogies when useful.
- Avoid unnecessary long explanations.
- If the question is unclear, ask one short clarifying question.
- Return the response in plain text format, not markdown. Do not use any markdown formatting, bold, italics, lists with symbols, or code blocks.
""",
        Mode.SIMPLE: """\
{base}

Instructions:
- Assume the student is completely new to the topic.
- Use very simple language.
- Keep sentences short.
- Explain difficult terms immediately.
- Use familiar real-life examples.
- Break explanations into small chunks.
- Focus only on helping the student understand the question.
- End with the most important takeaway.
- Return the response in plain text format, not markdown. Do not use any markdown formatting, bold, italics, lists with symbols, or code blocks.
""",
        Mode.QUIZ: """\
{base}

Instructions:
- Run an interactive quiz session.
- Ask only ONE question at a time.
- Wait for the student's answer before continuing.
- Adapt difficulty based on performance.
- After each answer:
  - Briefly explain why it is correct or incorrect.
  - Keep feedback concise and educational.
- If the student asks for explanation, temporarily switch into teaching mode.
- Return the response in plain text format, not markdown. Do not use any markdown formatting, bold, italics, lists with symbols, or code blocks.
""",
        Mode.STEP_BY_STEP: """\
{base}

Instructions:
- Break the explanation into numbered steps.
- Do not skip reasoning.
- Explain why each step matters.
- Show full working for calculations.
- Keep each step focused and easy to follow.
- End with a short key takeaway.
- Return the response in plain text format, not markdown. Do not use any markdown formatting, bold, italics, lists with symbols, or code blocks.
""",
    }

    def get(
        self,
        query: str,
        class_level: str,
        subject: str,
        curriculum: str,
        mode: "str | Mode",
    ) -> str:

        resolved_mode = self._resolve_mode(mode)

        cfg = PromptConfig(
            query=query,
            class_level=class_level,
            subject=subject,
            curriculum=curriculum,
            mode=resolved_mode,
            language=get_language(query),
        )

        return self._build(cfg)

    def _build(self, cfg: PromptConfig) -> str:

        base = self._BASE.format(
            subject=cfg.subject,
            class_level=cfg.class_level,
            curriculum=cfg.curriculum,
            language=cfg.language,
            query=cfg.query,
            context="{context}",
        )

        return self._PROMPTS[cfg.mode].format(base=base)

    @staticmethod
    def _resolve_mode(mode: "str | Mode") -> Mode:

        if isinstance(mode, Mode):
            return mode

        normalized = mode.strip().lower().replace(" ", "_").replace("-", "_")

        try:
            return Mode(normalized)

        except ValueError:
            valid = ", ".join(f'"{m.value}"' for m in Mode)

            raise ValueError(f"Unknown mode '{mode}'. Valid options: {valid}") from None
