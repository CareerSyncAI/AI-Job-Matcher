# CareerSync AI — Corrected Antigravity Prompt Pack

**Planning date:** 25 October 2026  
**Repository:** `CareerSyncAI/AI-Job-Matcher`  
**Reviewed baseline:** `01f1c8c` (verify current `HEAD` before starting)

## How to run this pack

Run **Prompt 1 first**; it is read-only. Then execute the implementation prompts in this order:

**1 → 2 → 4 → 5 → 3 → 6 → 7 → 8 → 10**

Prompt 9 is optional: consider it only after Prompts 1–8 have passed and the clean demo is reliable. If the viva is close, skip it.

### Shared operating contract — use for every prompt

- **Read the repository-root `AGENTS.md` first if it exists.** Do not assume the IDE automatically loaded it. `frontend/AGENTS.md` already exists; do not overwrite or repurpose it. If the root `AGENTS.md` is absent, record that fact; Prompt 2 creates it.
- Inspect the current branch, `HEAD`, worktree and relevant code before editing. Preserve the user's unrelated changes. Never reset, discard, overwrite or force-push unreviewed work.
- For implementation prompts, **you are authorized to create a topic branch, make scoped commits, push the branch and open/update a PR to `main`**. Do not push directly to `main`. Do not stop after local-only changes when GitHub access works.
- After every prompt, report changed files, exact commands and exit codes, tests/build results, commit SHA, branch and PR URL. Never claim a check passed unless it ran and passed.
- **Open a PR for each implementation prompt** and target `main` so the repository CI workflow runs. For the dependent chain Prompts 2 → 4 → 5, create stacked topic branches (each from the previous prompt branch) and open a PR to `main` for each one. Earlier PRs may show the known baseline CI failures; do not merge those partial branches. Prompt 5 must include the earlier commits and produce a green full CI run. Merge the final fully green stack, then close or mark the earlier PRs superseded/merged as GitHub reports. For later independent prompts, branch from the updated `main` and open a separate PR.
- Do not bypass failing required checks or push directly to `main`. Merge when required checks are green and the final diff is inspected. If repository permissions or GitHub tooling prevent push/PR/merge, state that precisely and provide the commands needed; do not pretend it was done.
- Do not add a new frontend test framework. The frontend has no Jest/Vitest/Testing Library/Playwright setup. For frontend UI behavior use existing lint/build checks plus the manual acceptance checklist specified below.
- If a real code or repository fact contradicts a prompt, pause only the conflicting part, state the evidence, and propose the smallest correction. Do not halt because a planned file is absent when the prompt explicitly asks you to create it.
- Keep the MVP focused. No RAG, no pgvector retrieval, no new neural scoring, no Docling/GLiNER/BGE-M3 integration, no unnecessary framework upgrade, and no feature expansion unless a prompt explicitly approves it.

---

## Prompt 1 — Read-only baseline (NO CHANGES)

You are performing a strictly read-only audit. Change no files, install no packages, create no commits and do not push. First read the repository-root `AGENTS.md` if present; if absent, report that it does not yet exist. Do not assume the editor automatically reads it. Preserve all existing work. Paste exact command output and exit codes.

Repository: `CareerSyncAI/AI-Job-Matcher`.

