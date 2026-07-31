from ..db import db_conn

DEFAULT_WORKSPACE_NAME = "Refract Demo Team"


def get_brief() -> str:
    with db_conn() as conn:
        row = conn.execute(
            "SELECT brief_text FROM workspace WHERE id = 1"
        ).fetchone()
        return row["brief_text"] if row else ""


def set_brief(text: str) -> None:
    with db_conn() as conn:
        conn.execute(
            "INSERT INTO workspace (id, name, brief_text) VALUES (1, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET brief_text = excluded.brief_text",
            (DEFAULT_WORKSPACE_NAME, text),
        )
