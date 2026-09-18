import json

from app.config import Settings
from app.schemas import IrrelevantItem, MatchedSkill, MissingSkill

SYSTEM_PROMPT = (
    "You compare a candidate's resume text against a job description. "
    "Report only skills/phrases that are ACTUALLY PRESENT or CLEARLY IMPLIED in the "
    "supplied text — never invent a skill neither text mentions. "
    "Focus on synonyms and implied skills that simple keyword matching would miss "
    "(e.g. 'led a cross-functional team' implies 'Leadership'; 'built ETL pipelines' "
    "implies 'Data Engineering'). "
    "Respond with ONLY minified JSON, no markdown fences, no commentary, matching "
    'exactly this shape: {"missing": [{"term": str, "reason": str}], '
    '"irrelevant": [{"term": str, "reason": str}], '
    '"matchedImplied": [{"term": str, "resumeReason": str, "jdReason": str}]}. '
    "\"missing\" = implied by the JD but not evidenced in the resume. "
    "\"irrelevant\" = present in the resume but with no relevance to this JD. "
    "\"matchedImplied\" = implied in both. Each \"reason\" must quote or closely "
    "paraphrase the triggering phrase. Keep each list to at most 8 items. "
    "If nothing qualifies, return empty lists."
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
) -> tuple[list[MissingSkill], list[IrrelevantItem], list[MatchedSkill], bool]:
    """Second, opt-in pass over the same resume/JD text used by the rule-based
    matcher. Falls back to "nothing found" (never raises) so a bad response or
    network error never blocks the rule-based results from displaying — see
    openai-integration.md #2.
    """
    if not settings.llm_enabled:
        return [], [], [], False

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

        return missing, irrelevant, matched, True
    except Exception:
        # Never let an LLM/network/parsing hiccup block the rule-based results.
        return [], [], [], False