1. Record `git rev-parse HEAD`, current branch, `git status --short`, and whether the worktree is clean.
2. Inspect `.github/workflows/ci.yml`, `.github/workflows/nextjs.yml`, root `README.md`, `careersync-ai-master-context.md`, `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/ai-service-contract.md`, `ai-services/tests/test_contract_api.py`, `ai-services/tests/test_document_security.py`, all Alembic revisions, `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/app/dashboard/resume/page.tsx`, and `frontend/AGENTS.md`. **Do not assume `ai-services/tests/conftest.py` exists; check and report its actual presence/absence.**
3. In both AI-service test modules, identify client creation and every use of the development API key. Confirm why authorized tests disagree with CI's `AI_SERVICE_API_KEY=ci-test-ai-key`. Keep negative-key tests distinct.
4. Verify the long Alembic revision and all `down_revision` references. Inspect the current CI migration command and exact failure if GitHub Actions logs are accessible. If they are not accessible, label runtime result unverified.
5. Find every sample/default ATS number, skill, strength, issue and experience value in Resume Studio, including API-success code paths where missing fields default to invented values.
6. Classify current model/technology claims against code: actual PDF/DOCX parsers, extractors, `SublinearTFCosineMatcher`, MiniLM diagnostic model, Docling, GLiNER, BGE-M3, RapidFuzz, pgvector/RAG, Celery/Redis, role screens and frontend tests.
7. Verify current stable Next.js 16 releases and official security advisories. Check whether `use cache` / Cache Components and `next/image` are present. Treat the patch as release hygiene unless source/config findings establish a direct exposure; do not downgrade to 15.x or use a canary.
8. Inspect recent Actions runs if possible. Do not infer green CI from the README badge.

Return only:
- Baseline SHA, branch and worktree state.
- A concise `Implemented / Partial / Deferred / Unverified` truth table.
- Confirmed issues with file/line evidence.
- Intended file scope for each subsequent prompt, including dependencies between changes.
- Exact commands/output/exit codes and any unavailable verification.

No edits. Do not create a test `conftest.py` during this prompt.

---

## Prompt 2 — Establish the truth source and clean misleading repository configuration

Inspect first. Read the repository-root `AGENTS.md` if it exists and the source-of-truth documents. Keep this change limited to instructions, documentation and workflow/README housekeeping. Preserve unrelated work. Commit and push the scoped changes to a topic branch and open/update the release-prep PR. Report exact outputs and the PR URL.

1. Add a **repository-root** `AGENTS.md` (leave `frontend/AGENTS.md` alone). Include a short, evidence-based truth table:
   - Current: Next.js 16 frontend; FastAPI backend; `pdfplumber` with `pypdf` fallback for PDF; `python-docx`; custom section detection; taxonomy/rule-based skills; custom experience/education extractors; deterministic scoring with `SublinearTFCosineMatcher`.
   - Optional diagnostic: `sentence-transformers/all-MiniLM-L6-v2` in `ai-services`; its score does not drive authoritative recruiter ranking today.
   - Deferred/not active for this MVP: Docling, GLiNER, BGE-M3, RapidFuzz (unless code proves otherwise); pgvector embedding writes/retrieval and RAG; worker/Redis as mandatory runtime; unimplemented admin/comparison/blind-screening/weight-simulator functionality.
   - No sample resume values presented as real analysis; no autonomous hire/reject; recruiter retains final decision.
   - Verify claims from current code; do not silently reinterpret planning as implementation.
