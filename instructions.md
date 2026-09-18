# Re-use-me ↔ Job Description Matcher & Optimizer (Open-Source, Free Tier First)

## 1. One-line pitch
A web app where a user pastes/uploads their resume(s) and a job description, sees matched vs. missing keywords/skills, accepts AI suggestions to close the gap, strips irrelevant content, previews the result in a clean "Harvard-style" (or other) template, and downloads a polished resume.

---

## 2. Core User Flow

1. **Input resumes**
   - User can upload 1+ PDF resumes, OR paste text directly into a textbox.
   - If multiple resumes are uploaded, all extracted text is merged into a single "master resume pool" textbox (deduplicated where reasonable) that the user can edit before proceeding.
   - If only 1 resume is uploaded, it populates the same textbox. Re-running the flow with a new JD reuses this resume text unless the user re-uploads/edits it.
2. **Input job description**
   - Paste text or upload PDF/txt. Only one active JD at a time.
3. **Analyze**
   - System extracts skills/keywords from both resume pool and JD.
   - Shows three buckets: ✅ Matched, ⚠️ Missing (in JD, not in resume), ➖ Irrelevant (in resume, not relevant to JD).
4. **Interactive gap-closing**
   - For each "Missing" item, system asks: "Do you have experience with X?" → Yes/No/Skip. (And encourage user if you think you could learn this in 2-3 months, I think you should add to resume.)
   - If Yes → prompts user for a short detail ("Where/how did you use X?") → system drafts a bullet point and inserts it into the correct resume section.
   - If No → item is skipped (optionally shown as "consider learning this").
5. **Cleanup pass**
   - System proposes removing/trimming bullets or skills flagged "Irrelevant" to the JD. User approves/rejects each suggestion individually.
6. **Template preview**
   - User previews the optimized resume rendered in a template (default: "Harvard/Reverse-chronological" style). User can switch templates live.
7. **Export**
   - Download as PDF (and optionally DOCX). Original raw text remains recoverable (undo/version history).

---

## 3. Key Product Principles
- **Non-destructive by default**: every AI suggestion (add/remove) requires explicit user approval before it touches the "final" resume. Keep a diff/history.
- **Transparency**: show *why* something is flagged missing/irrelevant (which JD phrase triggered it).
- **No fabrication**: system never invents experience. It only adds content the user explicitly confirms and describes.
- **Local-first privacy option**: since resumes are sensitive PII, design so the OSS self-hosted version can run keyword/matching logic without sending data to a third-party LLM if the user configures a local model (e.g., Ollama) — but default free-tier can use a hosted LLM API with clear consent.

---

## 4. Feature Breakdown (MVP vs. Later)

### MVP (v0.1 — Free, OSS)
- [ ] Resume input: paste text + PDF upload (single or multiple → merged textbox)
- [ ] JD input: paste text + PDF upload (single, replace-on-reupload)
- [ ] PDF text extraction (resume + JD)
- [ ] Keyword/skill extraction (resume vs JD)
- [ ] Matched / Missing / Irrelevant classification, shown as tagged lists
- [ ] Interactive Q&A to fill missing skills (chat-like or form-like, one item at a time)
- [ ] Approve/reject cleanup suggestions
- [ ] One resume template ("Harvard style") rendered from structured data
- [ ] Template preview (live) before export
- [ ] Export to PDF
- [ ] Basic auth-free / local session (no account required for OSS self-host)

### v0.2
- [ ] Multiple templates + style switcher (modern, minimal, ATS-safe, academic/Harvard)
- [ ] DOCX export
- [ ] Resume version history / diff view (before vs after)
- [ ] Match score (%) with breakdown by category (hard skills, soft skills, tools, certifications)
- [ ] Section-aware parsing (Experience, Education, Skills, Projects, Summary) instead of flat text

### v0.3 / Future (possibly paid tier)
- [ ] User accounts, saved resumes/JDs, resume library
- [ ] ATS-compatibility linter (fonts, tables, columns warnings)
- [ ] Multi-language support
- [ ] Team/recruiter mode (bulk JD matching)
- [ ] Browser extension to pull JD directly from job posting pages
- [ ] Local LLM support (Ollama/LM Studio) toggle for privacy-sensitive users

---

