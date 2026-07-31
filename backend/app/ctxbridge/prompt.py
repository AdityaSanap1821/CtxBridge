"""Prompt construction for the /explain endpoint (THE BRAIN).

See DESIGN.md §7. The system prompt lives in prompts/system.md so it can be
iterated on without touching Python.
"""

from pathlib import Path

from .schema import ExplainRequest

_PROMPT_PATH = Path(__file__).parent / "prompts" / "system.md"
SYSTEM_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8")


def _first_user_turn(brief_text: str, req: ExplainRequest) -> str:
    brief = brief_text.strip() or "(no brief configured)"
    context = req.surrounding_context.strip() or "(no surrounding context)"
    return (
        f"<team_brief>\n{brief}\n</team_brief>\n\n"
        f"<reader_role>{req.reader_role}</reader_role>\n\n"
        f"<surrounding_context>\n{context}\n</surrounding_context>\n\n"
        f"<highlighted_text>\n{req.highlighted_text.strip()}\n</highlighted_text>"
    )


def build_messages(brief_text: str, req: ExplainRequest) -> list[dict]:
    """Assemble the chat messages for a single /explain call.

    First turn always carries the delimited inputs (brief, role, context,
    highlighted text). Follow-up turns are appended verbatim after that; by
    contract with the widget (DESIGN §5.2), each follow-up assistant turn
    carries only `plain_explanation` as content, not the full JSON.
    """
    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": _first_user_turn(brief_text, req)},
    ]
    if req.follow_up_history:
        for turn in req.follow_up_history:
            messages.append({"role": turn.role, "content": turn.content})
    return messages
