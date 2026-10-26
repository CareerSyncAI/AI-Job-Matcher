# CareerSync AI — Final Demo Evidence Pack (Prompt 10)

> **Branch:** `docs/prompt-10-demo-evidence-pack`
> **Branch commit:** `00aec5dbdbb20155f613724fd8917926ade960d2`
> **Baseline `main` commit:** `63e175c11abbc35a229e5e40b9ccd640fc64c2cf`
> **Prepared:** 2026-10-25
> **Author:** Antigravity AI Agent

> [!IMPORTANT]
> **Verification labels used throughout this document:**
> - 🤖 **AUTOMATED TEST** — result obtained by running the test suite; exit code 0 confirmed.
> - 📋 **AUTOMATED TEST (CI)** — result from GitHub Actions run; linked to the specific run.
> - 👁️ **MANUAL (NOT VERIFIED IN THIS PR)** — step was not manually performed in a fresh browser session during production of this document. Covered by automated integration tests instead.
> - ℹ️ **INFERRED FROM CODE** — claim derived by reading source code, not by executing it.

---

## 0. Executive Summary

| Gate | Result | Verification |
|------|--------|-------------|
| Final commit on `main` | `63e175c` | 📋 GitHub |
| Backend test suite | **98 passed, 5 skipped** | 🤖 Local (`13.29 s`) |
| AI Services test suite | **51 passed** | 🤖 Local (`18.48 s`) |
| Frontend ESLint | **0 errors, 0 warnings** | 🤖 Local |
| Frontend build (production) | **✅ 14 pages, exit code 0** | 🤖 Local (branch commit) |
| Frontend build (CI) | ✅ Passed | 📋 [Run 40186513530](https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513530) |
| Backend CI (Ubuntu + Windows) | ✅ Passed | 📋 [Run 40186513530](https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513530) |
| AI Services CI | ✅ Passed | 📋 [Run 40186513530](https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513530) |
| PostgreSQL + pgvector CI | ✅ Passed | 📋 [Run 40186513530](https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513530) |
| Code Quality | ✅ Passed | 📋 [Run 40186513669](https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513669) |
| Open pull requests (main) | **None** | 📋 GitHub |
| Prompt 10 PR CI | ⏳ Pending — awaiting PR creation and CI run |
| Manual browser demo | 👁️ **NOT VERIFIED IN THIS PR** |

> [!NOTE]
> The CI runs linked above are for `main` at `63e175c` (before the documentation commit). The Prompt 10 PR
> will produce its own CI run. This table will be updated with those results after merge.

---

## 1. Repository and Branch Overview

### 1.1 Prompt Merge History on main

| PR | Branch | Merge Commit | Description |
|----|--------|-------------|-------------|
| #7 | `feat/truthful-resume-studio` | `8467028` | Truthful Resume Studio + launcher robustness |
| #8 | `test/core-recruiter-candidate-journeys` | `24c54e3` | Core recruiter & candidate journey integration tests |
| #9 | `security/prompt-8-residual-review` | `63e175c` | Security review + login rate-limiting regression test |

### 1.2 Prompt 10 Branch

```
Branch:   docs/prompt-10-demo-evidence-pack
Commit:   00aec5dbdbb20155f613724fd8917926ade960d2
Based on: 63e175c (main HEAD at time of branch creation)
Changes:  docs/audits/FINAL_DEMO_EVIDENCE.md (new)
```

### 1.3 Commit Log (most recent on main)

```
63e175c  Merge pull request #9 from CareerSyncAI/security/prompt-8-residual-review
947f558  test(security): add login rate limiting lockout regression test and prompt 8 residual audit report
24c54e3  Merge pull request #8 from CareerSyncAI/test/core-recruiter-candidate-journeys
65c6fbf  test(core): prove recruiter and candidate journeys and add talent upload integration
8467028  Merge pull request #7 from CareerSyncAI/feat/truthful-resume-studio
```

---

## 2. Architecture Truth (per AGENTS.md)

The following table reflects the **actual active implementation** per `AGENTS.md`. Do not treat deferred items as implemented.

| Component | Status | Implementation |
|-----------|--------|----------------|
| Frontend | Active | Next.js 16.4.3, React 19, TypeScript, Tailwind CSS |
| Backend | Active | FastAPI, SQLAlchemy 2.0 async, Pydantic v2 |
| Database | Active | PostgreSQL 16 (CI/production) / SQLite (disposable local tests) |
| PDF Extraction | Active | `pdfplumber` + `pypdf` fallback, max 15-page limit |
| DOCX Extraction | Active | `python-docx`, ZIP-bomb guard |
| Skill Extraction | Active | Canonical taxonomy matching with negative context filtering |
| Authoritative Ranking | Active | **100% deterministic** multi-factor scoring; no hallucinated qualifications |
| Neural Dense Matcher | **Diagnostic only** | `sentence-transformers/all-MiniLM-L6-v2` — does **not** drive recruiter ranking |
| `rapidfuzz_score` | Active (stdlib) | Computed via `difflib.SequenceMatcher` — `rapidfuzz` library NOT installed |
| pgvector / RAG | **Deferred** | Schema migration exists; no application code reads/writes embeddings |
| Celery / Redis Worker | Optional (disabled) | `enable_worker=False` by default; `DummyCelery` fallback |
| Admin / advanced UI | **Deferred** | Candidate comparison, blind screening, weight simulator not implemented |
| Frontend testing | **None** | No Jest/Vitest/Playwright; frontend verified via lint + build + structured manual checklist |

---

## 3. Clean-Environment Setup Instructions

> [!NOTE]
> These instructions describe the intended setup procedure based on reading `AGENTS.md`,
> `docker-compose.yml`, `backend/.env.example`, `frontend/.env.example`, `run_careersync.bat`,
> and `backend/seed.py`. They have **not** been executed in a fresh clone during this PR.
> Label: ℹ️ **INFERRED FROM CODE**

### 3.1 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.11+ | 3.14.2 confirmed on dev machine |
| Node.js / npm | 18+ LTS | Required for Next.js frontend |
| Docker Desktop | Any recent | PostgreSQL + Redis via `docker-compose.yml` |
| Git | Any | For cloning |

### 3.2 Clone

```bash
git clone https://github.com/CareerSyncAI/AI-Job-Matcher.git
cd AI-Job-Matcher
# Expected HEAD: 63e175c (or later after Prompt 10 PR merge)
```

### 3.3 Infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
docker compose ps   # verify both show status "healthy"
```

`docker-compose.yml` at repository root provides:
- `pgvector/pgvector:pg16` on port 5432 (health check: `pg_isready`)
- `redis:7-alpine` on port 6379 (health check: `redis-cli ping`)

### 3.4 Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

# Copy the example and edit — never commit the actual .env
cp .env.example .env
```

**Correct environment variable names** (prefix `CAREERSYNC_`, as defined by `backend/app/core/config.py`):

```dotenv
CAREERSYNC_DATABASE_URL=postgresql+asyncpg://careersync:careersync@localhost:5432/careersync
# Or use SQLite for zero-dependency local testing:
# CAREERSYNC_DATABASE_URL=sqlite:///./careersync.db
CAREERSYNC_REDIS_URL=redis://localhost:6379/0
CAREERSYNC_JWT_SECRET=<generate-at-least-32-random-chars>
CAREERSYNC_AI_SERVICE_URL=http://localhost:8001
CAREERSYNC_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
CAREERSYNC_SECURE_COOKIES=false
CAREERSYNC_ENABLE_WORKER=false
CAREERSYNC_AUTO_SEED_DEMO_DATA=false   # set true to auto-seed demo accounts on first run
```

```bash
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3.5 AI Services Setup

```bash
cd ai-services
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.api.app:app --host 127.0.0.1 --port 8001 --reload
```

### 3.6 Frontend Setup

```bash
cd frontend
npm install

# The only required variable for local development:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
cp .env.example .env.local   # already contains the correct default value

