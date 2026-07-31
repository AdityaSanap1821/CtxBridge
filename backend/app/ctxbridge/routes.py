from fastapi import APIRouter

from .schema import ExplainRequest, ExplainResponse

router = APIRouter(tags=["ctxbridge"])


# STUB: returns canned, correctly-shaped data so the frontend widget (owner D)
# can be built and demoed immediately — no LLM key required yet.
#
# TODO(owner: B — The Brain): replace the body with the real flow (DESIGN §5.2, §7):
#   brief = get_brief()
#   messages = build_messages(brief, req)
#   raw = get_provider().complete(messages, json_mode=True)   # 503 if provider is None
#   parsed = parse_llm_json(raw)   # strict JSON parse + text fallback
#   return ExplainResponse(**parsed)
@router.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest):
    return ExplainResponse(
        plain_explanation=(
            f"[stub] Plain-language explanation of \"{req.highlighted_text}\" "
            f"tailored for a {req.reader_role} reader."
        ),
        impact_bullets=[
            "[stub] First role-specific impact bullet (AI-inferred).",
            "[stub] Second role-specific impact bullet (AI-inferred).",
        ],
    )
