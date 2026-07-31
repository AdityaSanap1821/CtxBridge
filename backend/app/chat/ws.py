import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import ROLES
from ..db import db_conn
from .models import insert_message

router = APIRouter()


class ConnectionManager:
    """Tracks connected clients and broadcasts to all of them."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# Minimal working broadcast so the frontend can connect during M0/M1.
# TODO(owner: A — Realtime Chat Backend): harden per DESIGN §6.1
#   - reconnect handling, input validation, presence, rate limiting.
@router.websocket("/ws")
async def chat_ws(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if payload.get("type") != "message":
                continue

            author_name = (payload.get("author_name") or "Anonymous").strip() or "Anonymous"
            author_role = payload.get("author_role") or "Product"
            if author_role not in ROLES:
                author_role = "Product"
            text = (payload.get("text") or "").strip()
            if not text:
                continue

            with db_conn() as conn:
                msg = insert_message(conn, author_name, author_role, text)
            await manager.broadcast({"type": "message", "message": msg})
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)
