import json
import re
from pathlib import Path

from rapidfuzz import fuzz

from app.schemas import (
    AnalyzeResponse,
    IrrelevantItem,
    MatchedSkill,
    MissingSkill,
    ScoreBreakdown,
)

TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "data" / "skills_taxonomy.json"

# Categories the app will actively encourage picking up ("could learn this in
# 2-3 months"). Certifications/languages usually take longer, so they're excluded.
LEARNABLE_CATEGORIES = {"hard_skill", "tool", "methodology"}

FUZZY_THRESHOLD = 87

STOPWORDS = {
    "the", "and", "for", "with", "you", "your", "our", "are", "will", "have",
    "this", "that", "from", "who", "what", "job", "role", "work", "team",
    "including", "such", "all", "any", "we", "us", "an", "a", "to", "of",
    "in", "on", "as", "is", "be", "or", "at", "it", "by",
}


def _load_taxonomy() -> list[dict]:
    with open(TAXONOMY_PATH, encoding="utf-8") as f:
        return json.load(f)


_TAXONOMY = _load_taxonomy()


def _variants(entry: dict) -> list[str]:
    return [entry["term"], *entry.get("aliases", [])]


def _word_boundary_search(term: str, text_lower: str) -> re.Match | None:
    pattern = r"(?<![\w])" + re.escape(term.lower()) + r"(?![\w])"
    return re.search(pattern, text_lower)


def _fuzzy_find(term: str, text_lower: str) -> bool:
    words = text_lower.split()
    term_word_count = len(term.split())
    if term_word_count == 1:
        return any(fuzz.ratio(term, w) >= FUZZY_THRESHOLD for w in words)
    for i in range(len(words) - term_word_count + 1):
        window = " ".join(words[i : i + term_word_count])
        if fuzz.ratio(term.lower(), window) >= FUZZY_THRESHOLD:
            return True
    return False


def _find_in_text(entry: dict, text_lower: str) -> tuple[bool, str | None]:
    """Returns (found, matched_variant)."""
    for variant in _variants(entry):
        m = _word_boundary_search(variant, text_lower)
        if m:
            return True, variant
    for variant in _variants(entry):
        if len(variant) >= 3 and _fuzzy_find(variant, text_lower):
            return True, variant
    return False, None


def _snippet(text: str, variant: str, window: int = 60) -> str:
    text_lower = text.lower()
    boundary_match = _word_boundary_search(variant, text_lower)
    idx = boundary_match.start() if boundary_match else -1
    if idx == -1:
        words = text_lower.split()
        vw = variant.lower().split()
        for i in range(len(words) - len(vw) + 1):
            if fuzz.ratio(" ".join(words[i : i + len(vw)]), variant.lower()) >= FUZZY_THRESHOLD:
                idx = text_lower.find(words[i])
                break
    if idx == -1:
        return text.strip()[:120]
    start = max(0, idx - window)
    end = min(len(text), idx + len(variant) + window)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(text) else ""
    return f"{prefix}{text[start:end].strip()}{suffix}"


CUSTOM_TERM_PATTERN = re.compile(
    r"\b[A-Z][a-zA-Z0-9+#]*(?:\s+[A-Z][a-zA-Z0-9+#]*){1,2}\b|\b[A-Z]{3,6}\b"
)


def _extract_custom_terms(jd_text: str, known_terms: set[str]) -> list[str]:
    """Very lightweight noun-phrase-ish extraction: capitalized phrases / acronyms
    in the JD that aren't already covered by the curated taxonomy. Keeps the
    system free/deterministic (no NLP model required)."""
    candidates: dict[str, int] = {}
    for match in CUSTOM_TERM_PATTERN.finditer(jd_text):
        phrase = match.group().strip()
        key = phrase.lower()
        if key in STOPWORDS or len(phrase) < 2:
            continue
        if key in known_terms:
            continue
        candidates[phrase] = candidates.get(phrase, 0) + 1

    # Multi-word phrases only count as real terms if they recur (a single
    # incidental 2-3 word capitalized run, e.g. a sentence that happens to start
    # with a proper noun, is noise). A lone ALL-CAPS acronym is kept on one
    # occurrence since real acronyms are often mentioned just once. Cap at 15.
    ranked = sorted(candidates.items(), key=lambda kv: (-kv[1], kv[0]))
    filtered = [
        term
        for term, count in ranked
        if (" " in term and count > 1) or (term.isupper() and count >= 1)
    ]
    return filtered[:15]


