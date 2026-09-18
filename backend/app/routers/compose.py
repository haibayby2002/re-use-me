from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.schemas import ComposeRequest, ComposeResponse
from app.services.resume_composer import compose_resume

router = APIRouter(prefix="/api", tags=["compose"])


@router.post("/compose", response_model=ComposeResponse)
async def compose_endpoint(
    payload: ComposeRequest, settings: Settings = Depends(get_settings)
) -> ComposeResponse:
    markdown, used_llm = compose_resume(payload.sections, payload.jdText, settings)
    return ComposeResponse(markdown=markdown, usedLLM=used_llm)
