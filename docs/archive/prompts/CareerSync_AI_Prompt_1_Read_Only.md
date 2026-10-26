# CareerSync AI — Antigravity Prompt 1

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

