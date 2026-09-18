from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.gap_service import detect_gap_llm
from app.services.skill_matcher import analyze

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(
    payload: AnalyzeRequest, settings: Settings = Depends(get_settings)
) -> AnalyzeResponse:
    result = analyze(payload.resumeText, payload.jdText)

    if not payload.useLlmGapCheck:
        return result

    known_terms_lower = {m.term.lower() for m in result.matched} | {
        m.term.lower() for m in result.missing
    }
    llm_missing, llm_irrelevant, llm_matched, used_llm = detect_gap_llm(
        payload.resumeText, payload.jdText, known_terms_lower, settings
    )

    return AnalyzeResponse(
        matched=[*result.matched, *llm_matched],
        missing=[*result.missing, *llm_missing],
        irrelevant=[*result.irrelevant, *llm_irrelevant],
        score=result.score,
        usedLlmGapCheck=used_llm,
    )
