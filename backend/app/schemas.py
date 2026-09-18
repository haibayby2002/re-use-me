from typing import Literal

from pydantic import BaseModel, Field


class ExtractPdfResponse(BaseModel):
    filename: str
    text: str
    pageCount: int


class AnalyzeRequest(BaseModel):
    resumeText: str = Field(min_length=1)
    jdText: str = Field(min_length=1)
    useLlmGapCheck: bool = False


class MatchedSkill(BaseModel):
    term: str
    category: str
    resumeEvidence: str
    jdEvidence: str
    source: Literal["rule", "llm"] = "rule"


class MissingSkill(BaseModel):
    term: str
    category: str
    jdContext: str
    learnable: bool
    source: Literal["rule", "llm"] = "rule"


class IrrelevantItem(BaseModel):
    term: str
    category: str
    reason: str
    source: Literal["rule", "llm"] = "rule"


class ScoreBreakdown(BaseModel):
    overall: float
    byCategory: dict[str, float]


class AnalyzeResponse(BaseModel):
    matched: list[MatchedSkill]
    missing: list[MissingSkill]
    irrelevant: list[IrrelevantItem]
    score: ScoreBreakdown
    usedLlmGapCheck: bool = False


class DraftBulletRequest(BaseModel):
    term: str
    jdContext: str = ""
    userDetail: str = Field(min_length=1)


class DraftBulletResponse(BaseModel):
    bullet: str
    usedLLM: bool


class ConfigResponse(BaseModel):
    llmEnabled: bool
    mode: str


class ExperienceEntryPayload(BaseModel):
    heading: str = ""
    bullets: list[str] = []


class ResumeSectionsPayload(BaseModel):
    summary: list[str] = []
    experience: list[ExperienceEntryPayload] = []
    education: list[str] = []
    skills: list[str] = []
    projects: list[str] = []
    certifications: list[str] = []
    other: list[str] = []


class ComposeRequest(BaseModel):
    sections: ResumeSectionsPayload
    jdText: str = ""


class ComposeResponse(BaseModel):
    markdown: str
    usedLLM: bool
