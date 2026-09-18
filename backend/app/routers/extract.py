from fastapi import APIRouter, HTTPException, UploadFile

from app.schemas import ExtractPdfResponse
from app.services.text_extraction import extract_pdf_text

router = APIRouter(prefix="/api", tags=["extract"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/extract/pdf", response_model=ExtractPdfResponse)
async def extract_pdf(file: UploadFile) -> ExtractPdfResponse:
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB).")

    try:
        return extract_pdf_text(file.filename or "resume.pdf", data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc
