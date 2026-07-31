"""Prompt construction for the /explain endpoint (THE BRAIN).

TODO(owner: B — The Brain): implement the real prompt. See DESIGN.md §7.
Requirements:
  - Two-way, role-aware reframing (not generic ELI5) using the reader's role.
  - Ground impact bullets in the team brief; label them as inferred.
  - Strict JSON output: {"plain_explanation": "...", "impact_bullets": [...]}.
  - Support follow-up turns coherently.
"""

from .schema import ExplainRequest

SYSTEM_PROMPT = "TODO(B): CtxBridge system prompt — see DESIGN.md §7."


def build_messages(brief_text: str, req: ExplainRequest) -> list[dict]:
    # TODO(B): assemble system + delimited inputs (brief, role, context,
    # highlighted text) + optional follow-up history into chat messages.
    raise NotImplementedError("build_messages not implemented yet")
