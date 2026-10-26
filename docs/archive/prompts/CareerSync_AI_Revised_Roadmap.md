# CareerSync AI — Corrected, Viva-Oriented Implementation Roadmap

**Planning date:** 25 October 2026  
**Repository:** `CareerSyncAI/AI-Job-Matcher`  
**Reviewed baseline:** `01f1c8c` (verify current HEAD before starting)  
**Team size:** two developers (Hit and Dhruv)  
**Goal:** deliver a truthful, reliable MVP with evidence before spending time on optional AI features.

## Executive decision

Antigravity's review improves the earlier plan. The right order is: establish the baseline, correct the source of truth and misleading workflow config, fix the two known CI failures, patch Next.js within major version 16, remove fabricated Resume Studio data, prove the core recruiter/candidate journeys, perform a focused residual-security review, then complete the clean-machine demo.

**Recommended execution order:** Prompt 1 → Prompt 2 → Prompts 4 and 5 (CI repair chain) → Prompt 3 → Prompt 6 → Prompt 7 → Prompt 8 → Prompt 10. Prompt 9 is an optional ~40-case MiniLM benchmark and should be skipped if viva preparation is at risk.

## Minimum release target

1. A root `AGENTS.md` truth table prevents future agents from treating proposed technologies as implemented.
2. The broken GitHub Pages workflow is removed and the README CI badge reflects real workflow status.
3. AI-service tests and PostgreSQL migrations pass in CI.
4. Resume Studio never invents an ATS score, skill, experience or other value for a real user.
5. A recruiter can create a job, upload a resume, see deterministic evaluation/evidence, update a status and verify persistence.
6. A candidate can upload their resume, apply to an open job and see the persisted status.
7. Ownership/auth checks, current upload controls and failure states are verified.
8. A clean-machine demo and concise evidence pack can be repeated from documented commands.

## Fixed scope decisions

- **Frontend testing:** no new test runner. The current `frontend/package.json` has lint/build scripts but no Jest, Vitest, Testing Library or Playwright. Use `npm run lint`, `npm run build`, plus a recorded manual UI checklist. Add a test framework only through a later explicit decision.
- **Next.js:** stay on major version **16**. Current dependency and official advisory status must be rechecked at execution time. This is release hygiene, not a claim that the current app has a confirmed exploitable `use cache` path.
- **AI tests:** `ai-services/tests/conftest.py` does **not** exist in the reviewed baseline. Both `test_contract_api.py` and `test_document_security.py` define their own test client with the hard-coded development key. Prompt 4 must create one environment-aware shared fixture and switch both modules to it.
- **Alembic:** `0002_add_evaluation_configuration_hash` is 38 characters and exceeds PostgreSQL's default 32-character version column. Rename the revision identifier and references without changing migration operations; verify the full Postgres migration lifecycle.
- **Git workflow:** Prompt 1 is read-only only. For implementation work, Antigravity is authorized to create branches, commit, push and open/update PRs. Do not push directly to `main`; do not force-push or discard unrelated work. Merge after required checks are green and scoped diffs are reviewed. For Prompts 4 and 5, use separate commits on the same release-prep branch/PR if needed so the paired fixes can make full CI green together.
- **pgvector/RAG:** deferred for this viva. Do not write/query embeddings, add RAG or alter the vector dimension. Still keep the existing Postgres migration CI passing.
- **Celery/Redis:** optional for the current MVP because the worker is off by default and inline processing exists. Do not make worker parity a release blocker unless the actual deployed demo depends on it.
- **Docling/GLiNER/BGE-M3/RapidFuzz:** not part of this implementation run. Mark as proposed/deferred unless the live code proves otherwise. Current parsing/extraction and deterministic scoring remain authoritative.
- **MiniLM:** optional diagnostic capability; its score does not control the recruiter-facing ranking today. Keep it that way unless a separately approved benchmark and scoring decision support changing it.
- **Advanced UI:** candidate comparison, blind screening, weight simulator and dedicated admin surfaces are stretch work, not release blockers unless directly required by the grading rubric.

## Critical implementation corrections

### 1. Broken GitHub Pages workflow

Remove `.github/workflows/nextjs.yml`. It attempts package detection and build from repository root, while package files are under `frontend/`; this is a FastAPI-backed full-stack product, not a static-only GitHub Pages deployment. Retain `.github/workflows/ci.yml`.

### 2. Misleading CI badge

Replace the static green shields.io badge with the live GitHub Actions badge for `.github/workflows/ci.yml`. Link the badge to the workflow. README status must not claim success independently of Actions.

### 3. Master context drift