npm run dev    # development server at http://localhost:3000
# npm run build  # production build (also verified locally; see Section 7.3)
```

### 3.7 Demo Accounts

Demo accounts are seeded by `backend/seed.py` when `CAREERSYNC_AUTO_SEED_DEMO_DATA=true`.

> [!WARNING]
> If `CAREERSYNC_AUTO_SEED_DEMO_DATA=false` (default), demo accounts do **not** exist.
> You must either enable seeding or register accounts manually via the `/register` page.

| Role | Email | Password |
|------|-------|----------|
| Recruiter | `recruiter.sarah@careersync.dev` | `Password123456!` |
| Recruiter (tenant 2) | `recruiter.marcus@careersync.dev` | `Password123456!` |
| Candidate | `alice.vance@example.com` | `Password123456!` |
| Candidate | `david.ross@example.com` | `Password123456!` |

All accounts are synthetic, non-PII data defined in `backend/seed.py`.

### 3.8 Windows One-Click Launcher

`run_careersync.bat` (at repository root) automates startup:
1. Auto-detects project directory via four path fallbacks
2. Creates `career-sync-storage/uploads/` if missing
3. Uses `.venv` virtual environments when present
4. Kills stale processes on ports 8000, 8001, 3000
5. Launches AI Services (8001), Backend (8000), Frontend (3000) in separate windows
6. Polls `http://127.0.0.1:8000/docs` for readiness (up to 10 × 2 s)
7. Opens `http://localhost:3000` in the default browser

---

## 4. Service Readiness Verification

| Service | URL | Expected |
|---------|-----|---------|
| Frontend | `http://localhost:3000` | Login page |
| Backend Swagger | `http://127.0.0.1:8000/docs` | FastAPI Swagger UI |
| Backend Health | `http://127.0.0.1:8000/health` | `{"status":"ok"}` |
| AI Microservice | `http://127.0.0.1:8001/docs` | FastAPI Swagger UI |
| PostgreSQL | `docker compose ps` | `healthy` |
| Redis | `docker compose ps` | `healthy` |

> [!NOTE]
> The health endpoint is `/health` (registered directly on the FastAPI app in `backend/app/main.py:92`),
> not `/api/v1/health`.

Database migration verification:

```bash
cd backend
alembic current   # shows current revision
alembic history   # lists all migrations
```

---

## 5. Recruiter Journey Checklist

> 🤖 **AUTOMATED TEST** — The items below correspond to integration tests in
> `backend/tests/test_api.py` and `backend/tests/test_intelligence_layer.py`,
> exercised in PR #8 (commit `65c6fbf`). All 98 backend tests pass.
>
> 👁️ **Manual browser walkthrough: NOT VERIFIED IN THIS PR.**
> The UI was not manually exercised in a fresh browser session during production of this document.
> Frontend verification relies on lint (✅), production build (✅), and the automated backend tests.

### 5.1 Authentication — 🤖 AUTOMATED TEST
- [x] Login → JWT access token + HttpOnly `careersync_refresh` cookie returned
- [x] Unauthenticated requests to protected endpoints → HTTP 401
- [x] Candidate account accessing recruiter-only endpoint → HTTP 403

### 5.2 Job Management — 🤖 AUTOMATED TEST
- [x] Create job posting (`POST /api/v1/jobs/`)
- [x] Retrieve own job list (`GET /api/v1/jobs/`)
- [x] Tenant isolation: accessing other recruiter's jobs → HTTP 403/404

### 5.3 Resume Upload and Ranking — 🤖 AUTOMATED TEST
- [x] PDF upload accepted (≤15 pages, valid magic bytes)
- [x] DOCX upload accepted (valid ZIP structure, no ZIP bomb)
- [x] UUID-based storage key assigned per upload
- [x] Async processing completes within 30 s timeout guardrail
- [x] Scores available: `S_skills`, `S_exp`, `S_edu`, `S_sem`
- [x] Each matched skill includes verbatim evidence (quote + character offset)
- [x] Absent required skills use `not_detected` (Tier 2), not `gap` (Tier 3)

### 5.4 Application Management — 🤖 AUTOMATED TEST
- [x] View applications for a job
- [x] Update application stage
- [x] Add recruiter note

### 5.5 Tenant Isolation — 🤖 AUTOMATED TEST
- [x] `verify_resume_access()` called on every resource fetch
- [x] Cross-tenant access → HTTP 403

### 5.6 UI Walkthrough — 👁️ NOT VERIFIED IN THIS PR
- [ ] Recruiter signs in via browser at `http://localhost:3000`
- [ ] Creates a new job posting through the UI
- [ ] Uploads a PDF and DOCX resume through the UI
- [ ] Inspects ranked scores and skill evidence cards in the browser
- [ ] Updates application stage and adds a note via the UI

---

## 6. Candidate Journey Checklist

> 🤖 **AUTOMATED TEST** — Items below correspond to integration tests in `backend/tests/test_api.py`
> (including `test_prompt_7_candidate_journey_e2e`).
>
> 👁️ **Manual browser walkthrough: NOT VERIFIED IN THIS PR.**

