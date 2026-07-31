from fastapi import APIRouter
from pydantic import BaseModel

from .store import get_brief, set_brief

router = APIRouter(tags=["workspace"])


class Brief(BaseModel):
    brief_text: str


@router.get("/brief")
def read_brief():
    return {"brief_text": get_brief()}


@router.put("/brief")
def update_brief(brief: Brief):
    set_brief(brief.brief_text)
    return {"ok": True}
