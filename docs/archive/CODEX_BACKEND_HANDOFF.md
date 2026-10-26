# Codex Backend and Evaluation Handoff

Updated: 2026-10-14

## Checkout audit

- Branch: `main`
- Commit at audit start: `ed450d0116a0c1b84331d06d483df134b9b61d6b`
- Worktree at audit start: clean
- Backend command run: `python -m pytest -q` from `backend/`
- Result after the changes in this handoff: `37 passed`; one existing AnyIO deprecation warning in `tests/test_api.py`.

`careersync-ai-master-context.md` describes `develop` as the active branch, but this checkout is on `main`. Treat the checkout as the current source of truth until the project owner resolves that document drift.

## Completed in this handoff

The bundled five-pair set is now described and reported as a **synthetic regression benchmark**, rather than ground truth. It does not provide independent human relevance judgments.

- Ranking Spearman correlation is no longer calculated or exposed for this fixture set.
- `expected_human_fit_rating` was renamed to `expected_fixture_fit_rating`.
- The benchmark's required-skill metric is now called required-skill evidence detection. A `not_detected` result means evidence was not found in the supplied material; it is not a confirmed candidate skill gap.
- The schema now has fields for future independently reviewed labels: relevance label and source, split, candidate source, annotator ID, and adjudication status.
- The bundled benchmark now uses a fixed evaluation date (`2024-07-01`) for `Present` employment ranges. Its experience labels were corrected to match that date, and the extractor accepts an optional fixed `as_of` date for reproducible evaluation while production behavior remains current-time based.
- The benchmark endpoint documentation reflects these semantics.

Changed files:

- `backend/app/evaluation/benchmark_schema.py`
- `backend/app/evaluation/benchmark_runner.py`
- `backend/app/evaluation/synthetic_dataset.py`
- `backend/app/api/v1/evaluation.py`
- `backend/tests/test_intelligence_layer.py`

## Current architecture and contract findings

- `backend/app/services/semantic_matcher.py` is the backend baseline. It uses sublinear term-frequency cosine similarity, then applies `cosine * 1.8 * 100` before placing the result into the weighted final score.
- `backend/app/services/evaluation.py` invokes that local matcher directly. It does not call the AI service semantic endpoint.
- `docs/ai-service-contract.md` is version 1.0.0 (September 18, 2026) and still defines a 0–100 `semantic_similarity_score`, invented concept lists, and `semantic-cosine-v1`; it conflicts with the new implementation plan’s requested raw similarity, model/revision, method, fallback status, and diagnostics fields.
- The deterministic engine preserves `NOT_DETECTED` separately from `GAP` in ranking coverage, but the old benchmark erased that distinction. This handoff fixes the benchmark only.

## Remaining integration work

1. Agree with the AI-service owner on a versioned semantic-result contract containing raw similarity, `model_id`, `model_revision`, `method`, `status`, fallback reason, and diagnostics.
2. Decide how the backend should retain its current 0–100 weighted `semantic_score` while exposing raw similarity without calling it a probability or silently applying the existing `1.8` multiplier. This changes persisted/API score semantics and should be a reviewed contract decision.
3. Add an independently reviewed dataset before reporting NDCG, Recall@k, pairwise ordering, or Spearman metrics. Keep it split by candidate and job, with labels and review provenance recorded.
4. Once the AI-service contract exists, add offline backend tests for disabled/unavailable service, explicit fallback diagnostics, malformed semantic responses, empty input, and long-input chunk diagnostics. Do not enable embedding output in final scoring until comparative evaluation is accepted.

## Backend readiness update

Completed after the initial handoff:

- Added `docs/AI_SERVICE_INTEGRATION_CHECKLIST.md`, which documents the decisions needed for a compatible semantic-result contract and the current backend score path.
- Added `docs/INDEPENDENT_EVALUATION_PLAN.md`, which defines a 100–300 pair reviewed-pilot path, provenance, split controls, suitable metrics, error analysis, and latency/resource reporting.
- Added regression tests proving the current baseline score transformation and safe empty-input behavior. These tests protect the existing behavior; they do not validate an embedding model.

The later audit began on `main` at `ed450d0116a0c1b84331d06d483df134b9b61d6b`. The worktree was already dirty with the backend changes from this handoff and two new untracked AI-service matcher files. While the audit ran, additional uncommitted AI-service changes appeared. They are owned by Antigravity and were not edited by Codex.

Current backend verification after these additions: `python -m pytest -q` from `backend/` reports `39 passed`, with the same existing AnyIO deprecation warning in `tests/test_api.py`.

The contract document remains version 1.0.0. It does not yet reflect the raw similarity, method, status, fallback, model-revision, and diagnostics fields being developed in the uncommitted AI-service files. Backend integration remains blocked until Antigravity provides the actual final schema and updates or approves the shared contract.

## Controlled AI-service integration

The AI-service contract is now version 1.1.0 and exposes the needed diagnostics. The backend integration is enabled only with:

```powershell
$env:CAREERSYNC_SEMANTIC_MATCHER = "embedding"
```

The default is `baseline`. In embedding mode, `backend/app/services/semantic_matcher.py` calls `POST /api/v1/ai/semantic-match` using the agreed request and response fields. It records the returned raw similarity, index, model metadata, method, status, fallback reason, and diagnostics under `ranking_attribution.semantic_diagnostics`.

The AI-service value is **diagnostic only**: it does not replace the backend's existing TF-cosine component, alter `MatchResult.semantic_score`, or alter the weighted final score. This is intentional because no shared decision defines an embedding-to-ranking transformation. Service timeouts, unavailable services, and malformed responses retain the deterministic baseline and are recorded with `status: error`.

Backend tests after integration: `44 passed`, with the existing AnyIO deprecation warning in `tests/test_api.py`.

Before embedding can influence ranking, the project still needs an approved score-mapping policy, a migration/API compatibility decision, and comparative evaluation on independently reviewed data.

## Safe continuation command

```powershell
cd 'C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher\backend'
python -m pytest -q
```
