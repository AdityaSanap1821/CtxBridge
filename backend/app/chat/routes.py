from fastapi import APIRouter, Query

from ..db import db_conn
from .models import get_messages

router = APIRouter(tags=["chat"])


@router.get("/messages")
def list_messages(
    since_id: int | None = Query(None, ge=0, description="Return only messages with id > since_id (for reconnect)"),
    limit: int = Query(200, ge=1, le=500),
):
    """Recent chat history, oldest first. Pass since_id after a reconnect to
    fetch only messages newer than the last one the client has."""
    with db_conn() as conn:
        return get_messages(conn, limit=limit, since_id=since_id)
