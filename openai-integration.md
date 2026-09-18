# LLM API Integration Points

This document tracks where an LLM API is used (or proposed to be used) in re-use-me, and why. Per the project's core principle ("no fabrication, rule-based by default"), every LLM-assisted feature must degrade gracefully to a deterministic fallback when no API key is configured.

The app talks to any OpenAI-compatible Chat Completions API — OpenAI, DeepSeek, Groq,
OpenRouter, Together, Moonshot, a local Ollama server, or a custom endpoint — via the
`openai` SDK pointed at the provider's `base_url` (`backend/app/services/llm_client.py`,
`PROVIDER_DEFAULTS` in `backend/app/config.py`). Config lives in `backend/app/config.py`
(`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`; legacy `OPENAI_API_KEY`/
`OPENAI_MODEL` are still read as fallbacks). `GET /api/config` reports `llmEnabled` so the
frontend can show whether the app is in "rule-based-only" or "LLM-assisted" mode. See
`backend/.env.example` for the full provider list and model id examples.

## 1. Bullet drafting (implemented)

- **Where**: `backend/app/services/llm_service.py` → `draft_bullet()`
- **Trigger**: user confirms they have a missing skill and types a short detail
  in the "Close the gaps" step.
- **Input**: skill term, JD context snippet, user's own detail text.
- **Output**: one resume bullet point, phrased from the user's words only.
- **Constraint**: system prompt explicitly forbids inventing metrics, tools,
  employers, or outcomes not stated by the user.
- **Fallback**: deterministic template (`"Applied {term} to {detail}."`) when no
  key is set, or on any API/network error.

## 2. Proposed: ChatGPT-assisted gap detection (not implemented, spec'd for `gap_service.py`)

- **Where it would live**: a new function `detect_gap_llm()` in a new
  `backend/app/services/gap_service.py` (kept separate from the deterministic
  `skill_matcher.py` so the rule-based path stays untouched and testable alone),
  invoked from `backend/app/routers/analyze.py` only when `settings.llm_enabled`
  **and** the request opts in (see consent note below).
- **Trigger**: after the existing rule-based `analyze()` call already ran — this
  is a second pass over the *same* resume/JD text, not a replacement.
