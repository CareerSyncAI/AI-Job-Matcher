# CareerSync AI — Technical Stack Reference

**Document version:** 1.0
**Last reviewed:** August 12, 2026
**Companion documents:** `careersync-ai-master-context.md` (v5.5, decision authority), `careersync-ai-prd.md`, `careersync-ai-frontend-design-plan.md`

---

## 0. Purpose & How to Use This Document

This document is the **single place to look up what technology CareerSync AI uses, at every layer**, split out from the master context document so it can be scanned quickly and kept current without touching product/requirements content.

Status tags carry the same meaning as in `careersync-ai-master-context.md` — **treat the tag as binding, not the confidence of the surrounding prose**:

- ✅ **CONFIRMED** — explicitly agreed by the team.
- 🟢 **IMPLEMENTED** — verified present in the repository as of the stated date. Re-verify before trusting; code changes make this stale immediately.
- 🔵 **PLANNED** — an agreed direction, not necessarily built yet.
- 🟡 **PROPOSED** — a sane default recommended in this document. Not yet a team decision.
- 🟠 **OPEN / CONFLICT** — requires a human decision before an agent should build against it, or the document and the repository currently disagree.
- ⚪ **OUT OF SCOPE** — intentionally not being built this semester.

If this document and `careersync-ai-master-context.md` disagree, the master context document wins (it sits higher in the source-of-truth hierarchy). Report the disagreement instead of silently editing either.

---

## 1. Version Pin Summary

Quick-reference table. Full detail for each item is in the sections below.

| Layer | Technology | Version | Status |
| :--- | :--- | :--- | :--- |
| Frontend framework | Next.js | **Conflict — see §2.1** | 🟠 OPEN / CONFLICT |
| Frontend runtime | React | 19.x | 🟢 IMPLEMENTED |
| Frontend language | TypeScript | ^5 | 🟢 IMPLEMENTED |
| Styling | Tailwind CSS | v4 | 🟢 IMPLEMENTED |
| State management | React Context | — | 🟢 IMPLEMENTED (see §2.3) |
| Backend framework | FastAPI | — | ✅ CONFIRMED, not yet built |
| Backend validation | Pydantic | v2 | ✅ CONFIRMED, not yet built |
| Database | PostgreSQL | — | ✅ CONFIRMED, not yet built |
| ORM | SQLAlchemy | 2.0 | ✅ CONFIRMED, not yet built |
| Migrations | Alembic | — | ✅ CONFIRMED, not yet built |
| Vector storage | pgvector | — | ✅ CONFIRMED, not yet built |
| Document parsing | Docling | — | 🟡 PROPOSED, not yet built |
| Entity/skill extraction | GLiNER | — | 🟡 PROPOSED, not yet built |
| Semantic embeddings | BGE-M3 | — | 🟡 PROPOSED, not yet built |
| Fuzzy matching | RapidFuzz | — | 🟡 PROPOSED, not yet built |
| AI runtime | Python | 3.11 | 🟡 PROPOSED |
| Async task processing | Celery | — | 🟠 OPEN (see §4.3) |

---

## 2. Frontend Stack

### 2.1 Framework & Runtime 🟠 OPEN / CONFLICT

- **Documented decision (`careersync-ai-master-context.md` §16):** Next.js **15.5.x** (App Router), with an explicit strict rule: *"Do not automatically upgrade to Next.js 16.x or newer without an explicit team decision."*
- **Actual repository state (`frontend2/package.json`):** Next.js **16.3.0**, `eslint-config-next` 16.3.0.
- **This is a live contradiction.** Someone (human or AI agent) upgraded the framework without recording the decision. Two ways to resolve it — pick one and update both this doc and the master context together:
  1. **Roll back** `frontend2` to Next.js 15.5.x to match the recorded decision, or
  2. **Ratify 16.x** as the new CONFIRMED version, and update `careersync-ai-master-context.md` §16 to match reality.
- React: **19.2.8**, React DOM: **19.2.8** 🟢 IMPLEMENTED — no conflict here, both docs agree on React 19.

### 2.2 Language & Type Safety 🟢 IMPLEMENTED
- TypeScript `^5`, `@types/react` `^19`, `@types/react-dom` `^19`, `@types/node` `^20`.
- Non-functional target (per master context §18): clean `npx tsc --noEmit` with 0 errors across all routes before any phase sign-off.

