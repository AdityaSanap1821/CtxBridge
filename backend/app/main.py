from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS, ROLES
from .db import init_db
from .seed import seed_if_empty
from .chat.routes import router as chat_router
from .chat.ws import router as ws_router
from .ctxbridge.routes import router as ctxbridge_router
from .workspace.routes import router as workspace_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    yield


app = FastAPI(title="CtxBridge", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ctxbridge", "roles": ROLES}


app.include_router(chat_router)
app.include_router(ws_router)
app.include_router(ctxbridge_router)
app.include_router(workspace_router)
