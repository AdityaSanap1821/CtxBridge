from typing import Optional

from pydantic import BaseModel


class FollowUpTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ExplainRequest(BaseModel):
    highlighted_text: str
    surrounding_context: str = ""
    reader_role: str
    # Conversation after the first explanation (starts with the assistant's
    # first answer, then alternating user/assistant). Optional. See DESIGN §5.2.
    follow_up_history: Optional[list[FollowUpTurn]] = None


class ExplainResponse(BaseModel):
    plain_explanation: str
    impact_bullets: list[str]
    disclaimer: str = "AI-inferred — confirm with the relevant team."