### 2.3 Styling & Design Tokens 🟢 IMPLEMENTED
- **Tailwind CSS v4** (`@tailwindcss/postcss ^4`) combined with hand-written CSS design tokens in `src/app/globals.css` (dual system — not pure utility classes).
- Design direction per master context §20: "Carbon/Obsidian" analytical dark theme (`#030509`, `#0A0D14`, `#0E1424`), glassmorphism used sparingly and functionally, not decoratively.
- Utility helpers: `clsx ^2.1.1`, `tailwind-merge ^3.6.0`.

### 2.4 State Management 🟠 OPEN / CONFLICT
- **Documented decision (`careersync-ai-master-context.md` §16):** Zustand, referenced as a single `app-store.ts`.
- **Actual repository state:** `zustand ^5.0.14` is listed in `package.json` but is **not imported anywhere in the codebase**. State is currently 100% **React Context** (`RecruiterContext.tsx`, `ApplicantContext.tsx`, `ThemeContext.tsx`).
- Decision needed: either wire up Zustand and migrate context state into it, or drop it from `package.json` and formally document React Context as the chosen pattern.

### 2.5 Animation, Icons, Data Viz 🟢 IMPLEMENTED
- **Animation:** Framer Motion (`^13.0.0`), with centralized tokens in `src/lib/motion/tokens.ts` and reusable primitives in `src/components/motion/MotionPrimitives.tsx`. `prefers-reduced-motion` is respected.
- **Icons:** Lucide React (`^1.30.0`).
- **Charts:** Recharts (`^3.10.1`) — used for candidate distribution, skill radar, match analytics per the project overview doc.

### 2.6 HTTP / Data Layer 🟢 IMPLEMENTED (mock only)
- **HTTP client:** Axios (`^1.19.0`), wired through `src/lib/services/api.ts` — currently a thin wrapper with no live backend behind it.
- **Mock data service:** `src/lib/services/mock.ts` (~800 lines) is the de facto database right now, persisted via `sessionStorage` per the AI changelog. This is a placeholder, not a real service layer — see PRD for what it must be replaced with.
- **Client-side scoring:** `src/lib/services/matchingEngine.ts` recomputes a weighted score client-side. This is intentional and matches the spec's "Safe What-If Preview / Tactile Rubric Equalizer" (master context §6.9) — it must stay presentation-only simulation and never be treated as the authoritative scorer once a real backend exists.

### 2.7 Frontend Tooling 🟢 IMPLEMENTED / 🟡 PROPOSED gaps
- **Linting:** ESLint `^9` with `eslint-config-next`. 🟢 IMPLEMENTED
- **Formatting:** No Prettier config found in the archive. 🟡 PROPOSED — add `prettier` + `eslint-config-prettier` and a `.prettierrc` so formatting isn't left to each editor's defaults.
- **Testing:** No frontend test setup exists (no Jest, Vitest, or Testing Library in `package.json`). 🟡 PROPOSED — Vitest + React Testing Library for component/unit tests, Playwright for the recruiter and applicant end-to-end demo flows. Given the two-person team and academic timeline, a small number of high-value E2E tests (job creation → upload → leaderboard → inspector) will pay off more than broad unit coverage.
- **Package manager:** npm (`package-lock.json` present). No stated reason to change this.

---

## 3. Backend Stack

**Status note:** nothing in `backend/` exists yet beyond a `.gitkeep`. Everything in this section is the *agreed target*, not yet built. Treat version numbers as intent, and re-pin to actual latest-stable at the time backend work starts.

### 3.1 Framework ✅ CONFIRMED (per master context §13, §16)
- **FastAPI** — async Python web framework, chosen for native async support (useful for I/O-bound parsing/embedding calls) and automatic OpenAPI schema generation, which doubles as living API documentation for a two-person team.
- **Pydantic v2** for request/response validation and settings management.

> **Note on documentation drift:** `README.md` and the entire `docs/` folder (dated Aug 2) still describe **Node.js/Express** as the backend framework. That is superseded by the FastAPI decision in the master context document (Aug 9) but has not been corrected in `docs/`. Anyone reading `docs/DECISIONS.md` or `docs/TASKS.md` cold will get the wrong stack. This should be fixed as part of doc cleanup (see PRD, Known Risks).