### 6.1 Authentication — 🤖 AUTOMATED TEST
- [x] Candidate login → JWT + refresh cookie
- [x] Recruiter account accessing candidate-only endpoint → HTTP 403

### 6.2 Resume Management — 🤖 AUTOMATED TEST
- [x] Candidate self-upload via `POST /api/v1/resumes/`
- [x] Status transitions: `pending` → `processing` → `processed`
- [x] PDF > 15 pages → HTTP 422 with clear error message
- [x] ZIP bomb DOCX → HTTP 422 with clear error message

### 6.3 Job Discovery and Application — 🤖 AUTOMATED TEST
- [x] Browse open jobs (`GET /api/v1/jobs/?status=open`)
- [x] Apply to job (`POST /api/v1/applications/`)
- [x] Duplicate application → HTTP 409
- [x] View own application status

### 6.4 Role Boundaries — 🤖 AUTOMATED TEST
- [x] Cannot access other candidates' resumes or scores
- [x] Weighted scoring details redacted from candidate API responses
- [x] Cannot update application stages (recruiter-only)
- [x] Cannot view recruiter notes

### 6.5 UI Walkthrough — 👁️ NOT VERIFIED IN THIS PR
- [ ] Candidate registers and logs in via browser
- [ ] Uploads resume through Resume Studio UI
- [ ] Browses and applies to a job through the UI
- [ ] Verifies application status persists across page refreshes

---

## 7. Release Checks

### 7.1 Backend Test Suite — 🤖 AUTOMATED TEST

**Executed:** 2026-10-25, commit `63e175c` (main HEAD)

```
python -m pytest tests/ -q --tb=short
```

```
platform win32 -- Python 3.14.2, pytest-9.0.3, pluggy-1.6.0
collected 103 items

tests\test_ai_service_semantic_integration.py .....             [  4%]
tests\test_api.py .................                             [ 21%]
tests\test_auth.py .......                                      [ 28%]
tests\test_document_security.py ...................             [ 46%]
tests\test_evaluation_freshness.py ..............               [ 60%]
tests\test_intelligence_layer.py .............                  [ 72%]
tests\test_postgres_migrations.py sssss                         [ 77%]  ← skipped (no live DB)
tests\test_scoring.py .......                                   [ 84%]
tests\test_storage_and_privacy.py .............                 [ 97%]
tests\test_upload.py ...                                        [100%]

98 passed, 5 skipped, 4 warnings in 13.29s
```

5 skips = `test_postgres_migrations.py` — require a live PostgreSQL instance. All 5 pass in CI
with the `pgvector/pgvector:pg16` service container.

### 7.2 AI Services Test Suite — 🤖 AUTOMATED TEST

**Executed:** 2026-10-25, commit `63e175c`

```
python -m pytest tests/ -q --tb=short
```

```
platform win32 -- Python 3.14.2, pytest-9.0.3, pluggy-1.6.0
collected 51 items

tests\test_contract_api.py ..............                       [ 27%]
tests\test_document_security.py ............                   [ 50%]
tests\test_experience.py ....                                   [ 58%]
tests\test_parsers.py ..                                        [ 62%]
tests\test_real_parsers.py ..                                   [ 66%]
tests\test_similarity_engine.py ...........                     [ 88%]
tests\test_skills.py ....                                       [ 96%]
tests\test_synthetic_evaluation.py ..                           [100%]

51 passed, 3 warnings in 18.48s
```

### 7.3 Frontend ESLint — 🤖 AUTOMATED TEST

**Executed:** 2026-10-25, commit `63e175c`

```
npm run lint
> eslint
(exit code 0 — no errors or warnings)
```

### 7.4 Frontend Production Build — 🤖 AUTOMATED TEST

**Executed:** 2026-10-25, branch commit `00aec5d` (documentation-only delta from `63e175c`)

```
npm run build
```

```
✓ Generating static pages using 11 workers (14/14) in 370ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /dashboard
├ ○ /dashboard/applications
├ ○ /dashboard/jobs
├ ○ /dashboard/profile
├ ○ /dashboard/recruiter/candidates
├ ○ /dashboard/recruiter/jobs
├ ○ /dashboard/recruiter/pipeline
├ ○ /dashboard/resume
├ ○ /login
└ ○ /register

○  (Static)  prerendered as static content
(exit code 0)
```

