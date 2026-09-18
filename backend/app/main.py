from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import analyze, compose, draft, extract, meta

settings = get_settings()

app = FastAPI(
    title="re-use-me API",
    description="Stateless resume ↔ job description matching API. No database, no persistence.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(extract.router)
app.include_router(analyze.router)
app.include_router(draft.router)
app.include_router(compose.router)