### 3.2 Language & Runtime 🟡 PROPOSED
- Python **3.11**, as stated in master context §13. No lockfile or dependency manager (Poetry / uv / pip-tools) has been chosen yet. 🟠 OPEN — recommend `uv` or `poetry` over bare `pip freeze` for reproducibility across Hit's and Dhruv's machines, especially with GPU-dependent packages in the mix.

### 3.3 API Style ✅ CONFIRMED
- REST over HTTP/JSON, matching the frontend's `api.ts` Axios-based service layer and the documented route table. No GraphQL, no gRPC — appropriate for the project's scope.

### 3.4 Authentication & Authorization 🟠 OPEN
- Not specified anywhere in the current documents beyond the access-control *policy* (master context §17A: recruiters scoped to their own jobs/applications, candidates scoped to their own profile). No mechanism (JWT, session cookies, OAuth) is chosen.
- 🟡 PROPOSED default: JWT-based auth (access + refresh token pair), issued by FastAPI, verified via a dependency. Simple, stateless, and standard for a REST API consumed by a Next.js SPA-style frontend. Two roles to start: `recruiter`, `applicant`.

### 3.5 Backend Testing 🟡 PROPOSED
- `pytest` + `httpx`'s `AsyncClient` for API route tests.
- `pytest-asyncio` for the async pipeline code.
- No target coverage number has been set — the project's own "Definition of Done" (master context §23) doesn't mandate a coverage threshold, only that core workflows and explainability guarantees are demonstrably correct. Recommend testing the scoring/ranking math (§15 of master context) most heavily, since that logic is the product's actual differentiator and the easiest place for silent regressions.

---

## 4. AI / NLP Pipeline

This is the most architecturally significant — and least implemented — part of the stack. All of it is currently 🟡 PROPOSED or 🔵 PLANNED at the document level and 🔴 not started in the repository.

### 4.1 Pipeline Shape (per master context §13)

```
Resume file (PDF/DOCX)
   → Parser Engine: Docling            (layout-preserving markdown extraction)
   → Extractor: GLiNER                 (zero-shot neural entity & skill extraction)
   → Fuzzy Matcher: RapidFuzz           (fuzzy token matching against required skills)
   → Semantic Embedding: BGE-M3         (hybrid dense+sparse embeddings, cosine similarity)
   → Deterministic scoring & ranking    (Python, not AI — see master context §15)
```

### 4.2 Component Detail

| Stage | Tool | Status | Notes |
| :--- | :--- | :--- | :--- |
| PDF/DOCX parsing | **Docling** | 🟡 PROPOSED | Chosen for layout-preserving extraction (tables, sections) over raw text dumps. |
| Fallback parser (Docling failure) | Not specified | 🟠 OPEN | Prior planning referenced pdfplumber/PyMuPDF as a fallback; needs to be re-confirmed against the Docling-based pipeline and recorded explicitly — `Resume.parserMethod` in the data contract already has a `"fallback"` value waiting for this. |
| Scanned/image-only PDFs | Not specified | 🟠 OPEN | The data contract already has `needsAttentionReason: "scanned_document"` (master context §17), but no OCR engine is named. Docling has pluggable OCR backends (e.g., EasyOCR, Tesseract) — 🟡 PROPOSED: use Docling's built-in OCR path rather than adding a separate OCR dependency, to keep the pipeline surface small. |
| Skill/entity extraction | **GLiNER** | 🟡 PROPOSED | Zero-shot NER — avoids the fragile fixed-dictionary skill extraction that was flagged as a structural gap in earlier ChatGPT-authored plans. |
| Fuzzy skill matching | **RapidFuzz** | 🟡 PROPOSED | Handles surface-level variance (e.g., "JS" vs "JavaScript") without invoking the embedding model. |
| Semantic similarity | **BGE-M3** | 🟡 PROPOSED | Hybrid dense+sparse embeddings; per master context §15, this is a *secondary* signal for contextual alignment and must not double-count explicit skill matches. |
| Vector storage | **pgvector** (PostgreSQL extension) | ✅ CONFIRMED | Keeps embeddings co-located with relational data instead of a separate vector DB — reasonable for this project's scale. |

