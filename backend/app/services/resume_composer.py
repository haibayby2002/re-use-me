import json

from app.config import Settings
from app.schemas import ResumeSectionsPayload

SYSTEM_PROMPT = (
    "You are composing the FINAL draft of a candidate's resume, tailored to one "
    "job description. You may reorganize, tighten, reorder, and rephrase — but "
    "you may ONLY use facts, employers, titles, dates, metrics, and skills that "
    "already appear in the structured resume JSON you are given. "
    "NEVER invent or add an employer, title, date, metric, tool, or claim that "
    "is not already present in the input. If a section is empty, omit it. "
    "The input JSON's `other` field holds the candidate's name and contact "
    "details (address, email, phone) exactly as they appeared in the original "
    "resume — this is the resume header, not a section. Reproduce those lines "
    "VERBATIM as the very first lines of your output, in the same order, with "
    "no markdown header above them and no bullet prefix. Never drop them, "
    "never reorder them elsewhere in the document, and never fold the name or "
    "contact details into Education, Certifications, or any other section. "
    "Respond with ONLY a Markdown document, no commentary before or after it, "
    "no markdown code fence: the header lines described above, then — using "
    "exactly these section headers where the section has content — '## Summary', "
    "'## Experience', '## Skills', '## Education', '## Certifications', "
    "'## Projects'. "
    "Under '## Experience', put each role heading as a bold line "
    "(e.g. '**Title, Company — Dates**') followed by its bullets as '- ' lines. "
    "Under '## Skills', list skills as a single comma-separated line. "
    "All other sections use '- ' bullet lines."
)


def _fallback_markdown(sections: ResumeSectionsPayload) -> str:
    parts: list[str] = []
    # Name + contact go first, matching how parseResumeSections() on the
    # frontend expects the header (content before the first section keyword
    # defaults to the header) — see instructions/openai-integration notes.
    if sections.other:
        parts.extend(sections.other)
        parts.append("")
    if sections.summary:
        parts.append("## Summary")
        parts.extend(f"- {line}" for line in sections.summary)
        parts.append("")
    if sections.experience:
        parts.append("## Experience")
        for entry in sections.experience:
            if entry.heading:
                parts.append(f"**{entry.heading}**")
            parts.extend(f"- {b}" for b in entry.bullets)
        parts.append("")
    if sections.projects:
        parts.append("## Projects")
        parts.extend(f"- {p}" for p in sections.projects)
        parts.append("")
    if sections.skills:
        parts.append("## Skills")
        parts.append(", ".join(sections.skills))
        parts.append("")
    if sections.education:
        parts.append("## Education")
        parts.extend(f"- {e}" for e in sections.education)
        parts.append("")
    if sections.certifications:
        parts.append("## Certifications")
        parts.extend(f"- {c}" for c in sections.certifications)
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def _strip_code_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.split("\n")
        if lines[0].strip().lower() in ("```", "```markdown", "```md"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip() + "\n"
    return text


def compose_resume(
    sections: ResumeSectionsPayload, jd_text: str, settings: Settings
) -> tuple[str, bool]:
    """Turn the working ResumeDraft into a single editable Markdown document —
    the "final (editable) resume" — using the same anti-fabrication constraint
    as draft_bullet(). Falls back to a deterministic Markdown dump of the
    structured sections (still editable/previewable/exportable, just not
    reorganized) when no key is configured or on any API/network error — see
    openai-integration.md #4.
    """
    fallback = _fallback_markdown(sections)
    if not settings.llm_enabled:
        return fallback, False

    try:
        from app.services.llm_client import build_client, completion_token_kwargs

        client = build_client(settings)
        user_prompt = (
            f"Structured resume JSON:\n{json.dumps(sections.model_dump(), ensure_ascii=False)}\n\n"
            f"Target job description:\n{jd_text or 'N/A'}\n\n"
            "Compose the final tailored resume as Markdown per the rules above."
        )
        response = client.chat.completions.create(
            model=settings.resolved_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            # See gap_service.py — this model spends part of the budget on
            # hidden reasoning tokens, so keep this generous.
            **completion_token_kwargs(settings, 4000),
        )
        markdown = _strip_code_fence(response.choices[0].message.content or "")
        if not markdown.strip():
            return fallback, False
        return markdown, True
    except Exception:
        # Never let an LLM/network hiccup block the user's flow.
        return fallback, False