### 7.5 CI Pipeline — 📋 AUTOMATED TEST (CI)

**Baseline CI run (main at `63e175c`):**
https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513530

| Job | Status |
|-----|--------|
| Frontend Build | ✅ Passed |
| Backend Tests — Ubuntu | ✅ Passed |
| Backend Tests — Windows | ✅ Passed |
| AI Services Tests | ✅ Passed |
| PostgreSQL + pgvector | ✅ Passed |

**Code Quality:** https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513669 — ✅ Passed

> [!NOTE]
> These CI runs are for the `main` HEAD before the Prompt 10 documentation commit.
> The Prompt 10 PR will trigger its own CI run. Since this PR adds only a Markdown documentation
> file with no production code changes, CI results are expected to match.

---

## 8. Resume Studio (Truthfulness) Verification

> 🤖 **AUTOMATED TEST** for backend behaviour. 👁️ **NOT VERIFIED IN THIS PR** for UI rendering.

### 8.1 Empty State Behaviour — ℹ️ INFERRED FROM CODE
- Commit `9c30e0b` differentiates API fetch errors from a confirmed empty resume state
- Empty state renders an upload CTA, not a blank page (source: `frontend/src/app/dashboard/resume/`)

### 8.2 Error Handling — 🤖 AUTOMATED TEST (backend)
- [x] PDF > 15 pages → `PDFPageLimitExceededError` → HTTP 422
- [x] DOCX ZIP bomb → HTTP 422

### 8.3 Demo Fixture Isolation — ℹ️ INFERRED FROM CODE
- Commit `310007b` removed demo fixtures from production code paths
- `sampleParsedResume` fallback data not served to authenticated users (per AGENTS.md invariant 3)

---

## 9. Security Verification Summary

Full findings: [`SECURITY_AND_QUALITY_REGISTER.md`](SECURITY_AND_QUALITY_REGISTER.md) (Archived: [`PROMPT_8_RESIDUAL_SECURITY_REVIEW.md`](../archive/audits/PROMPT_8_RESIDUAL_SECURITY_REVIEW.md))

| Control | Implementation | Verification |
|---------|----------------|-------------|
| Login rate limiting | HTTP 429 after 5 failures | 🤖 `test_login_rate_limiting_lockout` |
| Password change → session revoke | `revoke_all_user_sessions()` | 🤖 `test_change_password_success_and_invalidation` |
| JWT HttpOnly refresh cookie | `careersync_refresh`, Secure+HttpOnly | 🤖 Auth integration tests |
| PDF page limit | Max 15 pages | 🤖 `test_document_security.py` |
| DOCX ZIP bomb | Entry ≤500, uncompressed ≤30 MB, ratio ≤50:1 | 🤖 `test_document_security.py` |
| Path traversal | `safe_filename()` + UUID key isolation | 🤖 `test_storage_and_privacy.py` |
| Magic-byte validation | File type verified independently of extension | 🤖 `test_document_security.py` |
| IDOR | `verify_resume_access()` / `verify_job_access()` | 🤖 `test_api.py` |
| Tenant isolation | All queries scoped by recruiter/tenant | 🤖 Multiple integration tests |

---

## 10. Documentation and Repository Audit

### 10.1 README.md — ℹ️ INFERRED FROM CODE
- [x] Present at repository root; contains Quick Start, architecture description, CI badge
- [x] No hardcoded secrets or PII

### 10.2 AGENTS.md — ℹ️ INFERRED FROM CODE
- [x] Root AGENTS.md defines architecture truth table and hard system invariants
- [x] Frontend AGENTS.md documents Next.js 15/16 breaking changes and agent constraints
- [x] Invariants include: no autonomous hiring decisions, evidence-grounded matching, truthful UI, candidate identity protection, diagnostic/ranking separation

### 10.3 Audit Documents (`docs/audits/`)

| File | Contents |
|------|----------|
| `SECURITY_AND_QUALITY_REGISTER.md` | Consolidated active security and defect register |
| `archive/audits/CareerSyncAI_Second_Deep_Audit.md` | Comprehensive second-pass audit (archived) |
| `archive/audits/DELTA_AUDIT.md` | Delta audit since baseline (archived) |
| `decisions/ADR-001-embedding-and-ranking-architecture.md` | ADR: dual-engine semantic search |
| `archive/audits/SECURITY_AND_POSTGRES_CI_AUDIT.md` | Infrastructure and security baseline audit (archived) |
| `archive/audits/PROMPT_8_RESIDUAL_SECURITY_REVIEW.md` | Prompt 8 security residual review (archived) |
| `FINAL_DEMO_EVIDENCE.md` | **This document** |

