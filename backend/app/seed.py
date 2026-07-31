"""Seed the DB on first run so the chat isn't empty.

TODO(owner: E — Demo Lead): expand into the full scripted demo conversation
and a demo-perfect brief (see MVP.md §5). Keep it idempotent.
"""

from .chat.models import insert_message
from .db import db_conn
from .workspace.store import DEFAULT_WORKSPACE_NAME

DEFAULT_BRIEF = (
    "Goal: ship new usage-based pricing before the September enterprise "
    "renewals (target Sept 15). Sales has two enterprise prospects expecting a "
    "firm go-live date. Marketing is preparing a launch narrative with an "
    "ARR-uplift claim. Pricing rolls out via canary/feature-flag, so "
    "availability is gradual. Billing DB is being sharded in the same window."
)

# Scripted "already in progress" conversation. Cross-functional voices, each
# message carrying a few highlight-worthy phrases (jargon, ambiguous terms,
# commitments) so the highlight-to-ask demo always has good material and the
# "same text, different role" moment lands (TASKS §10.2). All five roles appear.
SEED_MESSAGES = [
    ("Priya", "Product", "Kicking off the Q3 pricing revamp — goal is to ship usage-based pricing before the September enterprise renewals (target Sept 15)."),
    ("Ravi", "Engineering", "We're adding a feature flag rollout for the new pricing engine, gated behind a canary release so we can watch p99 latency before we ramp to full traffic."),
    ("Ravi", "Engineering", "Heads up: the billing DB is being sharded in the same window, and metering is moving to an event-sourced pipeline with idempotency keys on every usage event."),
    ("Sara", "Sales", "Two enterprise prospects are asking for a hard go-live date — can I commit to Sept 15 on the contract?"),
    ("Maya", "Marketing", "We want to lead the launch with 'pipeline velocity' and lock in the ARR uplift claim — the narrative targets a double-digit net revenue retention bump."),
    ("Nina", "Design", "I'm reworking the usage dashboard — I need final states for metered overages and the soft-cap warning before I can hand off the Figma."),
    ("Priya", "Product", "Let's hold the canary at 5% of traffic for the first week; if the error budget holds, we widen the blast radius from there."),
    ("Ravi", "Engineering", "The invoicing webhooks now have exponential backoff on retries plus a dead-letter queue, so a failed billing event won't silently drop."),
    ("Sara", "Sales", "Prospect legal is asking whether the pricing change is backward compatible with their existing committed-use contract."),
    ("Maya", "Marketing", "Can we quantify a 'cost per active seat' story? Demand-gen wants a single hero metric for the campaign."),
    ("Nina", "Design", "Do overage alerts fire in-app, over email, or both? The information architecture for the dashboard depends on that call."),
    ("Ravi", "Engineering", "We'll put the new metering behind a kill switch — if the sharded DB shows replication lag, we fail back to the legacy billing path."),
    ("Priya", "Product", "Reminder: nothing ships to GA until the canary clears its SLO checks and the on-call runbook is signed off."),
]


def seed_if_empty() -> None:
    with db_conn() as conn:
        ws = conn.execute("SELECT id FROM workspace WHERE id = 1").fetchone()
        if ws is None:
            conn.execute(
                "INSERT INTO workspace (id, name, brief_text) VALUES (1, ?, ?)",
                (DEFAULT_WORKSPACE_NAME, DEFAULT_BRIEF),
            )
        count = conn.execute("SELECT COUNT(*) AS c FROM messages").fetchone()["c"]
        if count == 0:
            for name, role, text in SEED_MESSAGES:
                insert_message(conn, name, role, text)
