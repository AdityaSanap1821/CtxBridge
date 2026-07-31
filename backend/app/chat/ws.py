import json
import time
from collections import deque

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import ROLES
from ..db import db_conn
from .models import insert_message

router = APIRouter()

MAX_TEXT_LEN = 2000
MAX_NAME_LEN = 50
MAX_FRAME_BYTES = 8 * 1024

RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW_S = 10.0


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


async def _send_error(ws: WebSocket, code: str, detail: str) -> None:
    try:
        await ws.send_json({"type": "error", "code": code, "detail": detail})
    except Exception:
        pass


@router.websocket("/ws")
async def chat_ws(ws: WebSocket):
    await manager.connect(ws)
    # Sliding-window rate limiter: timestamps of accepted sends in the last window.
    recent_sends: deque[float] = deque()
    try:
        while True:
            raw = await ws.receive_text()

            if len(raw) > MAX_FRAME_BYTES:
                await _send_error(ws, "frame_too_large", "Message frame exceeds size limit.")
                continue

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await _send_error(ws, "bad_json", "Payload is not valid JSON.")
                continue

            if not isinstance(payload, dict):
                await _send_error(ws, "bad_payload", "Payload must be a JSON object.")
                continue

            if payload.get("type") != "message":
                await _send_error(ws, "bad_type", "Only type='message' is supported.")
                continue

            raw_name = payload.get("author_name")
            raw_role = payload.get("author_role")
            raw_text = payload.get("text")

            if raw_text is not None and not isinstance(raw_text, str):
                await _send_error(ws, "bad_text", "'text' must be a string.")
                continue
            if raw_name is not None and not isinstance(raw_name, str):
                await _send_error(ws, "bad_name", "'author_name' must be a string.")
                continue
            if raw_role is not None and not isinstance(raw_role, str):
                await _send_error(ws, "bad_role", "'author_role' must be a string.")
                continue

            author_name = (raw_name or "Anonymous").strip() or "Anonymous"
            if len(author_name) > MAX_NAME_LEN:
                author_name = author_name[:MAX_NAME_LEN]

            author_role = raw_role or "Product"
            if author_role not in ROLES:
                author_role = "Product"

            text = (raw_text or "").strip()
            if not text:
                continue
            if len(text) > MAX_TEXT_LEN:
                await _send_error(
                    ws,
                    "text_too_long",
                    f"Message exceeds {MAX_TEXT_LEN} characters.",
                )
                continue

            now = time.monotonic()
            cutoff = now - RATE_LIMIT_WINDOW_S
            while recent_sends and recent_sends[0] < cutoff:
                recent_sends.popleft()
            if len(recent_sends) >= RATE_LIMIT_MAX:
                await _send_error(
                    ws,
                    "rate_limited",
                    f"Max {RATE_LIMIT_MAX} messages per {int(RATE_LIMIT_WINDOW_S)}s.",
                )
                continue
            recent_sends.append(now)

            with db_conn() as conn:
                msg = insert_message(conn, author_name, author_role, text)
            await manager.broadcast({"type": "message", "message": msg})
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)