### 10.4 Environment Configuration — ℹ️ INFERRED FROM CODE
- [x] `backend/.env.example` — present; uses `CAREERSYNC_*` prefix variables
- [x] `frontend/.env.example` — present; single variable `NEXT_PUBLIC_API_URL`
- [x] No `.env` files committed to git
- [x] `docker-compose.yml` at root provides PostgreSQL + Redis
- [x] No hardcoded credentials in source code

---

## 11. Viva Examination Q&A

| Question | Answer |
|----------|--------|
| What problem does CareerSync AI solve? | Eliminates hallucinated qualifications and keyword-filter brittleness using verbatim-evidence-anchored deterministic multi-factor scoring |
| How are candidate scores computed? | Weighted sum of `S_skills + S_exp + S_edu + S_sem`; each component grounded to resume text with character offsets |
| What is the semantic similarity engine? | Pluggable dual-engine: deterministic sublinear TF-Cosine baseline; `sentence-transformers/all-MiniLM-L6-v2` dense vectors available as **diagnostic signal only** — does not drive recruiter ranking |
| What does `not_detected` mean? | A required skill absent from the resume is Tier 2 (`not_detected` — uncertain); only confirmed-absent skills use Tier 3 (`gap`) |
| How is hallucination prevented? | Every matched skill has verbatim evidence (quote + character offset); the AI parser anchors all claims to document text |
| What is `rapidfuzz_score`? | Computed via Python stdlib `difflib.SequenceMatcher`; the `rapidfuzz` library is **not** installed |
| What is the status of pgvector/RAG? | **Deferred** — migration schema exists (`resume_embeddings`), but no application code reads or writes embeddings |
| How is IDOR prevented? | `verify_resume_access()` and `verify_job_access()` validate ownership on every resource request |
| What happens after 5 failed logins? | HTTP 429 rate limit returned; regression test `test_login_rate_limiting_lockout` enforces this |
| How many tests pass? | 98 backend + 51 AI services = 149 total locally; 5 PostgreSQL tests pass in CI |
| How do you start the system? | `docker compose up -d` (infrastructure), then `run_careersync.bat` on Windows or manual uvicorn + `npm run dev` |
| What ports are used? | 3000 (frontend), 8000 (backend), 8001 (AI services), 5432 (PostgreSQL), 6379 (Redis) |
| Is there a frontend test suite? | **No** — no Jest/Vitest/Playwright exists; frontend is verified via ESLint, production build, and structured manual checklist |

---

## 12. Prompt Implementation Summary

| Prompt | Feature | PR | Merge Commit | CI |
|--------|---------|-----|-------------|-----|
| 6 | Truthful Resume Studio + launcher improvements | #7 | `8467028` | ✅ All 5 jobs |
| 7 | Core recruiter & candidate journey tests | #8 | `24c54e3` | ✅ All 5 jobs |
| 8 | Security residual review + rate-limit regression | #9 | `63e175c` | ✅ All 5 jobs |
| 10 | Final evidence pack (this document) | PR TBD | — | ⏳ Pending PR |

---

## 13. Known Limitations

| Item | Status | Explanation |
|------|--------|-------------|
| 5 PostgreSQL test skips (local) | Expected | All pass in CI with live pgvector container |
| `HTTP_422_UNPROCESSABLE_ENTITY` deprecation warnings | Non-blocking | FastAPI cosmetic rename; no functional impact |
| DOCX duplicate-name ZIP warning in tests | Expected | Test intentionally crafts malformed DOCX to verify rejection |
| Manual browser demo not performed | Acknowledged | UI verified via lint + build + automated backend integration tests |
| pgvector / RAG pipeline | Deferred | Schema exists; no application code uses it |
| Neural dense matcher | Diagnostic only | Not a ranking driver; does not affect authoritative recruiter scores |
| Prompt 9 (optional AI features) | Not implemented | Excluded from scope per explicit user directive |

---

*All automated test results obtained on the local development machine (Windows, Python 3.14.2)
against commits `63e175c` (main) and `00aec5d` (Prompt 10 branch).
No real credentials, PII, or secrets are included in this document.*