### 4.3 Async Processing / Task Queue 🟠 OPEN

- Master context §13 names **Celery Workers** for the AI/NLP microservice, but this is inside a section explicitly tagged 🟡 PROPOSED, not confirmed.
- Celery needs a broker (typically Redis or RabbitMQ) — none has been chosen, and no broker is mentioned anywhere else in the documents.
- 🟡 PROPOSED alternative worth weighing before committing: for a two-person academic project with batches of 25–50 resumes (master context §18), a full Celery + Redis deployment may be more infrastructure than needed. A lighter option — FastAPI `BackgroundTasks` for smaller batches, or `arq` (Redis-backed but much smaller footprint than Celery) — would cut setup and deployment complexity substantially. This is a genuine open decision, not a default to silently take.

### 4.4 Model Provenance & Reproducibility ✅ CONFIRMED
- Per master context §14A: every `MatchResult` must log the specific parser, extractor, embedding model, and scoring formula versions used to produce it, so evaluation runs are reproducible.

### 4.5 Compute Environment ✅ CONFIRMED
- Development hardware: **RTX 3050** and **RTX 2050** laptop GPUs, plus free-tier cloud compute for anything that exceeds local VRAM.
- This constraint is *why* GLiNER and BGE-M3 were chosen over larger models — both are small enough to run on consumer laptop GPUs.
- 🟠 OPEN: which specific free-tier cloud service (Google Colab, Kaggle Notebooks, HF Spaces, etc.) is not named anywhere. Worth deciding before the team is mid-pipeline and blocked by a VRAM ceiling.

### 4.6 Benchmark & Evaluation 🔵 PLANNED
- Per master context §14: an annotated benchmark of synthetic/non-PII resumes and job descriptions, evaluated with NDCG@K / Precision@K for ranking quality and precision/recall for entity extraction. No dataset exists yet; this needs to be built before any claim of "the AI works well" can be substantiated for the demo or defense.

---

## 5. Database & Storage

### 5.1 Primary Database ✅ CONFIRMED
- **PostgreSQL**, with **SQLAlchemy 2.0** as the ORM and **Alembic** for migrations.
- This directly supersedes the earlier MongoDB decision recorded in `docs/DECISIONS.md` (Aug 2) — that document has not been updated to reflect the change and should be treated as stale (see §3.1 note above).

### 5.2 Vector Extension ✅ CONFIRMED
- **pgvector**, for storing and querying BGE-M3 embeddings alongside relational data.
- Access-scoping rule (master context §17): stored embeddings must inherit the same authorization scope as their source resume/application and must never be directly exposed through unauthorized API responses.

### 5.3 File Storage 🟠 OPEN
- Resume files (PDF/DOCX, up to 10MB per master context §18) need a storage location. Not specified anywhere.
- 🟡 PROPOSED: local filesystem storage outside any web-servable or executable directory for the academic prototype (simplest, no extra service to run), with filenames sanitized and MIME-type strictly validated per the existing security rule (master context §17). If cloud storage is wanted for portability between Hit's and Dhruv's machines, a self-hosted MinIO (S3-compatible) container is a reasonable low-cost upgrade path later — but this is not needed to hit the Tier 1 demo goal.

### 5.4 Caching 🟠 OPEN
- No caching layer is specified. If Celery + Redis is adopted (§4.3), Redis can double as both the task broker and a cache for repeated read-heavy views (e.g., candidate leaderboard). If the lighter `arq`/`BackgroundTasks` route is taken instead, caching can likely be skipped entirely at this scale — 25–50 resumes per batch does not need a caching layer to stay responsive.

---

## 6. DevOps, Environments & Supporting Tooling

Nothing in this section is documented anywhere yet — all of it is 🟡 PROPOSED, sized deliberately for a two-person academic team rather than an enterprise deployment.

### 6.1 Version Control ✅ CONFIRMED
- Git + GitHub, repository `AI-Job-Matcher`, active branch `develop`, with `feature/*` branches for in-progress work (seen in practice: `feature/recruiter-workflow`). No branch protection rules or PR review process is documented — worth a short paragraph in `docs/GIT_WORKFLOW.md` once that file is reviewed for accuracy.