Create root `AGENTS.md` and explicitly instruct every Antigravity prompt to read it. `frontend/AGENTS.md` already exists and should not be overwritten. Reconcile `careersync-ai-master-context.md`, `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, and README/schema examples. Some sections mark Docling/GLiNER/BGE-M3 as proposed, but other type/schema descriptions can still imply they are live. Correct Next.js 15.5 wording; do not downgrade from 16.

### 4. AI-service test setup

Both test modules define their own `client` fixture with `DEFAULT_DEV_KEY`, while CI sets `AI_SERVICE_API_KEY=ci-test-ai-key`. The shared solution is to **create** `ai-services/tests/conftest.py` with a fixture that reads the env var and switch both modules to the shared fixture. Keep missing/invalid-key tests deliberately unauthorized. Do not weaken production authentication.

### 5. Alembic revision ID

`0002_add_evaluation_configuration_hash` exceeds the Postgres default 32-character `alembic_version.version_num` capacity. Shorten the revision ID and update dependent references, preserving migration operations and chain semantics. Fresh CI should perform upgrade → schema assertions → downgrade → re-upgrade → Postgres tests. Do not stamp/reset a real or shared DB automatically.

### 6. Resume Studio fake defaults

`frontend/src/app/dashboard/resume/page.tsx` uses `sampleParsedResume`, example experience and fallback values such as `?? 88` / `?? 90`. This can fabricate results even after a successful API request if real fields are missing. Remove all such real-user fallbacks. Represent missing fields as unavailable, and provide explicit loading, completed, partial, unavailable and failed states. Do not add Vitest; use lint/build and manual checklist.

### 7. Next.js patch

At the reviewed baseline, the package and lockfile say `16.3.8`; older documentation says `16.3.0`. Advisory GHSA-673q-mjm6-r5xr affects `16.0.0` through `16.4.0` and is patched in `16.4.1`. The specific exploit needs Cache Components / `use cache` returning multiple typed arrays; the review found no `use cache` or `next/image` use, so record direct applicability accurately. Still update to a currently supported patched stable 16.x release before the release. Stable `16.4.3` was listed on 23 October 2026; recheck the official release list at execution time. Do not use canary or downgrade to 15.x.

References: [official advisory GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [Next.js support policy](https://nextjs.org/support-policy), [official release list](https://github.com/vercel/next.js/releases).

## Phase and prompt map

| Order | Prompt | Scope | Acceptance gate |
|---:|---|---|---|
| 1 | Prompt 1 | Read-only baseline audit | Exact SHA/worktree, evidence-backed truth table, known blockers, no edits |
| 2 | Prompt 2 | Root `AGENTS.md`, docs truth, delete Pages workflow, live CI badge | Drift corrected; no application logic touched |
| 3 | Prompt 4 | Create AI test `conftest.py`; use env-aware client in both modules | Authorized tests pass with CI key; negative auth tests still return 401 |
| 4 | Prompt 5 | Shorten Alembic revision ID and references | Fresh Postgres upgrade/downgrade/re-upgrade and all required CI pass |
| 5 | Prompt 3 | Stable patched Next.js 16 dependency update | `npm ci`, lint and production build pass |
| 6 | Prompt 6 | Remove fabricated Resume Studio values and add truthful UI states | No fake fallback; lint/build pass; manual checklist recorded |
| 7 | Prompt 7 | Verify recruiter/candidate journeys and authorization | Both journeys and ownership checks pass or defects are scoped |
| 8 | Prompt 8 | Residual security review/fixes only | Existing controls not duplicated; relevant suites pass; findings classified |
| 9 | Prompt 10 | Clean-machine demo and evidence pack | Repeatable startup, both journeys, current CI status and limitations recorded |
| Optional | Prompt 9 | ~40-case MiniLM pilot benchmark | Only if time remains; never blocks viva MVP |

## Git and PR discipline

- Prompt 1: read-only; no branch, edit, commit or push.
- Every implementation prompt gets a scoped topic branch, commit, push and PR to `main`, so Actions can provide evidence. Do not push directly to `main`.
- Prompts 2 → 4 → 5 are a dependency stack: branch Prompt 4 from the Prompt 2 branch and Prompt 5 from the Prompt 4 branch, while opening a PR to `main` for each prompt. The earlier PRs may show known CI failures; do not merge a partial stack. The final Prompt 5 PR contains all three prompts’ commits and must make the full required workflow green. Merge that complete stack after reviewing it; then close/mark earlier stacked PRs as superseded or merged according to GitHub status.
- For subsequent independent prompts, branch from the updated `main` and open a separate PR. Merge only when required checks pass and the diff is reviewed. Never force-push or destroy unreviewed work.
- If GitHub permission prevents branch push or PR creation, commit locally, give the exact commands/status and state the blocker; do not claim a remote PR exists.

## Timebox and cut line

Because the viva date is unknown, no artificial calendar deadlines are assigned. The core scope is approximately **3–5 focused person-days if no major new defect is uncovered**, but this is an estimate, not a guarantee.

If the viva is within 48 hours:

1. Do Prompt 1 read-only baseline.
2. Do Prompt 2 plus the narrow CI fixes (Prompts 4 and 5) to get an honest build/test status.
3. Patch Next.js 16 as a tightly scoped dependency hygiene change.
4. Remove fabricated Resume Studio data and run lint/build.
5. Prove the most important recruiter and candidate paths and run a quick residual-security check.
6. Complete the demo/evidence pack.
7. Skip Prompt 9 and advanced features. Do not attempt neural-ranking integration, pgvector, RAG, or new models.

## Definition of done

A release is demo-ready only when the required checks are green on the integrated candidate commit, Resume Studio has no fabricated real-user results, the recruiter and candidate core flows are demonstrated with synthetic data, ownership boundaries are checked, and all remaining limitations are labelled honestly. A successful frontend build alone is not full-system verification.

## Prompt file

Use the companion file [`CareerSync_AI_Antigravity_Prompts.md`](CareerSync_AI_Antigravity_Prompts.md). It contains the full task-specific instruction for every prompt, including exact target files, do-not-expand rules, acceptance criteria and output requirements.