## 5. Suggested Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Tailwind | Fast to build, component-friendly for preview panes |
| Resume rendering | HTML/CSS templates → Puppeteer/Playwright to export PDF | Keeps templates as normal web code, easy to style-switch |
| Backend | Node.js (Express/Fastify) or Python (FastAPI) | Either fine; FastAPI is nice if you want Python NLP libs |
| PDF text extraction | `pdf-parse` / `pdfjs-dist` (Node) or `pdfplumber` / `PyMuPDF` (Python) | Reliable text extraction, handles most resume PDFs |
| Keyword/skill extraction | Start rule-based (skill taxonomy list + regex/fuzzy match), then layer an LLM call for nuance | Rule-based = free, fast, deterministic; LLM = catches synonyms/phrasing |
| LLM (optional, for suggestions & bullet drafting) | Pluggable interface — default to a hosted API (e.g., Claude API) with a `.env` key, allow Ollama as local alternative | Keeps OSS project free/runnable without forcing an API key, but better UX with one |
| Data storage (MVP) | None required — stateless / browser localStorage or session only | Avoids handling sensitive PII server-side for v0.1 |
| Data storage (later) | Postgres + object storage (S3-compatible) for saved resumes | Only once accounts are introduced |
| Deployment | Docker Compose for self-host; Vercel/Render for hosted demo | Standard OSS pattern |

---

## 6. Data Model (conceptual)

```
Resume
  - id
  - rawText (merged from 1+ uploads)
  - sections: { summary, experience[], education[], skills[], projects[], certifications[] }
  - sourceFiles: [{ filename, uploadedAt }]

JobDescription
  - id
  - rawText
  - extractedSkills: [{ term, category, importance }]

MatchResult
  - resumeId, jdId
  - matched: [{ term, resumeEvidence }]
  - missing: [{ term, jdContext, userResponse: yes/no/skip, userDetail?, generatedBullet? }]
  - irrelevant: [{ resumeSnippet, reason, userDecision: keep/remove }]
  - score: { overall, bySkillCategory }

ResumeDraft (working/edited version)
  - baseResumeId
  - appliedChanges: [{ type: add|remove, target, content, timestamp }]
  - template: "harvard" | "modern" | "minimal" | ...
```

---

## 7. Matching & Extraction Logic (MVP approach)

1. **Normalize** both texts (lowercase, strip punctuation, lemmatize lightly).
2. **Skill taxonomy**: maintain a curated open-source skills/keywords list (e.g., seed from O*NET, ESCO, or public "tech skills" JSON lists) + allow custom terms extracted via simple noun-phrase extraction from the JD.
3. **Matching**: 
   - Exact/fuzzy string match (e.g., Levenshtein or token-based) for each JD term against resume text.
   - Optional LLM pass: "Given this JD and this resume, list skills in the JD not clearly evidenced in the resume, and resume content not relevant to this JD" — used to catch things rule-based matching misses (synonyms, implied skills).
4. **Irrelevance detection**: flag resume bullets/skills with low semantic relevance to the JD (via embedding similarity if using LLM/embeddings, or simple absence from JD-related taxonomy for rule-based-only mode).
5. Always show the **source of truth** (which JD line triggered a "missing" flag) so the user can judge accuracy.

---

## 8. Template System

- Templates are just HTML+CSS partials that take the structured `Resume` object and render it.
- Ship with **one default "Harvard/Reverse-Chronological" template** at MVP (clean, ATS-friendly, single column).
- Design the renderer so adding a new template = adding a new HTML/CSS file, no logic changes — enables community contributions (good for OSS).
- Live preview = render the current draft in an iframe or sandboxed component; switching templates just swaps the CSS/layout, not the underlying data.

---

## 9. Open Questions to Resolve Before/During Build
1. Do you want the MVP to require an LLM API key at all, or ship a rule-based-only mode that works with zero external calls (fully free/offline)? - Yes, I will provide ChatGPT API later.
2. Should resume/JD data ever touch a server, or should v0.1 be client-side-only (privacy-friendly, simpler to ship as OSS)? - Never, just client side only in MVP (later for manage and provide SaaS plan I will decide later)
3. What license for the OSS repo (MIT/Apache-2.0 recommended for adoption)? - I don't really understand so choose what other can use as open source
4. Target deployment: pure self-host only, or also a hosted free demo instance? - I think in Railway and Vercel
5. How strict should "irrelevant content removal" be — fully user-approved only (recommended) or allow a "trust the AI" bulk-apply mode later? - Irrelevant means not appear in JD but user tends to tell much in resume so I think it should be removed or tell in brief to make resume clean

---

## 10. Suggested First CLI Task List (for scaffolding)
1. Init repo (frontend + backend or single full-stack app), choose license, add README with this spec summary.
2. Build PDF/text ingestion for resume(s) → merged textbox, and JD → textbox.
3. Build rule-based skill extraction + matching (no LLM yet) → Matched/Missing/Irrelevant lists.
4. Build the interactive missing-skill Q&A flow (frontend form/chat) that writes into a `ResumeDraft`.
5. Build the cleanup approve/reject UI.
6. Build the Harvard-style template renderer + live preview.
7. Add PDF export.
8. (Optional) Wire in an LLM call behind a pluggable interface for better matching/bullet drafting.
9. Dockerize for self-host.

---

*This document is meant to be handed to a coding agent (e.g., Claude Code) as the initial project brief. Refine section 9's open questions with the actual builder before writing code.*