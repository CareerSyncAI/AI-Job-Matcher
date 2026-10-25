# CareerSync AI — Agent Guidelines & Implementation Truth Source

> **Authority Notice:** Every agent working on this repository must read this file first.
> Do NOT overwrite or repurpose `frontend/AGENTS.md`, which contains Next.js-managed rules.

---

## 1. Ground Truth Architecture & Technology Table

All claims in documentation, presentations, and code must strictly adhere to the actual active codebase. Never treat planned or proposed architecture as implemented.

| Component / Layer | Status | Actual Active Implementation in Code |
| :--- | :--- | :--- |
| **Frontend Framework** | **Active** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS. |
| **Backend Framework** | **Active** | FastAPI modular monolith (`backend/app`), SQLAlchemy 2.0 async/sync, Pydantic v2. |
| **Database** | **Active** | PostgreSQL 16 (production/CI) / SQLite (disposable local tests). |
| **PDF Extraction** | **Active** | `pdfplumber` with automatic fallback to `pypdf` (`ai-services/src/parsers/pdf_parser.py`). Enforces max page limit. |
| **DOCX Extraction** | **Active** | `python-docx` (`ai-services/src/parsers/docx_parser.py`). Enforces zip-bomb, entry count, and compression ratio limits. |
| **Section Boundary Detection** | **Active** | Regex and rule-based heading boundary detector (`ai-services/src/parsers/section_detector.py`). |
| **Skill Extraction** | **Active** | Canonical taxonomy matching with word boundaries and negative context filtering (`ai-services/src/extractors/skill_extractor.py`). |
| **Experience & Education** | **Active** | Regex date parser with overlapping interval merging and degree rank ordering (`ai-services/src/extractors/experience_extractor.py`, `education_extractor.py`). |
| **Authoritative Recruiter Ranking** | **Active** | **100% deterministic** multi-factor scoring in `backend/app/services/scoring.py` and `backend/app/services/evaluation.py` using `CoverageTier` ordering and `SublinearTFCosineMatcher` ($1 + \ln(\text{tf})$). |
| **Neural Dense Matcher** | **Diagnostic** | `sentence-transformers/all-MiniLM-L6-v2` (`ai-services/src/similarity/embedding_matcher.py`) under Contract v1.1.0. Standalone exploratory/diagnostic inference on CPU; does **not** drive recruiter ranking. |
| **Fuzzy Matching (`rapidfuzz_score`)** | **Active (Stdlib)** | Computed via Python standard library `difflib.SequenceMatcher.ratio() * 100` (`backend/app/services/evaluation.py:455-462`). The `rapidfuzz` library is **not** used or installed. |
| **pgvector & RAG** | **Deferred** | `CREATE EXTENSION IF NOT EXISTS vector` and schema table `resume_embeddings (vector vector(1024))` exist in Postgres migrations, but **no** application code writes or queries embeddings. No RAG pipeline exists. |
| **Docling / GLiNER / BGE-M3** | **Deferred** | Staged/proposed in docs only; not installed or used anywhere in the codebase. |
| **Celery / Redis Worker** | **Optional** | Worker queue is disabled by default (`enable_worker = False`). Synchronous inline processing is the default runtime. `DummyCelery` provides fallback. |
| **Admin & Advanced UI Surfaces** | **Deferred** | Candidate comparison, blind screening, weight simulator, and dedicated admin portals are deferred stretch goals. |
| **Frontend Testing Framework** | **None** | No Jest, Vitest, Testing Library, or Playwright setup exists. Frontend verification relies on `npm run lint`, `npm run build`, and structured manual browser checklists. |

---

## 2. Hard System Invariants

1. **No Autonomous Hiring Decisions:** CareerSync AI is a recruiter decision-support system. It produces deterministic evidence scores, never autonomous "hire/reject" actions or pseudo-probabilities.
2. **Evidence-Grounded Matching:** Skills and qualifications are anchored to verbatim resume spans and character offsets. Zero hallucinated qualifications.
3. **Truthful UI (No Fabricated Fallbacks):** Real user evaluations must never display sample profile data (`sampleParsedResume`) or default guessed scores (`?? 88`, `?? 90`). Missing data must render as unavailable or failed.
4. **Candidate Identity & Resource Privacy:** Recruiter resume uploads cannot overwrite, mutate, or hijack registered candidate profiles. Internal scoring weights are strictly redacted from candidates.
5. **Separation of Diagnostic AI from Authoritative Ranking:** Dense neural embedding similarity in `ai-services` is an exploratory decision-support signal, not an authoritative ranking driver.

---

## 3. Operating Rules for Agents

- **Always verify before editing:** Inspect current `HEAD`, branch, and file contents before proposing modifications.
- **Never claim unverified results:** Do not claim tests or CI passed unless they were executed and returned exit code 0.
- **Branching Discipline:** Never push directly to `main`. Create scoped topic branches and open PRs targeting `main`.
- **Stacking Dependency:** Prompts 2 → 4 → 5 form a stacked PR chain to resolve known baseline CI issues before merging.
