"""Pre-verified /explain responses used as a demo-day safety net.

If the Mistral API is unreachable mid-demo, routes.py falls back to this table
so the scripted highlight-to-role path in MVP.md §5 still renders something
grounded and role-appropriate. Only kicks in on real provider errors - a
successful Mistral response always wins.

Keys are matched by (normalised highlighted_text, reader_role). Normalisation:
lowercased + stripped. Owner: Sharayu - extend with new (text, role) pairs as
the seeded conversation and highlight→role matrix (TASKS §10.2) evolve.

Content was captured from a passing eval-baseline run to guarantee shape and
tone consistency with live output; refresh with `scripts/eval_explain.py`.
"""

# (highlighted_text_normalised, reader_role) -> {"plain_explanation": str, "impact_bullets": [str]}
KNOWN_GOOD: dict[tuple[str, str], dict] = {
    # Demo script step 2-3: Sales highlights "gated behind a canary release".
    ("canary release", "Sales"): {
        "plain_explanation": (
            "A canary release is like rolling out a new pricing model to a small slice of "
            "customers first - like testing a new commission structure with 5% of your pipeline "
            "before committing the whole team. It lets you catch issues before the full rollout "
            "hits your enterprise renewals."
        ),
        "impact_bullets": [
            "May affect the Sept 15 enterprise renewals if the canary uncovers pricing edge cases - worth confirming with the two prospects now.",
            "Could delay Marketing's ARR-uplift claim if the canary reveals billing DB sharding issues - worth syncing with Engineering on rollback plans.",
            "Might require Sales to adjust pipeline forecasts if the canary's early data suggests lower-than-expected adoption - worth prepping a fallback narrative.",
        ],
    },
    # Demo script step 4 (SC3 "same text, different role"): Design view of the same phrase.
    ("canary release", "Design"): {
        "plain_explanation": (
            "A canary release is like rolling out a new pricing page to 5% of enterprise users "
            "first, watching for errors or churn signals, then widening the rollout only if the "
            "metrics hold. It's a controlled experiment in production, not a big-bang launch."
        ),
        "impact_bullets": [
            "May affect the timing of Marketing's ARR-uplift narrative if the canary uncovers UX friction in the pricing flow before Sept 15.",
            "Worth confirming with Engineering whether the canary's error budget aligns with the billing DB sharding window to avoid compounding risks.",
            "Could delay Sales's enterprise prospect sign-off if the canary reveals edge cases in usage-based pricing that need design fixes before full rollout.",
        ],
    },
    # Demo script step 4 alt: Marketing view of the same phrase.
    ("canary release", "Marketing"): {
        "plain_explanation": (
            "A canary release is like rolling out a new pricing page to 5% of enterprise "
            "visitors first, watching for billing errors or churn signals before exposing it to "
            "everyone - just like A/B testing a hero section but for backend systems and revenue "
            "impact."
        ),
        "impact_bullets": [
            "May affect the ARR-uplift claim in the launch narrative if the canary uncovers billing inaccuracies before Sept 15 renewals.",
            "Worth confirming with Sales which prospect cohorts get the canary exposure first to align messaging and avoid confusion.",
            "Could delay Marketing's launch comms if the canary flags issues requiring last-minute pricing adjustments.",
        ],
    },
    # Demo script step 5 (two-way): Engineer highlights a Marketing/Sales term.
    ("pipeline velocity", "Engineering"): {
        "plain_explanation": (
            "In Sales, 'pipeline velocity' is the speed at which qualified deals move through the "
            "funnel - measured in dollars per week or deals per sprint - like a kanban board "
            "where WIP limits throttle throughput."
        ),
        "impact_bullets": [
            "May affect shard sizing if deals spike mid-canary; worth confirming billing DB throughput under high write load.",
            "Could force a rollback window if pricing logic slows deal progression, impacting Sept 15 renewals.",
            "ARR uplift claim hinges on velocity; if metrics lag, may need to adjust Marketing's narrative before launch.",
        ],
    },
}


def lookup(highlighted_text: str, reader_role: str) -> dict | None:
    """Return the safety-net response for this (text, role), or None."""
    key = (highlighted_text.strip().lower(), reader_role)
    # Try the exact selection first, then try suffix matches so a longer user
    # selection like "gated behind a canary release" still resolves to the
    # canonical "canary release" entry.
    if key in KNOWN_GOOD:
        return KNOWN_GOOD[key]
    for (phrase, role), payload in KNOWN_GOOD.items():
        if role == reader_role and phrase in key[0]:
            return payload
    return None
