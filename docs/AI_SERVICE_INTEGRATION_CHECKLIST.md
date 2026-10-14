# AI Service Integration Checklist

Status: pending shared agreement between the backend owner and the AI-service owner.

This checklist prepares integration without defining a replacement for the authoritative AI-service contract. Complete every decision before enabling an embedding result in backend ranking.

## Current backend score path

The current `SublinearTFCosineMatcher` calculates a raw sublinear TF cosine in the range 0–1. It stores that value as `diagnostics.raw_cosine`, then calculates the current 0–100 component as `min(100, raw_cosine × 1.8 × 100)`. `DeterministicEvaluationEngine` passes that component to `calculate_weighted_score`, where it contributes through `Job.semantic_weight`. The component is persisted in `MatchResult.semantic_score` and exposed in evaluation and candidate-card responses as `semantic_score` / `semanticScore`.

Changing this meaning affects persisted match results, candidate list ordering, candidate-card API responses, benchmark output, and any frontend display consuming those APIs. It must be treated as a migration and compatibility decision, not a matcher-only change.

## Versioning and compatibility

- [ ] Agree on a contract version and compatibility policy.
- [ ] Define how an older backend detects an unsupported response version.
- [ ] Preserve existing stored `MatchResult.semantic_score` values and API consumers during migration.
- [ ] Document whether a new raw-similarity field is persisted, returned, or both.

## Request and response

- [ ] Define one semantic-match request schema, including maximum input sizes and required text fields.
- [ ] Define `raw_similarity`, including its mathematical meaning and valid range.
- [ ] Return `model_id` and an immutable `model_revision`.
- [ ] Return the `method` used, such as `tf_cosine_baseline`, `sentence_embedding`, or `fallback`.
- [ ] Return explicit `status`: at minimum `ok`, `disabled`, `fallback`, or `error`.
- [ ] Define optional diagnostics: latency, chunk count, truncation, device, and preprocessing version.
- [ ] Ensure matched or missing concepts come only from deterministic evidence logic; do not present semantic associations as proof of skills.

## Fallbacks and failures

- [ ] Define whether fallback is permitted for each feature-flag state.
- [ ] Include an explicit fallback reason whenever it occurs.
- [ ] Specify timeout, malformed-response, unavailable-service, and model-load failure behavior.
- [ ] Ensure an error never becomes a fabricated similarity value.
- [ ] Keep sensitive resume content out of logs and diagnostics.

## Score semantics and rollout

- [ ] Agree which component owns transformation from raw similarity to a 0–100 similarity index, if any.
- [ ] Record that raw similarity and any similarity index are not probabilities.
- [ ] Decide whether the existing backend transformation `min(100, raw_cosine × 1.8 × 100)` stays as a legacy baseline component, is migrated, or is retired with a data migration plan.
- [ ] Keep embedding influence disabled in final ranking by default.
- [ ] Define a feature flag, default behavior, and rollback path.
- [ ] Define API labels so users can distinguish baseline, embedding, disabled, and fallback results.

Current controlled integration: set `CAREERSYNC_SEMANTIC_MATCHER=embedding` in the backend environment to request AI-service diagnostics. The default is `baseline`. Embedding diagnostics are stored in `ranking_attribution.semantic_diagnostics`; they do not influence `semantic_score` or final ranking until the unchecked score-mapping decision is approved.

## Validation before merge

- [ ] Backend contract tests cover valid, malformed, unavailable, and timeout service responses.
- [ ] Tests cover disabled mode, explicit fallback reason, empty inputs, and input-size limits.
- [ ] Tests cover model ID/revision, method, status, raw similarity, and diagnostics.
- [ ] Tests cover long-document chunking or truncation diagnostics when supported by the AI service.
- [ ] Baseline and embedding are evaluated on identical reviewed cases before any ranking change.
- [ ] Privacy, local inference, and model-cache configuration are documented.

## Requires shared agreement

The AI-service owner must provide the implemented schema, model revision policy, failure behavior, and model diagnostics. The backend owner must approve compatibility with persisted scores, API responses, feature flags, and deterministic evidence invariants.