- **Motivation**: rule-based taxonomy + fuzzy matching misses synonyms and implied
  skills (e.g. "led a cross-functional team" implying "Leadership", or "built ETL
  pipelines" implying "Data Engineering") — flagged as a known limitation and as
  a v0.2 idea in `instructions.md` §7.2. This is the "detect gap" half of the
  two ChatGPT-assisted flows requested for this project (the other is #4 below).
- **Request/response shape**:
  - `AnalyzeRequest` gains an optional `useLlmGapCheck: bool = False` — explicit
    opt-in per request, never implied by `llmEnabled` alone.
  - `MatchedSkill`, `MissingSkill`, and `IrrelevantItem` each gain a
    `source: Literal["rule", "llm"] = "rule"` field. LLM-sourced items are
    appended after the rule-based pass and de-duplicated (case-insensitive term
    match) against what's already there, so the UI can render them in a visually
    distinct "AI-suggested" group per the "always show your work" principle.
- **Input**: normalized resume text + JD text (same strings `skill_matcher.analyze()`
  already receives — no extra extraction step needed).
- **Prompt**: a system prompt in the same family as `draft_bullet()`'s — explicitly
  instructed to only report terms/phrases that are *actually present or clearly
  implied* in the supplied text, never to invent skills, and to return strict JSON
  (`{"missing": [...], "irrelevant": [...], "matchedImplied": [...]}` with a short
  `reason` per item quoting the triggering phrase) so responses parse deterministically
  and degrade safely on a malformed reply.
- **Fallback**: on missing key, `useLlmGapCheck=False`, any API/network error, or a
  response that fails JSON validation — skip the pass entirely; rule-based results
  stand alone, exactly as today. Never raises past the router.
- **Cost/privacy note**: this is one of the two places (with #4) full resume + JD
  text leaves the user's machine — stays strictly opt-in, gated behind a visible
  "Also check with AI" toggle, and clearly disclosed, consistent with
  `instructions.md`'s local-first privacy stance.

## 3. Proposed: PDF-to-structured-resume assist (not implemented)

- **Where it would live**: an optional post-processing step after
  `backend/app/services/text_extraction.py`, before the frontend's heuristic
  `parseResumeSections.ts` runs — or as an alternative path entirely when enabled.
- **Motivation**: multi-column / non-standard CVs still get misattributed —
  job title, organization, location, and date ranges bleeding into the wrong
  fields or the wrong entry — even after switching PDF extraction to `pdftext`
  with reading-order sorting. Deterministic heuristics have a ceiling on
  arbitrary layouts; an LLM structuring pass could be materially more robust
  at correctly separating role vs. organization vs. dates, at the cost of
  sending resume content externally.
- **Input**: raw extracted text (or block/position data) for one resume.
- **Output**: structured JSON matching the existing `ResumeSections` shape
  (summary, experience[] with distinct role/organization/date fields,
  education[], skills[], projects[], certifications[]).
- **Fallback**: current heuristic parser, unchanged — this would be a strict
  opt-in upgrade, not a replacement, since the deterministic path has no
  external-call requirement.
- **Note**: cheaper deterministic fixes to the extraction/parsing heuristics
  should be tried first, since they're free, private, and directly address the
  role/organization/date misattribution bug without an external call.

## 4. Proposed: ChatGPT-assisted final resume composition (editable, previewable, exportable — not implemented)

- **Where it would live**: `compose_resume()` in a new
  `backend/app/services/resume_composer.py`, exposed via a new
  `POST /api/compose` in `backend/app/routers/compose.py`. Frontend: a new
  "Generate final resume" action in `TemplatePreview.tsx`, sitting next to the
  existing "Edit as text" button.
- **Trigger**: user-initiated, after gap-closing (instructions.md step 4) and the
  cleanup pass (step 5) — i.e. once `ResumeDraft.appliedChanges` reflects what the
  user actually approved. This is the "create a final (editable) resume" half of
  the two ChatGPT-assisted flows requested for this project (the other is #2 above).
- **Motivation**: per `core.md`, the final CV should "wrap relevant content into
  sections and have structure" — reflowed and tightened for the specific JD, not
  just the raw accept/reject result. `TemplatePreview.tsx` already has a working
  text-in/text-out loop (`sectionsToPlainText` → user edits → `parseResumeSections`
  → re-render) for a plain-text "Edit as text" mode; this proposal reuses that exact
  loop and only changes what fills the textbox *before* the user's first edit —
  a ChatGPT-composed draft instead of a mechanical dump of the structured data.
- **Input**: the current `ResumeSections` (post gap-closing/cleanup) + JD text +
  which `appliedChanges` were user-approved.
- **Output format — Markdown, not LaTeX**: a single Markdown document as the new
  source of truth, using the section-header words `parseResumeSections.ts` already
  recognizes (`SUMMARY`, `EXPERIENCE`, `SKILLS`, `EDUCATION`, `CERTIFICATIONS`,
  `PROJECTS`) plus plain Markdown for structure (`- ` bullets, `**bold**` for
  role/company emphasis). Concretely this means:
  - **Editable**: it's just text — the user can hand-edit it directly, same as
    today's "Edit as text" mode, no new UI paradigm.
  - **Previewable**: rendered live via a Markdown renderer (e.g. `react-markdown`,
    one new frontend dependency) in the same pane that currently shows the raw
    `<textarea>`, so the user sees formatted output while editing, not plain text.
  - **Exports to PDF with zero new PDF pipeline**: the Markdown is parsed back into
    `ResumeSections` with the existing `parseResumeSections()` (extended only to
    strip `**bold**`/`#`-style headers), then flows through the existing
    `ResumePdfDocument` → `@react-pdf/renderer` export path in `ExportPanel.tsx`
    unchanged — still a real, selectable-text, ATS-friendly PDF, still generated
    entirely client-side.
  - **Why not LaTeX**: a `.tex` source would need either a server-side LaTeX engine
    (`pdflatex`/`tectonic`) or a heavy client-side LaTeX-to-PDF library, breaking
    the "free, client-side-only, zero required external services" stance in
    `instructions.md` §3/§9, and it would need an entirely separate preview/export
    pipeline instead of reusing the one above. Worth revisiting as an optional
    power-user export (raw `.tex` download, no live LaTeX preview) once there's
    demand — track as a v0.3 idea, not part of this proposal.
- **Constraint**: same anti-fabrication system prompt family as `draft_bullet()` —
  ChatGPT may reorganize, tighten, reorder, and rephrase, but only using content
  already present in `ResumeSections` or explicitly user-approved bullets; it must
  never introduce a new employer, title, metric, date, or claim.
- **Fallback**: if no LLM key is configured, or the API/network call fails, hide
  "Generate final resume" (or show it disabled with a tooltip) — the user still has
  today's manual "Edit as text" flow, which already works with zero external calls
  and zero new dependencies.
- **Cost/privacy note**: same sensitivity as #2 — full resume + JD text leaves the
  machine — gate behind the same explicit opt-in/consent UI, and treat this and #2
  as the two toggles covered by design principle 4 below, not four separate ones.

## Design principles for any future addition

1. Every LLM call must have a working non-LLM fallback — the app must remain
   fully functional and free with zero external calls.
2. Never let an LLM invent content the user didn't provide (no fabricated
   experience, metrics, or employers).
3. Always disclose in the UI when a result came from the LLM vs. rule-based
   logic (see `usedLLM` flag pattern already used in bullet drafting).
4. Treat any pass that sends full resume/JD text externally as more sensitive
   than the current per-bullet calls, and gate it behind explicit user consent.