### 6.2 Environment Configuration 🟡 PROPOSED
- `.env` files (via `python-dotenv` on the backend, Next.js's built-in `.env.local` support on the frontend) for secrets and per-environment config (DB URL, model paths, JWT secret). No secrets should ever be committed — add `.env*` to `.gitignore` if not already present.

### 6.3 CI 🟡 PROPOSED
- A minimal GitHub Actions workflow: `npx tsc --noEmit` + ESLint on the frontend, `pytest` + a lint pass (`ruff`) on the backend, triggered on PRs into `develop`. This is enough to catch the kind of drift already found in this repo (broken redirects, missing pages) before it merges, without needing a heavier CI setup.

### 6.4 Containerization 🟡 PROPOSED / optional
- Docker Compose for local Postgres + backend is a reasonable convenience so both developers run identical environments, **but** GPU access inside containers (nvidia-docker / WSL2 GPU passthrough) adds real setup friction on laptop hardware. 🟠 OPEN: recommend running the AI/NLP service natively (direct GPU access) and only containerizing Postgres, with the backend optionally containerized once GPU passthrough is confirmed working on both Hit's and Dhruv's machines.

### 6.5 Deployment Target 🟠 OPEN
- Not decided. For an academic demo, two realistic paths:
  1. **Fully local demo** — run everything (frontend, backend, Postgres, AI pipeline) on the presenting laptop. Zero cloud dependency, zero risk of a free-tier service being asleep/cold during a defense.
  2. **Split cloud hosting** — Next.js frontend on Vercel, FastAPI backend + Postgres on a free/low-cost host (Render, Railway, Fly.io), with the GPU-dependent AI pipeline either running locally and exposed via a tunnel, or precomputed for the demo dataset.
- Given the GPU dependency, option 1 is lower-risk for a live defense; option 2 is more impressive as "a deployed product" if time allows. This should be an explicit team decision, not something an AI agent infers midway through implementation.

### 6.6 Development Tools & Supporting Applications 🟡 PROPOSED (informal, not mandated)
- **Editor:** VS Code (implied by existing `AGENTS.md`/`CLAUDE.md` files inside `frontend2/`, which are editor/agent-config artifacts).
- **API testing:** Postman, Insomnia, or VS Code's Thunder Client / the auto-generated FastAPI `/docs` (Swagger UI) — FastAPI's built-in docs likely cover most needs without adding another tool.
- **Diagramming:** Mermaid (renders directly in Markdown/GitHub) is a good fit given the whole project already lives in Markdown docs — no need for a separate diagramming app.
- **AI coding assistants used across sessions:** ChatGPT, Antigravity, Claude (per project history) — informational only, not a technology decision.

---

## 7. Security & Privacy Baseline

Carried forward from master context §17 / §17A since these are binding regardless of which specific libraries implement them:

- ✅ No PII in route parameters — opaque IDs only.
- ✅ Every blind-screening identity reveal logs a `identity_revealed` Decision Trail event.
- ✅ Upload pipeline must validate MIME types strictly, sanitize filenames, enforce max file size (10MB), store outside executable directories, and prevent direct execution of uploaded files.
- ✅ Recruiters can only access their own scoped jobs/applications; candidates (if implemented) only their own profile.
- ✅ Embeddings in pgvector inherit the authorization scope of their source document.

---

## 8. Known Conflicts Requiring a Decision (Summary)

Pulled together here so nothing gets lost — each one is detailed in its section above:

1. **Next.js 15.5.x (documented) vs 16.3.0 (installed)** — §2.1
2. **Zustand (documented) vs React Context (actually used)** — §2.4
3. **`docs/` folder still describes MongoDB + Node/Express**, superseded by the FastAPI + PostgreSQL decision — §3.1, §5.1
4. **Celery + broker choice unconfirmed**, and may be heavier than this project needs — §4.3
5. **No fallback parser, OCR engine, file storage, auth mechanism, or deployment target chosen** — §4.2, §5.3, §3.4, §6.5

None of these block writing requirements or starting frontend polish work, but all five should be resolved before backend implementation begins in earnest.
