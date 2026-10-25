# CareerSync AI — Final Demo Evidence Pack (Prompt 10)

> **Branch:** `docs/prompt-10-demo-evidence-pack`
> **Prepared:** 2026-10-25
> **Author:** Antigravity AI Agent (automated + human-verified)

---

## 0. Executive Summary

| Gate | Result |
|------|--------|
| Starting commit (Prompt 1 baseline) | `feature/backend-foundation` merged; initial commit |
| Final commit on `main` | `63e175c` — Merge PR #9 (Prompt 8 security review) |
| Backend test suite | ✅ **98 passed, 5 skipped** (PostgreSQL skips expected without live DB) |
| AI Services test suite | ✅ **51 passed** |
| Frontend ESLint | ✅ **0 errors, 0 warnings** |
| Frontend build (CI) | ✅ Passed (GitHub Actions) |
| PostgreSQL + pgvector (CI) | ✅ Passed (GitHub Actions) |
| Open pull requests | **None** — all work merged to `main` |
| Security audit | ✅ Complete (Prompt 8, PR #9) |

---

## 1. Repository and Branch Overview

### 1.1 Starting Commit Reference

The project baseline was established from the `feature/backend-foundation` branch. The `main` branch subsequently accumulated the following Prompt-driven merge commits:

| PR | Branch | Commit | Description |
|----|--------|--------|-------------|
| #7 | `feat/truthful-resume-studio` | `8467028` | Truthful Resume Studio + launcher robustness |
| #8 | `test/core-recruiter-candidate-journeys` | `24c54e3` | Core recruiter & candidate journey integration tests |
| #9 | `security/prompt-8-residual-review` | `63e175c` | Security review, login rate-limiting regression test |

### 1.2 Final Commit on main

```
63e175c  Merge pull request #9 from CareerSyncAI/security/prompt-8-residual-review
947f558  test(security): add login rate limiting lockout regression test and prompt 8 residual audit report
24c54e3  Merge pull request #8 from CareerSyncAI/test/core-recruiter-candidate-journeys
65c6fbf  test(core): prove recruiter and candidate journeys and add talent upload integration
8467028  Merge pull request #7 from CareerSyncAI/feat/truthful-resume-studio
121b9db  fix(tooling): make run_careersync.bat robust with directory flags, quote safety, and readiness polling
9c30e0b  fix(frontend): differentiate resume-fetch API errors from confirmed empty state
310007b  feat(frontend): make Resume Studio truthful and isolate demo fixtures
```

---

## 2. Clean-Environment Setup Instructions

### 2.1 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.11+ | 3.14.2 confirmed on dev machine |
| Node.js / npm | 18+ LTS | Required for Next.js frontend |
| Docker Desktop | Any recent | For PostgreSQL + Redis via docker-compose |
| Git | Any | For cloning |

### 2.2 Repository Clone

```bash
git clone https://github.com/CareerSyncAI/AI-Job-Matcher.git
cd AI-Job-Matcher
git checkout main
```

Expected HEAD after clone: `63e175c`

### 2.3 Infrastructure (PostgreSQL + Redis)

```bash
# Starts pgvector/pgvector:pg16 on port 5432 and Redis 7 on port 6379
docker compose up -d

# Verify both containers are healthy
docker compose ps
```

Both containers define health checks (pg_isready / redis-cli ping, 5 s intervals, 10 retries).

### 2.4 Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# DATABASE_URL=postgresql+asyncpg://careersync:careersync@localhost:5432/careersync
# REDIS_URL=redis://localhost:6379/0
# SECRET_KEY=<any-32+-char-random-string>
# AI_SERVICE_URL=http://127.0.0.1:8001

alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2.5 AI Services Setup

```bash
cd ai-services
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.api.app:app --host 127.0.0.1 --port 8001 --reload
```

### 2.6 Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm run dev
# Available at http://localhost:3000
```

### 2.7 Windows One-Click Launcher

`run_careersync.bat` automates the full startup:
1. Auto-detects project directory (relative + absolute fallbacks)
2. Creates `career-sync-storage/uploads/` if missing
3. Detects `.venv` virtual environments for backend and AI services
4. Kills stale processes on ports 8000, 8001, 3000
5. Launches all three services in separate terminal windows
6. Polls backend readiness up to 10 attempts
7. Opens `http://localhost:3000` in the default browser

**Demo credentials (synthetic, non-PII):**

| Role | Email | Password |
|------|-------|----------|
| Recruiter | `recruiter.sarah@careersync.dev` | `Password123456!` |
| Candidate | `david.ross@example.com` | `Password123456!` |

---

## 3. Service Readiness Verification

| Service | URL | Expected |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Login page |
| Backend Docs | http://127.0.0.1:8000/docs | Swagger UI |
| Backend Health | http://127.0.0.1:8000/api/v1/health | `{"status":"ok"}` |
| AI Microservice | http://127.0.0.1:8001/docs | Swagger UI |
| PostgreSQL | `docker compose ps` | `healthy` |
| Redis | `docker compose ps` | `healthy` |

---

## 4. Recruiter Journey Checklist

Exercised by integration tests in PR #8 (`test/core-recruiter-candidate-journeys`, commit `65c6fbf`).

### 4.1 Authentication
- [x] Login → JWT access token + HttpOnly `careersync_refresh` cookie
- [x] Unauthenticated requests → HTTP 401
- [x] Candidate account accessing recruiter endpoint → HTTP 403

### 4.2 Job Management
- [x] Create job posting (`POST /api/v1/jobs/`)
- [x] List own jobs (`GET /api/v1/jobs/`)
- [x] Tenant isolation: other recruiter's jobs → HTTP 403/404

### 4.3 Resume Upload and Ranking
- [x] PDF upload (≤15 pages, valid magic bytes)
- [x] DOCX upload (valid ZIP, no ZIP bomb)
- [x] UUID-based storage key assigned per upload
- [x] Async processing completes within 30 s timeout
- [x] Scores: `S_skills`, `S_exp`, `S_edu`, `S_sem` available
- [x] Each matched skill has verbatim evidence (quote + character offset)
- [x] Unconfirmed gaps use `not_detected` (Tier 2), not `gap` (Tier 3)

### 4.4 Application Management
- [x] View applications for a job
- [x] Update application stage
- [x] Add recruiter note

### 4.5 Tenant Isolation
- [x] IDOR guard: `verify_resume_access()` enforced on every resource request
- [x] Cross-tenant access → HTTP 403

---

## 5. Candidate Journey Checklist

### 5.1 Authentication
- [x] Candidate login → JWT + refresh cookie
- [x] Recruiter accessing candidate endpoint → HTTP 403

### 5.2 Resume Management
- [x] Self-upload via Resume Studio
- [x] Status: `pending` → `processing` → `processed`
- [x] Oversized PDF → HTTP 422 with clear message
- [x] ZIP bomb DOCX → HTTP 422 with clear message

### 5.3 Job Discovery and Application
- [x] Browse open jobs (`GET /api/v1/jobs/?status=open`)
- [x] Apply to job (`POST /api/v1/applications/`)
- [x] Duplicate application → HTTP 409
- [x] View own application status

### 5.4 Role Boundaries
- [x] Cannot view other candidates' resumes/scores
- [x] Weighted scores redacted from candidate API responses
- [x] Cannot update application stages
- [x] Cannot view recruiter notes

---

## 6. Resume Studio (Truthfulness) Verification

### 6.1 Empty States
- [x] No resume → explicit "No resume yet" empty state (not blank/spinner)
- [x] Upload CTA displayed in empty state

### 6.2 Error Handling
- [x] API fetch error distinguished from confirmed empty state (commit `9c30e0b`)
- [x] Processing failures render error UI without crashing

### 6.3 ATS Analysis
- [x] Skills only shown for processed resumes
- [x] Verbatim evidence anchor on each skill
- [x] Scores deterministic (same resume → same score)
- [x] `not_detected` for absent required skills

### 6.4 Demo Preview Isolation
- [x] Demo fixtures removed from production code paths (commit `310007b`)
- [x] Authenticated users never see hardcoded demo data
- [x] `NEXT_PUBLIC_DEMO_MODE` defaults `false` in production

---

## 7. Release Checks (Local Execution — 2026-10-25, commit `63e175c`)

### 7.1 Backend Tests

```
python -m pytest tests/ -q --tb=short
...
98 passed, 5 skipped, 4 warnings in 13.29s
```

5 skips = `test_postgres_migrations.py` (require live PostgreSQL; all pass in CI).

### 7.2 AI Services Tests

```
python -m pytest tests/ -q --tb=short
...
51 passed, 3 warnings in 18.48s
```

### 7.3 Frontend ESLint

```
npm run lint
> eslint
(exit code 0 — no errors or warnings)
```

### 7.4 CI Pipeline (GitHub Actions — post-merge main)

**Workflow run:** https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513530

| Job | Status |
|-----|--------|
| Frontend Build | ✅ Passed |
| Backend Tests — Ubuntu | ✅ Passed |
| Backend Tests — Windows | ✅ Passed |
| AI Services Tests | ✅ Passed |
| PostgreSQL + pgvector | ✅ Passed |

**Code Quality:** https://github.com/CareerSyncAI/AI-Job-Matcher/actions/runs/40186513669 — ✅ Passed

---

## 8. Security Verification Summary

Full findings in [`PROMPT_8_RESIDUAL_SECURITY_REVIEW.md`](PROMPT_8_RESIDUAL_SECURITY_REVIEW.md).

| Control | Implementation | Test |
|---------|----------------|------|
| Login rate limiting | HTTP 429 after 5 failures | `test_login_rate_limiting_lockout` |
| Password change → session revoke | `revoke_all_user_sessions()` | `test_change_password_success_and_invalidation` |
| JWT HttpOnly refresh cookie | `careersync_refresh`, Secure+HttpOnly | Auth integration tests |
| PDF page limit | Max 15 pages, `PDFPageLimitExceededError` | `test_document_security.py` |
| DOCX ZIP bomb | Entry ≤500, uncompressed ≤30 MB, ratio ≤50:1 | `test_document_security.py` |
| Path traversal | `safe_filename()` + UUID key isolation | `test_storage_and_privacy.py` |
| Magic-byte validation | Type verified independently of extension | `test_document_security.py` |
| IDOR | `verify_resume_access()` / `verify_job_access()` | `test_api.py` |
| Tenant isolation | All queries scoped by recruiter/tenant | Multiple integration tests |

---

## 9. Documentation and Repository Audit

### 9.1 README.md
- [x] Present at root; Quick Start, architecture, CI badge
- [x] No hardcoded secrets or PII

### 9.2 AGENTS.md
- [x] Root + frontend-specific agent rules present
- [x] Next.js 15/16 breaking changes documented

### 9.3 Audit Documents (`docs/audits/`)

| File | Contents |
|------|----------|
| `CareerSyncAI_Second_Deep_Audit.md` | Comprehensive second-pass audit |
| `DELTA_AUDIT.md` | Delta audit since baseline |
| `EMBEDDING_AND_RANKING_DECISION.md` | ADR for dual-engine semantic search |
| `SECURITY_AND_POSTGRES_CI_AUDIT.md` | Infrastructure and security baseline |
| `PROMPT_8_RESIDUAL_SECURITY_REVIEW.md` | Prompt 8 security residual evidence |
| `FINAL_DEMO_EVIDENCE.md` | **This document** |

### 9.4 Environment Configuration
- [x] `.env.example` in `backend/` and `frontend/`
- [x] No `.env` committed to git
- [x] `docker-compose.yml` at root (PostgreSQL + Redis)
- [x] No hardcoded credentials in source code

---

## 10. Viva Examination Checklist

| Question | Answer |
|----------|--------|
| What problem does CareerSync AI solve? | Eliminates hallucinated qualifications and keyword-filter brittleness using verbatim-evidence-anchored deterministic scoring |
| How are scores computed? | `S_skills + S_exp + S_edu + S_sem`, each grounded to resume text with character offsets |
| What is the semantic engine? | Pluggable dual-engine: TF-Cosine baseline + `sentence-transformers/all-MiniLM-L6-v2` dense vectors with fallback |
| What is `not_detected`? | Tier 2 — skill absent from resume (uncertain), not Tier 3 `gap` (confirmed absent) |
| How is hallucination prevented? | Every matched skill has verbatim evidence (quote + offset); AI parser anchors all claims |
| How is IDOR prevented? | `verify_resume_access()` / `verify_job_access()` on every resource request |
| What happens after 5 failed logins? | HTTP 429; regression test `test_login_rate_limiting_lockout` enforces this |
| How many tests pass? | 98 backend + 51 AI services = 149 total; 5 PostgreSQL tests pass in CI |
| How do you start the system? | `docker compose up -d` then `run_careersync.bat` (Windows) |
| What ports are used? | 3000 (frontend), 8000 (backend), 8001 (AI services), 5432 (PostgreSQL), 6379 (Redis) |

---

## 11. Prompt Implementation Summary

| Prompt | Feature | PR | Merge Commit | CI |
|--------|---------|-----|-------------|-----|
| 6 | Truthful Resume Studio + launcher improvements | #7 | `8467028` | ✅ |
| 7 | Core recruiter & candidate journey tests | #8 | `24c54e3` | ✅ |
| 8 | Security residual review + rate-limit regression | #9 | `63e175c` | ✅ |
| 10 | Final evidence pack (this document) | PR TBD | — | ✅ local |

---

## 12. Known Limitations and Non-Issues

| Item | Status | Explanation |
|------|--------|-------------|
| 5 PostgreSQL test skips locally | Expected | All pass in CI with live pgvector container |
| `HTTP_422_UNPROCESSABLE_ENTITY` deprecation | Non-blocking | FastAPI cosmetic rename; no functional impact |
| DOCX duplicate name ZIP warning | Expected | Test intentionally creates malformed DOCX to verify rejection |
| Prompt 9 not implemented | Intentional | Excluded from scope per explicit user directive |

---

*All test results obtained on local dev machine against commit `63e175c`. CI results reference GitHub Actions linked in Section 7.4. No real credentials, PII, or secrets are included in this document.*
