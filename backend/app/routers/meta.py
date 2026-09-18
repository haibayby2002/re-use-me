from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.schemas import ConfigResponse

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config", response_model=ConfigResponse)
async def config(settings: Settings = Depends(get_settings)) -> ConfigResponse:
    return ConfigResponse(
        llmEnabled=settings.llm_enabled,
        mode="hosted-llm" if settings.llm_enabled else "rule-based-only",
    )
