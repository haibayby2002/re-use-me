from app.config import Settings

SYSTEM_PROMPT = (
    "You write a single, concise resume bullet point (max ~200 characters) "
    "for a job seeker. Use ONLY the details the user actually provided. "
    "Never invent metrics, tools, employers, or outcomes that were not stated. "
    "Start with a strong past-tense action verb. Return only the bullet text, "
    "no bullet character, no quotes, no preamble."
)


def _fallback_bullet(term: str, user_detail: str) -> str:
    detail = user_detail.strip().rstrip(".")
    return f"Applied {term} to {detail}."


def draft_bullet(term: str, jd_context: str, user_detail: str, settings: Settings) -> tuple[str, bool]:
    """Draft a resume bullet for a missing skill the user confirmed they have.

    Falls back to a deterministic template when no LLM API key is configured,
    so the app remains fully usable with zero external calls (see instructions.md
    open question #1).
    """
    if not settings.llm_enabled:
        return _fallback_bullet(term, user_detail), False

    try:
        from app.services.llm_client import build_client, completion_token_kwargs

        client = build_client(settings)
        # No custom temperature: some newer models (e.g. reasoning-tuned ones)
        # reject any value other than the API default (1).
        user_prompt = (
            f"Skill/keyword to highlight: {term}\n"
            f"Relevant job description context: {jd_context or 'N/A'}\n"
            f"What the candidate told us they did: {user_detail}\n\n"
            "Write one resume bullet point using only the candidate's own words above."
        )
        response = client.chat.completions.create(
            model=settings.resolved_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            # Generous relative to the ~200-char output: some models spend part
            # of this budget on hidden reasoning tokens before the visible text.
            **completion_token_kwargs(settings, 400),
        )
        bullet = response.choices[0].message.content.strip().strip('"')
        if not bullet:
            return _fallback_bullet(term, user_detail), False
        return bullet, True
    except Exception:
        # Never let an LLM/network hiccup block the user's flow.
        return _fallback_bullet(term, user_detail), False
