import json
import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from ..llm.factory import get_provider
from ..workspace.store import get_brief
from .known_good import lookup as lookup_known_good
from .prompt import build_messages
from .schema import ExplainRequest, ExplainResponse

log = logging.getLogger(__name__)
router = APIRouter(tags=["ctxbridge"])

# Process-lifetime cache. Small enough for a demo; no expiry needed since the
# process only lives ~1hr. Skipped when follow_up_history is present (those
# are always fresh Q&A turns).
_cache: dict[int, ExplainResponse] = {}

# Per-IP sliding-window rate limit for /explain — mirrors the pattern in
# chat/ws.py. Protects Mistral credits from judge-spam; generous enough for
# real interactive use (roughly one call every 4s sustained).
RATE_LIMIT_MAX = 15
RATE_LIMIT_WINDOW_S = 60.0
_rate_hits: dict[str, deque[float]] = defaultdict(deque)


def _cache_key(brief_text: str, req: ExplainRequest) -> int:
    return hash((brief_text, req.reader_role, req.highlighted_text))


def _rate_limited(client_ip: str) -> bool:
    now = time.monotonic()
    cutoff = now - RATE_LIMIT_WINDOW_S
    hits = _rate_hits[client_ip]
    while hits and hits[0] < cutoff:
        hits.popleft()
    if len(hits) >= RATE_LIMIT_MAX:
        return True
    hits.append(now)
    return False


def _fallback(raw_text: str) -> ExplainResponse:
    """DESIGN §9: if the LLM returns non-JSON (or a wrong shape), drop the raw
    text into plain_explanation and leave impact_bullets empty. The UI never
    breaks."""
    return ExplainResponse(plain_explanation=raw_text, impact_bullets=[])


@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest, request: Request) -> ExplainResponse:
    client_ip = request.client.host if request.client else "unknown"
    if _rate_limited(client_ip):
        raise HTTPException(
            status_code=429,
            detail=f"Too many /explain requests — max {RATE_LIMIT_MAX} per {int(RATE_LIMIT_WINDOW_S)}s.",
        )

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
        # Demo safety net (MVP D3): if this exact (text, role) has a pre-verified
        # response, serve that instead of 503 so the scripted highlight path
        # still lands. Skipped for follow-ups — those are always live Q&A.
        if not is_follow_up:
            safety = lookup_known_good(req.highlighted_text, req.reader_role)
            if safety is not None:
                log.warning("Serving known-good safety net for (%r, %s)", req.highlighted_text, req.reader_role)
                return ExplainResponse(**safety)
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
