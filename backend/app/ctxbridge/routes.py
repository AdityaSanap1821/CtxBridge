import json
import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from ..config import LLM_GATE_MODEL
from ..llm.factory import get_provider
from ..workspace.store import get_brief
from .known_good import lookup as lookup_known_good
from .prompt import build_messages
from .schema import ExplainRequest, ExplainResponse, Source

log = logging.getLogger(__name__)
router = APIRouter(tags=["ctxbridge"])

# Process-lifetime cache. Small enough for a demo; no expiry needed since the
# process only lives ~1hr. Skipped when follow_up_history is present (those
# are always fresh Q&A turns).
_cache: dict[int, ExplainResponse] = {}

# Per-IP sliding-window rate limit for /explain - mirrors the pattern in
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


GATE_SYSTEM_PROMPT = (
    "You are a fast pre-filter for a cross-functional-team explanation tool. "
    "Given a phrase a user just highlighted from a chat message, decide whether "
    "it deserves a full role-aware explanation, or whether it is too trivial "
    "to bother with.\n\n"
    "Reply with STRICT JSON only: {\"substantive\": true|false}. No prose.\n\n"
    "Answer FALSE for: single common words (ok, yes, no, the, and, thanks), "
    "greetings, plain numbers, dates on their own, bare URLs, emojis, generic "
    "filler ('let's ship', 'sounds good').\n\n"
    "Answer TRUE for: domain-specific jargon, acronyms, technical or business "
    "terms, ambiguous phrases, anything a reader in a different discipline "
    "might not fully understand. When in doubt, answer TRUE."
)

TRIVIAL_RESPONSE = ExplainResponse(
    plain_explanation=(
        "This looks like everyday chat text - no cross-discipline unpacking needed. "
        "Try highlighting a jargon word, acronym, or team-specific commitment."
    ),
    impact_bullets=[],
    sources=[],
)


def _gate_substantive(provider, highlighted_text: str, reader_role: str) -> bool:
    """Cheap pre-filter using a smaller model. Returns True (proceed to full
    explain) on any error so ambiguity never blocks a legitimate highlight."""
    messages = [
        {"role": "system", "content": GATE_SYSTEM_PROMPT},
        {"role": "user", "content": f"reader_role: {reader_role}\nhighlighted: {highlighted_text!r}"},
    ]
    try:
        raw = provider.complete(messages, json_mode=True, model=LLM_GATE_MODEL)
        parsed = json.loads(raw)
        return bool(parsed.get("substantive", True))
    except Exception:
        log.info("Gate model failed; defaulting to substantive=True")
        return True


def _verify_sources(
    sources: list[Source],
    brief_text: str,
    context_text: str,
    bullet_count: int,
) -> list[Source]:
    """Keep only citations whose quote appears verbatim (case-insensitive) in
    the claimed source, and whose bullet_index points at a real bullet.
    Fabricated or misattributed quotes are dropped silently - the bullet
    itself stays, it just loses its citation."""
    brief_lc = brief_text.lower()
    context_lc = context_text.lower()
    verified: list[Source] = []
    for s in sources:
        if not (0 <= s.bullet_index < bullet_count):
            continue
        quote_lc = s.quote.strip().lower()
        if not quote_lc:
            continue
        haystack = brief_lc if s.type == "brief" else context_lc
        if quote_lc in haystack:
            verified.append(s)
        else:
            log.info("Dropping unverified source: %s / %r not in %s", s.type, s.quote, s.type)
    return verified


@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest, request: Request) -> ExplainResponse:
    client_ip = request.client.host if request.client else "unknown"
    if _rate_limited(client_ip):
        raise HTTPException(
            status_code=429,
            detail=f"Too many /explain requests - max {RATE_LIMIT_MAX} per {int(RATE_LIMIT_WINDOW_S)}s.",
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

    # Model-chain gate: cheap ministral-3b call decides whether this highlight
    # is worth the full mistral-small explanation. Skipped for follow-ups (any
    # legitimate follow-up implies the initial highlight already cleared the
    # gate). Saves credits + latency on trivial selections.
    if not is_follow_up and not _gate_substantive(provider, req.highlighted_text, req.reader_role):
        log.info("Gate rejected highlight as trivial: %r", req.highlighted_text)
        _cache[_cache_key(brief_text, req)] = TRIVIAL_RESPONSE
        return TRIVIAL_RESPONSE

    messages = build_messages(brief_text, req)

    try:
        raw = provider.complete(messages, json_mode=True)
    except Exception:
        log.exception("LLM provider call failed")
        # Demo safety net (MVP D3): if this exact (text, role) has a pre-verified
        # response, serve that instead of 503 so the scripted highlight path
        # still lands. Skipped for follow-ups - those are always live Q&A.
        if not is_follow_up:
            safety = lookup_known_good(req.highlighted_text, req.reader_role)
            if safety is not None:
                log.warning("Serving known-good safety net for (%r, %s)", req.highlighted_text, req.reader_role)
                return ExplainResponse(**safety)
        raise HTTPException(status_code=503, detail="LLM provider call failed.")

    try:
        parsed = json.loads(raw)
        result = ExplainResponse(**parsed)
        # Verify citations against the actual brief/context before returning.
        # Fabricated quotes get silently dropped - bullets stay, citations
        # may go empty.
        result.sources = _verify_sources(
            result.sources,
            brief_text,
            req.surrounding_context,
            len(result.impact_bullets),
        )
    except (json.JSONDecodeError, ValidationError, TypeError) as e:
        log.warning("LLM response failed strict parse (%s); using fallback", type(e).__name__)
        result = _fallback(raw)

    if not is_follow_up and result.impact_bullets:
        # Only cache well-formed responses so a transient bad turn doesn't stick.
        _cache[_cache_key(brief_text, req)] = result

    return result
