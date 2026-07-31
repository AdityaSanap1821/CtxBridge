import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from ..llm.factory import get_provider
from ..workspace.store import get_brief
from .prompt import build_messages
from .schema import ExplainRequest, ExplainResponse

log = logging.getLogger(__name__)
router = APIRouter(tags=["ctxbridge"])

# Process-lifetime cache. Small enough for a demo; no expiry needed since the
# process only lives ~1hr. Skipped when follow_up_history is present (those
# are always fresh Q&A turns).
_cache: dict[int, ExplainResponse] = {}


def _cache_key(brief_text: str, req: ExplainRequest) -> int:
    return hash((brief_text, req.reader_role, req.highlighted_text))


def _fallback(raw_text: str) -> ExplainResponse:
    """DESIGN §9: if the LLM returns non-JSON (or a wrong shape), drop the raw
    text into plain_explanation and leave impact_bullets empty. The UI never
    breaks."""
    return ExplainResponse(plain_explanation=raw_text, impact_bullets=[])


@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest) -> ExplainResponse:
    provider = get_provider()
    if provider is None:
        # DESIGN §9: missing API key → clear 503, not a crash.
        raise HTTPException(
            status_code=503,
            detail="LLM provider not configured (missing API key).",
        )

    brief_text = get_brief()
    is_follow_up = bool(req.follow_up_history)

    if not is_follow_up:
        cached = _cache.get(_cache_key(brief_text, req))
        if cached is not None:
            return cached

    messages = build_messages(brief_text, req)

    try:
        raw = provider.complete(messages, json_mode=True)
    except Exception:
        log.exception("LLM provider call failed")
        raise HTTPException(status_code=503, detail="LLM provider call failed.")

    try:
        parsed = json.loads(raw)
        result = ExplainResponse(**parsed)
    except (json.JSONDecodeError, ValidationError, TypeError) as e:
        log.warning("LLM response failed strict parse (%s); using fallback", type(e).__name__)
        result = _fallback(raw)

    if not is_follow_up and result.impact_bullets:
        # Only cache well-formed responses so a transient bad turn doesn't stick.
        _cache[_cache_key(brief_text, req)] = result

    return result
