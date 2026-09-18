import json

from app.config import Settings
from app.schemas import (
    IrrelevantItem,
    MatchedSkill,
    MissingSkill,
    ResumeElements,
    ResumeExperienceElement,
)

SYSTEM_PROMPT = (
    "You compare a candidate's resume text against a job description, and you "
    "also recognize the resume's own structure. Report only skills/phrases that "
    "are ACTUALLY PRESENT or CLEARLY IMPLIED in the supplied text — never invent "
    "a skill neither text mentions, and never invent a resume element (name, "
    "employer, title, date, school, project) not literally present in the resume "
    "text. "
    "Focus on synonyms and implied skills that simple keyword matching would miss "
    "(e.g. 'led a cross-functional team' implies 'Leadership'; 'built ETL pipelines' "
    "implies 'Data Engineering'). "
    "Respond with ONLY minified JSON, no markdown fences, no commentary, matching "
    'exactly this shape: {"missing": [{"term": str, "reason": str}], '
    '"irrelevant": [{"term": str, "reason": str}], '
    '"matchedImplied": [{"term": str, "resumeReason": str, "jdReason": str}], '
    '"resumeElements": {"name": str, "contact": [str], "hasSummary": bool, '
    '"experience": [{"title": str, "organization": str, "dates": str}], '
    '"education": [str], "skills": [str], "certifications": [str], "projects": [str]}}. '
    "\"missing\" = implied by the JD but not evidenced in the resume. "
    "\"irrelevant\" = present in the resume but with no relevance to this JD. "
    "\"matchedImplied\" = implied in both. Each \"reason\" must quote or closely "
    "paraphrase the triggering phrase. Keep each list to at most 8 items. "
    "\"resumeElements\" = the structural elements you recognize in the RESUME TEXT "
    "only (never the job description): candidate name; contact lines (email, phone, "
    "location, links) verbatim; whether it has a summary/objective section; each "
    "work experience entry's title, organization, and date range as written; "
    "education entries; the skills list; certifications; and projects. Omit an "
    "element entirely (empty string/list/false) rather than guess if it's not "
    "clearly present. If nothing qualifies for a field, return empty lists/strings."
)


def _parse_llm_response(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("LLM response was not a JSON object")
    return data


def detect_gap_llm(
    resume_text: str,
    jd_text: str,
    known_terms_lower: set[str],
    settings: Settings,
) -> tuple[list[MissingSkill], list[IrrelevantItem], list[MatchedSkill], ResumeElements | None, bool]:
    """Second, opt-in pass over the same resume/JD text used by the rule-based
    matcher. Also has the LLM recognize the resume's own structural elements
    (name/contact, experience entries, education, skills, ...) in the same
    call, since it already reads the full resume text to do the gap check.
    Falls back to "nothing found" (never raises) so a bad response or network
    error never blocks the rule-based results from displaying — see
    openai-integration.md #2.
    """
    if not settings.llm_enabled:
        return [], [], [], None, False

    try:
        from app.services.llm_client import build_client, completion_token_kwargs

        client = build_client(settings)
        user_prompt = (
            f"RESUME TEXT:\n{resume_text}\n\nJOB DESCRIPTION TEXT:\n{jd_text}"
        )
        response = client.chat.completions.create(
            model=settings.resolved_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            # Generous budget: this model spends some of it on hidden reasoning
            # tokens before emitting the visible JSON, so a tight limit can come
            # back with empty content on longer resume/JD text.
            **completion_token_kwargs(settings, 4000),
        )
        content = response.choices[0].message.content or ""
        data = _parse_llm_response(content)

        missing: list[MissingSkill] = []
        for item in data.get("missing", []):
            term = str(item.get("term", "")).strip()
            if not term or term.lower() in known_terms_lower:
                continue
            missing.append(
                MissingSkill(
                    term=term,
                    category="custom",
                    jdContext=str(item.get("reason", "")).strip() or "Flagged by AI gap check.",
                    learnable=True,
                    source="llm",
                )
            )

        irrelevant: list[IrrelevantItem] = []
        for item in data.get("irrelevant", []):
            term = str(item.get("term", "")).strip()
            if not term:
                continue
            irrelevant.append(
                IrrelevantItem(
                    term=term,
                    category="custom",
                    reason=str(item.get("reason", "")).strip() or "Flagged by AI gap check.",
                    source="llm",
                )
            )

        matched: list[MatchedSkill] = []
        for item in data.get("matchedImplied", []):
            term = str(item.get("term", "")).strip()
            if not term or term.lower() in known_terms_lower:
                continue
            matched.append(
                MatchedSkill(
                    term=term,
                    category="custom",
                    resumeEvidence=str(item.get("resumeReason", "")).strip() or "Implied by resume.",
                    jdEvidence=str(item.get("jdReason", "")).strip() or "Implied by JD.",
                    source="llm",
                )
            )

        elements_data = data.get("resumeElements")
        elements: ResumeElements | None = None
        if isinstance(elements_data, dict):
            experience = [
                ResumeExperienceElement(
                    title=str(e.get("title", "")).strip(),
                    organization=str(e.get("organization", "")).strip(),
                    dates=str(e.get("dates", "")).strip(),
                )
                for e in elements_data.get("experience", [])
                if isinstance(e, dict)
            ]
            elements = ResumeElements(
                name=str(elements_data.get("name", "")).strip(),
                contact=[str(c).strip() for c in elements_data.get("contact", []) if str(c).strip()],
                hasSummary=bool(elements_data.get("hasSummary", False)),
                experience=experience,
                education=[str(e).strip() for e in elements_data.get("education", []) if str(e).strip()],
                skills=[str(s).strip() for s in elements_data.get("skills", []) if str(s).strip()],
                certifications=[
                    str(c).strip() for c in elements_data.get("certifications", []) if str(c).strip()
                ],
                projects=[str(p).strip() for p in elements_data.get("projects", []) if str(p).strip()],
            )

        return missing, irrelevant, matched, elements, True
    except Exception:
        # Never let an LLM/network/parsing hiccup block the rule-based results.
        return [], [], [], None, False
