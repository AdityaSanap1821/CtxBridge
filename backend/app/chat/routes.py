from fastapi import APIRouter

from ..db import db_conn
from .models import get_messages

router = APIRouter(tags=["chat"])


@router.get("/messages")
def list_messages():
    """Recent chat history, oldest first."""
    with db_conn() as conn:
        return get_messages(conn)
