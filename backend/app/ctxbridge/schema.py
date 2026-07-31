from typing import Literal, Optional

from pydantic import BaseModel


class FollowUpTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class Source(BaseModel):
    """A citation showing where an impact bullet is grounded.

    The `quote` is a substring copied verbatim from either the team brief or
    the surrounding_context; the server verifies it appears there and drops
    the citation if it doesn't (prevents fabricated quotes). `bullet_index`
    binds the source to a specific impact_bullets entry (0-indexed).
    """

    bullet_index: int
    type: Literal["brief", "context"]
    quote: str


class ExplainRequest(BaseModel):
    highlighted_text: str
    surrounding_context: str = ""
    reader_role: str
    # Discipline of the person who wrote the containing message (Engineering,
    # Sales, etc). Optional; when present, the prompt tells the model so it
    # can calibrate the reframing direction. Free string so a stray/unknown
    # role doesn't break validation.
    author_role: Optional[str] = None
    # Conversation after the first explanation (starts with the assistant's
    # first answer, then alternating user/assistant). Optional. See DESIGN §5.2.
    follow_up_history: Optional[list[FollowUpTurn]] = None


class ExplainResponse(BaseModel):
    plain_explanation: str
    impact_bullets: list[str]
    # Verified citations grounding specific impact bullets in the brief or the
    # surrounding message. Empty when the model didn't cite or when all cites
    # failed verbatim-match verification.
    sources: list[Source] = []
    disclaimer: str = "AI-inferred - confirm with the relevant team."