2. Reconcile `careersync-ai-master-context.md`, `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, root `README.md` and directly conflicting technology/schema/type examples. Clearly label Docling/GLiNER/BGE-M3 and proposed parser/schema fields as proposed/deferred. Correct the stale Next.js 15.5.x “do not upgrade to 16” wording; version 16 is the target. State the real parser/extractor and scoring path.
3. Mark pgvector persistence/retrieval and RAG as deferred; **do not** migrate vector dimensions or add model implementations in this prompt.
4. Delete `.github/workflows/nextjs.yml` at the actual path `.github/workflows/nextjs.yml`. It runs package-manager detection/build at repository root although the app/lockfile are in `frontend/`, and the complete product requires FastAPI. Do not try to force the whole product into static GitHub Pages.
5. Replace the static green CI badge in `README.md` with a live badge for `.github/workflows/ci.yml`, linked to its actual GitHub Actions workflow. Do not manually claim CI is passing.
6. Preserve the existing CI workflow and application source code; no dependency changes here.

Run markdown/link checks if available and inspect the diff for incorrect claims. CI may remain red until Prompts 4 and 5 repair known baseline failures; report this as known and do not fake a green result.

---

## Prompt 3 — Patch Next.js within major version 16 (run after CI fixes)

Inspect first. Read root `AGENTS.md`, check current locked/installed versions, package lock and source configuration. This is **routine dependency hygiene before release**, not a claim that this application has a proven exploitable path. Make only the necessary frontend dependency/lock changes. Commit, push and open/update a separate PR; report exact results.

1. Check `frontend/package.json` and `frontend/package-lock.json` at current `HEAD`. The reviewed baseline had Next.js `16.3.8`; do not assume it is still current.
2. Verify official Next.js stable releases and advisories at execution time. The reviewed advisory GHSA-673q-mjm6-r5xr affects `16.0.0`–`16.4.0`, is patched in `16.4.1`, and describes a particular Cache Components / `use cache` execution path. The repository audit found no `use cache` / Cache Components usage and no `next/image` use, so record applicability accurately rather than exaggerating a confirmed exploit. Still move off an affected release as release hygiene.
3. Use a current **stable, patched 16.x** release. Do not downgrade to 15.x, install canary, use `--force`, or upgrade unrelated packages. Keep Next.js and `eslint-config-next` compatible; update the lockfile normally.
4. The official release list showed stable `16.4.3` on 23 October 2026; re-check at execution time to see whether a newer stable 16.x is appropriate. Do not assume the cached planning text is current.
5. From `frontend/`, run `npm ci`, `npm run lint` (script is `eslint`), and `npm run build`. Check package-lock consistency and any npm audit findings that directly affect the dependency update.

Return exact before/after versions, advisory links, commands and results. If a current patched stable 16.x release creates a reproducible incompatibility, show evidence and recommend the smallest fix.

---

## Prompt 4 — Create one shared environment-aware AI test client fixture

Inspect first. **`ai-services/tests/conftest.py` does not exist in the reviewed baseline; create it.** The two test modules currently define their own `client` fixture and hard-code `DEFAULT_DEV_KEY`. Change only test support and those two modules. Do not weaken production API authentication. Create a stacked branch from Prompt 2, commit the fixture fix, push it and open a PR targeting `main` so CI runs. This PR may still show the known PostgreSQL migration failure; do not merge it by itself. Report exact results and the PR URL.

1. Create `ai-services/tests/conftest.py` with a shared `client` pytest fixture that creates `TestClient(app, headers={"X-AI-Service-Key": test_key})`, where `test_key` reads `AI_SERVICE_API_KEY` from the environment and uses the application's development key only as a documented local-test fallback when the variable is absent.
2. Move the duplicated `client` fixtures out of `ai-services/tests/test_contract_api.py` and `ai-services/tests/test_document_security.py`; both modules should consume the shared fixture automatically.
3. Keep unauthenticated tests using a client without the header, and bad-key tests using an explicitly invalid key. Preserve their expected `401` assertions. Do not change endpoint security or production defaults.
4. Keep imports needed by explicit negative-key tests and the production-key guard. Avoid gratuitous refactors.
5. Run `pytest -v` from `ai-services/` **twice**: once with `AI_SERVICE_API_KEY=ci-test-ai-key` to reproduce CI configuration, and once without the variable to confirm local developer fallback. Capture exact pass/fail summaries. If any tests still fail, diagnose the actual issue instead of relaxing assertions.

Acceptance: CI-configured authorized requests succeed, unauthorized/invalid-key requests still return `401`, and there is exactly one shared client fixture.

---

## Prompt 5 — Shorten the Alembic revision ID and verify PostgreSQL migrations

Inspect the full migration chain first. The reviewed revision `0002_add_evaluation_configuration_hash` exceeds PostgreSQL's default 32-character `alembic_version.version_num` limit. Change only revision identifiers/references needed to resolve the issue; preserve migration operations and database behavior. Create the next stacked branch from Prompt 4, commit the fix, push and open a PR targeting `main`. This final stacked PR must contain the Prompt 2, 4 and 5 commits so all required CI jobs can pass together. After full CI is green and the diff is reviewed, merge the complete stack and close/mark earlier stacked PRs appropriately.

1. Confirm exact `revision` and `down_revision` references, migration chain order, and any references in tests/docs.
2. Rename the revision to a stable ID of 32 characters or fewer; update only the dependent references needed to preserve the linear chain. Do not change the migration's schema operations.
3. Run the PostgreSQL 16 + pgvector CI lifecycle: `alembic upgrade head`, schema assertions, `alembic downgrade base`, `alembic upgrade head`, and the PostgreSQL integration tests.
4. Do not use SQLite `create_all()` as a substitute for PostgreSQL migrations. Do not touch or stamp any real/shared database and do not delete local DB data. A revision rename can affect a database that has recorded the old ID; inspect the target DB state and give separate migration guidance where needed. A disposable local SQLite DB may tolerate the old length, but do not reset it automatically.
5. When Prompt 4's and Prompt 5's commits are together on the release-prep branch/PR, rerun the **entire required CI workflow**, not just the changed job.

Acceptance: the fresh Postgres migration lifecycle and all required CI jobs pass. If one fails, return exact logs and the smallest fix; don't suppress checks.

---

## Prompt 6 — Make Resume Studio truthful (no fabricated fallbacks)

Inspect first. Read root `AGENTS.md`, the actual resume/ATS API schemas and current `frontend/src/app/dashboard/resume/page.tsx`. Keep the change focused on real-user results. Do not add a frontend test framework. Commit, push and open/update a scoped PR.

1. Remove `sampleParsedResume` as the initial or fallback result for real users, including skills, work experience, ATS score, grade, strengths, issues, action verbs, metrics, word count and sub-scores.
2. Remove all invented defaults such as `?? 88`, `?? 90` or `?? 95` when displaying real API responses. Missing fields must render as unavailable (`—` or clear equivalent), never a fabricated score.
3. `extractSkillsFromResponse` must not return sample skills for missing/empty API fields. Never fill real work experience from a sample profile.
4. Define separate, explicit UI states consistent with the backend contract: loading; analysis completed; partial/unavailable fields; failed request/analysis; and no uploaded resume. Keep file-upload status separate from ATS-analysis status.
5. Show a helpful error/retry path where appropriate. Never present a failed API response as successful AI analysis. Do not invent a success score when the response is partial.
6. Do not change backend scoring, add dependencies or redesign the page.
7. **Frontend verification approach is decided: no Vitest/Jest/Testing Library/Playwright additions.** Run `npm run lint` and `npm run build`, then provide a manual checklist and execute it in the available browser for: first visit/no resume; real upload; complete API result; missing score/skills/experience fields; API failure; retry; existing resume on refresh. If a browser is unavailable, mark manual cases unverified—do not claim they passed.

Acceptance: search/code inspection proves no sample numeric or profile values leak into real-user results; all UI states are explicit; lint/build pass; manual outcomes are recorded.

---

## Prompt 7 — Prove the core recruiter and candidate journeys

Inspect routes, API contracts, existing backend tests and current UI handlers before editing. Do not add a new E2E framework or advanced features. Fix only concrete defects needed for the MVP. Commit and push a scoped PR; run both automated and manual checks.

**Recruiter journey:** login → create/open job with skills, experience and education → upload synthetic PDF and DOCX → confirm actual parsing/extraction/evaluation → inspect candidate score/ranking and source evidence → update application stage/add a note → refresh and confirm persistence.

**Candidate journey:** login → upload own synthetic resume → browse open jobs → apply using stored resume → verify application persisted → refresh and verify status. Include missing resume, failed resume and duplicate-application behavior.

**Authorization/privacy:** verify candidate cannot access another candidate's resume/ATS report; recruiter cannot read another recruiter's jobs/candidates or restricted weights; candidate cannot read recruiter-only weights/drafts; recruiter-upload path cannot hijack a registered candidate account.

- Use existing integration tests first; do not duplicate coverage without need.
- Check actual request payloads and enum values against backend schemas.
- For frontend validation, use `npm run lint`, `npm run build`, and the manual checklist; do not add a test runner.
- Use synthetic non-PII records only. Do not use personal or real candidate resumes.
- Report each journey as pass/fail/unverified with exact evidence; patch only demonstrated defects.

---

## Prompt 8 — Security review and narrowly scoped fixes only

This prompt is **security only**. Do not perform the clean-machine demo or build an evidence pack here; Prompt 10 owns that release gate. Compare current `HEAD` against the previous security audits and follow-up commits. Classify each prior finding as `fixed and verified`, `still open and reproduced`, or `unverified`, with path/line/test evidence. Commit and push only confirmed, scoped fixes.

Review current behavior and relevant existing tests for:

- extension/MIME/magic-signature checks and 10 MB upload ceiling;
- PDF page limit and DOCX archive/ZIP expansion protections;
- duplicate handling, path isolation and upload cleanup;
- parser/analysis timeout and explicit failure statuses;
- PII-safe logs;
- AI service key enforcement;
- recruiter/candidate resource ownership and IDOR boundaries;
- authorization around resume and ATS endpoints.

Do not re-implement controls already present in follow-up commits. Fix a confirmed high-impact remaining issue with a regression test; for small low-risk gaps, report them with severity and recommend defer/repair. Do not claim formal compliance or a security certification. Run relevant backend and AI-service suites; use the same test configuration as CI. If no significant issue is reproduced, make no production-code changes and document the evidence.

---

## Prompt 9 — Optional ~40-case MiniLM benchmark (skip if viva is close)

Optional research task only. **Do not start until Prompts 1–8 have passed, and skip if the demo or viva preparation is at risk.** Inspect the current evaluator, fixtures and model-cache availability first. Do not connect embeddings to production ranking, add pgvector/RAG, or introduce new infrastructure. Commit/push only if a meaningful, reproducible result can be produced.

- Use approximately 40 synthetic, non-PII candidate/job cases, grouped into multiple candidate pools for the same jobs so rankings are evaluated within a job rather than comparing unrelated job families.
- Hit and Dhruv should label relevance using a short rubric. Prefer independent labels and resolve disagreements; record the limitation if only one reviewer is available.
- Compare baseline and MiniLM on exactly the same cases using a clear ranking measure such as NDCG@5 per job. Do not claim production accuracy or broad fairness from a small pilot.
- Do not use injected gold education/experience fields to claim extraction accuracy.
- If model weights are unavailable or the experiment exceeds a one-day timebox, write a concise deferral note and stop; do not fetch/enable an unapproved model or change scoring weights.

---

## Prompt 10 — Clean-machine demo and evidence pack

This is the **final release gate**, separate from Prompt 8 security review. Inspect startup instructions and environment risks first. Use a clean clone/environment and synthetic non-PII records. Avoid production-source changes unless a real defect blocks the demo; if a fix is needed, stop the evidence run, open a separate scoped fix PR and rerun this gate after it merges. Commit/push the final evidence report if it contains no secrets or personal data.

Run all mandatory CI-equivalent commands and record exact summaries. Manually perform both MVP journeys and confirm:

- frontend and backend start using documented commands;
- recruiter can create/open a job and upload a resume;
- Resume Studio shows genuine API values or explicit unavailable/failure states, never sample results;
- the recruiter sees deterministic ranking and real resume-grounded evidence;
- candidate can apply and the persisted status remains correct after refresh;
- unauthorized resource access is rejected;
- dynamic README badge points to the actual workflow;
- docs and root `AGENTS.md` accurately label MiniLM as diagnostic and pgvector/RAG/Docling/GLiNER/BGE-M3 as deferred where appropriate.

Create a compact evidence report containing commands, result, commit SHA, CI URL/status, manual checklist outcome, screenshots (only synthetic data; no secrets/PII), startup instructions and accepted limitations. Do not change test assertions or suppress warnings to make the report appear green. Report unverified checks clearly.

Final output: a one-page viva checklist, start-up commands, evidence inventory, known limitations, latest commit/PR, and exact CI status.
