# re-use-me

Resume ↔ job description matcher and optimizer. Paste or upload your resume(s) and a job
description, see what matches/is missing/looks irrelevant, close the gaps interactively,
approve a cleanup pass, preview the result in a resume template, and export a real,
text-based PDF. See [`instructions.md`](./instructions.md) for the full product spec.

No database. No accounts. Your resume and JD text live only in your browser
(`localStorage`) and pass through to your own backend for extraction/matching/drafting —
never to a third party unless you configure a hosted LLM key.

## Stack

- **Frontend**: React + TypeScript + Tailwind CSS v4 (Vite), Zustand for state,
  `@react-pdf/renderer` for export, `react-dropzone` for uploads.
- **Backend**: FastAPI (Python), stateless — every endpoint is a pure request/response,
  nothing is persisted server-side. PDF text extraction via
  [pypdf](https://github.com/py-pdf/pypdf) (BSD-3-Clause — also avoids pulling an AGPL
  dependency into an MIT-licensed tool), fuzzy matching via RapidFuzz.
- **LLM (optional, multi-provider)**: bullet drafting, gap-detection, and resume composition
  use an LLM if `LLM_API_KEY` is set on the backend; otherwise everything falls back to
  deterministic templates/rules. Any OpenAI-compatible Chat Completions API works — OpenAI,
  DeepSeek, Groq, OpenRouter, Together, Moonshot, a local Ollama server, or any other
  compatible endpoint via `LLM_PROVIDER`/`LLM_BASE_URL` — see `backend/.env.example` for the
  full list and model examples. Matching/scoring is always rule-based (skill taxonomy + fuzzy
  match), so the app works fully offline with zero external calls if you never set a key.

## Project layout

```
backend/    FastAPI app (app/main.py, routers/, services/, data/skills_taxonomy.json)
frontend/   Vite React app (src/components/, src/store/, src/api/)
docker-compose.yml
```

## Running locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env             # optionally set LLM_PROVIDER + LLM_API_KEY (OpenAI, DeepSeek, ...)
uvicorn app.main:app --reload --reload-dir app --port 8001
```

(Port 8001, not 8000 — 8000 is a very commonly-used dev port and prone to collisions;
pick any free port and update `frontend/.env.local` to match. `--reload-dir app` scopes
the file-watcher to the app code — without it, `--reload` watches the whole backend
folder including `.venv`, and installing a new package while the server is running can
trigger a reload storm across thousands of dependency files.)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local       # points at http://localhost:8001 by default
npm run dev
```

Open http://localhost:5173.

### Docker Compose (self-host)

```bash
LLM_PROVIDER=deepseek LLM_API_KEY=sk-... docker compose up --build
# or the default provider (OpenAI):
OPENAI_API_KEY=sk-... docker compose up --build
```

Frontend on :3000, backend on :8000 (containers get a clean network namespace, so 8000 is
fine there — it's only the local dev default that was moved to 8001).

## How matching works

1. A curated skill taxonomy (`backend/app/data/skills_taxonomy.json` — hard skills, tools,
   soft skills, certifications, languages, methodologies) is matched against both texts via
   exact/alias/fuzzy string matching.
2. A lightweight regex pass also pulls capitalized phrases/acronyms straight out of the JD
   to catch terms not in the taxonomy.
3. **Matched** = taxonomy/custom term present in both. **Missing** = present in the JD, not
   in the resume. **Irrelevant** = present in the resume, absent from the JD. Every flagged
   item shows the exact snippet that triggered it, so you can judge accuracy yourself.
4. Nothing is added to or removed from your resume without your explicit approval — the
   gap-closing and cleanup steps are opt-in per item, and every change is tracked in the
   version history panel with one-click undo.

## Known MVP simplifications

- Resume section parsing (`frontend/src/utils/parseResumeSections.ts`) is heuristic —
  it looks for common section headers (SUMMARY, EXPERIENCE, SKILLS, EDUCATION,
  CERTIFICATIONS, PROJECTS) and bullet markers. Anything before the first recognized
  header is treated as the name/contact header. `pypdf`'s text extraction can garble
  multi-column PDF layouts (it follows content-stream order, not visual position); any
  layout it gets wrong can be fixed with the "Edit as text" button on the preview step.
- Rule-based matching (no LLM) will produce some false positives/negatives on synonyms —
  by design, per the product principle of "no fabrication, always show your work."
  Wiring an optional LLM-assisted matching pass is a natural v0.2 extension point
  (`backend/app/services/skill_matcher.py`).
- Two templates ship today (Harvard, Modern); adding another is just a new component in
  `frontend/src/components/templates/` plus a PDF variant in `ResumePdfDocument.tsx`.
- DOCX export, section-aware re-ordering, and match-score history are not in v0.1 (see
  `instructions.md` §4 for the full roadmap).

## License

MIT — see [LICENSE](./LICENSE).