def analyze(resume_text: str, jd_text: str) -> AnalyzeResponse:
    resume_lower = resume_text.lower()
    jd_lower = jd_text.lower()

    matched: list[MatchedSkill] = []
    missing: list[MissingSkill] = []
    irrelevant: list[IrrelevantItem] = []

    known_terms_lower: set[str] = set()
    for entry in _TAXONOMY:
        for v in _variants(entry):
            known_terms_lower.add(v.lower())

    category_counts: dict[str, list[int]] = {}

    def bump(category: str, is_matched: bool) -> None:
        counts = category_counts.setdefault(category, [0, 0])
        counts[0] += 1
        if is_matched:
            counts[1] += 1

    for entry in _TAXONOMY:
        term = entry["term"]
        category = entry["category"]

        in_jd, jd_variant = _find_in_text(entry, jd_lower)
        if not in_jd:
            continue  # only care about taxonomy terms relevant to this JD

        in_resume, resume_variant = _find_in_text(entry, resume_lower)
        bump(category, in_resume)

        if in_resume:
            matched.append(
                MatchedSkill(
                    term=term,
                    category=category,
                    resumeEvidence=_snippet(resume_text, resume_variant or term),
                    jdEvidence=_snippet(jd_text, jd_variant or term),
                )
            )
        else:
            missing.append(
                MissingSkill(
                    term=term,
                    category=category,
                    jdContext=_snippet(jd_text, jd_variant or term),
                    learnable=category in LEARNABLE_CATEGORIES,
                )
            )

    # Custom (non-taxonomy) terms pulled straight from the JD text.
    custom_terms = _extract_custom_terms(jd_text, known_terms_lower)
    for term in custom_terms:
        in_resume = _word_boundary_search(term, resume_lower) is not None
        bump("custom", in_resume)
        if in_resume:
            matched.append(
                MatchedSkill(
                    term=term,
                    category="custom",
                    resumeEvidence=_snippet(resume_text, term),
                    jdEvidence=_snippet(jd_text, term),
                )
            )
        else:
            missing.append(
                MissingSkill(
                    term=term,
                    category="custom",
                    jdContext=_snippet(jd_text, term),
                    learnable=True,
                )
            )

    # Irrelevant: taxonomy skills present in the resume but with no trace in the JD.
    for entry in _TAXONOMY:
        term = entry["term"]
        category = entry["category"]
        in_resume, resume_variant = _find_in_text(entry, resume_lower)
        if not in_resume:
            continue
        in_jd, _ = _find_in_text(entry, jd_lower)
        if in_jd:
            continue
        irrelevant.append(
            IrrelevantItem(
                term=term,
                category=category,
                reason=f"'{term}' doesn't appear in the job description, and no similar term was found there.",
            )
        )

    total_relevant = sum(c[0] for c in category_counts.values())
    total_matched = sum(c[1] for c in category_counts.values())
    overall = round((total_matched / total_relevant) * 100, 1) if total_relevant else 0.0
    by_category = {
        cat: round((counts[1] / counts[0]) * 100, 1) if counts[0] else 0.0
        for cat, counts in category_counts.items()
    }

    return AnalyzeResponse(
        matched=matched,
        missing=missing,
        irrelevant=irrelevant,
        score=ScoreBreakdown(overall=overall, byCategory=by_category),
    )
