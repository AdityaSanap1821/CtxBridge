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

SEED_MESSAGES = [
    ("Priya", "Product", "Kicking off the Q3 pricing revamp — goal is to ship usage-based pricing before the September enterprise renewals."),
    ("Ravi", "Engineering", "We're adding a feature flag rollout for the new pricing engine, gated behind a canary release."),
    ("Maya", "Marketing", "We want to lead the launch with 'pipeline velocity' and lock in the ARR uplift claim."),
    ("Sara", "Sales", "Two enterprise prospects are asking for a hard go-live date — can I commit to Sept 15?"),
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
