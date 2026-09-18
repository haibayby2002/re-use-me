from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.schemas import DraftBulletRequest, DraftBulletResponse
from app.services.llm_service import draft_bullet

router = APIRouter(prefix="/api", tags=["draft"])


@router.post("/draft-bullet", response_model=DraftBulletResponse)
async def draft_bullet_endpoint(
    payload: DraftBulletRequest, settings: Settings = Depends(get_settings)
) -> DraftBulletResponse:
    bullet, used_llm = draft_bullet(payload.term, payload.jdContext, payload.userDetail, settings)
    return DraftBulletResponse(bullet=bullet, usedLLM=used_llm)
