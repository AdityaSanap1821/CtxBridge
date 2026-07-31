from datetime import datetime, timezone


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_message(row) -> dict:
    return {
        "id": row["id"],
        "author_name": row["author_name"],
        "author_role": row["author_role"],
        "text": row["text"],
        "created_at": row["created_at"],
    }


def insert_message(conn, author_name: str, author_role: str, text: str) -> dict:
    created_at = _now_iso()
    cur = conn.execute(
        "INSERT INTO messages (author_name, author_role, text, created_at) "
        "VALUES (?, ?, ?, ?)",
        (author_name, author_role, text, created_at),
    )
    return {
        "id": cur.lastrowid,
        "author_name": author_name,
        "author_role": author_role,
        "text": text,
        "created_at": created_at,
    }


def get_messages(conn, limit: int = 200) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM messages ORDER BY id ASC LIMIT ?", (limit,)
    ).fetchall()
    return [row_to_message(r) for r in rows]
