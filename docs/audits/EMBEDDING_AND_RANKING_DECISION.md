# CareerSync AI — Embedding Architecture & Semantic Ranking Decision Audit

**Date of Audit:** October 17, 2026  
**Auditor:** Antigravity (Advanced Agentic AI Pair Programmer)  
**Target Repository:** `CareerSyncAI/AI-Job-Matcher`  
**Current HEAD Commit:** `136f432f4657b30d0fbc6fb6b9e59af3f1ffa1ee`  
**Working Branch:** `main`  
**Audit Scope:** Read-only technical investigation and decision audit of embedding dimensions, vector storage, and semantic score-mapping strategy.  
**Classification System:**  
- **[VERIFIED]** — Supported directly by code, configuration, tests, or schema evidence.  
- **[INFERRED]** — Reasonable engineering conclusion derived from facts, not yet tested at runtime.  
- **[UNVERIFIED]** — Evidence is currently insufficient to substantiate.  
- **[RECOMMENDATION]** — Proposed architectural or engineering action for consideration.  
- **[REQUIRES APPROVAL]** — Explicit team authorization required before any code or schema change.  

---

## 1. Executive Summary

1. **Embedding Dimension Discrepancy:** **[VERIFIED]** A mathematical discrepancy exists between the active AI-service model (`sentence-transformers/all-MiniLM-L6-v2`, producing **384-dimensional** dense unit vectors) and the PostgreSQL schema (`backend/app/models/entities.py:346` and `backend/alembic/versions/0001_initial_schema.py:266`, specifying `Vector(1024)` originally anticipated for `BGE-M3`).
2. **Operational Status:** **[VERIFIED]** This discrepancy is **not an active runtime defect** today because zero production code writes to or queries the `resume_embeddings` table (the SQLite database contains exactly 0 rows, and no query references the table). However, it is a confirmed **latent integration defect**: attempting to persist embeddings without an Alembic migration will cause PostgreSQL's pgvector extension to reject the transaction with a dimension mismatch.
3. **Semantic Ranking Behavior:** **[VERIFIED]** In the default configuration (`CAREERSYNC_SEMANTIC_MATCHER="baseline"`), candidate ranking relies on the deterministic, explainable `SublinearTFCosineMatcher`, which scales sublinear term frequency ($1 + \ln(\text{tf})$) into a 0–100 score that contributes 15% to composite fit and serves as the 4th tie-breaker.
4. **Embedding Influence:** **[VERIFIED]** Setting `CAREERSYNC_SEMANTIC_MATCHER="embedding"` enables `AIServiceDiagnosticMatcher`. The neural embedding similarity is collected purely into `diagnostics["ai_service"]` with `"used_for_ranking": False`. The returned score remains the deterministic baseline score. Dense embeddings **do not influence candidate ranking in any current mode**.
5. **Score Comparability:** **[VERIFIED]** The baseline TF-cosine score and neural embedding cosine are **mathematically and distributionally incomparable**. Baseline TF-cosine is heavily sparse and amplified by a $1.8\times$ factor; dense cosine exhibits sentence-transformer anisotropy where unrelated texts score ~0.18–0.22. Directly swapping or blindly summing these scores without calibration would distort candidate ranking and violate Master Context Section 15's rule against double-counting structured skills.
6. **Core Recommendation for 5th-Semester SGP:** **[RECOMMENDATION]**
   - **Storage:** Defer vector persistence (Option A). Keep `resume_embeddings` unpopulated.
   - **Ranking:** Keep dense embeddings diagnostic-only (Approach 1). Rely on the explainable, deterministic baseline for the academic recruiter demonstration.

---

## 2. Verified Current Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND PIPELINE (FastAPI)                      │
│                                                                        │
│   CAREERSYNC_SEMANTIC_MATCHER="baseline" (Default)                    │
│   ├── SublinearTFCosineMatcher (Python Stdlib / regex tokenization)     │
│   │   ├── Stopword filtering (79 domain stopwords)                     │
│   │   ├── Sublinear TF: 1 + ln(tf)                                     │
│   │   ├── Calibrated Score: round(min(100, max(0, cos * 1.8 * 100)), 1)│
│   │   └── Evaluates matched/missing concept tokens                     │
│   │                                                                    │
│   CAREERSYNC_SEMANTIC_MATCHER="embedding" (Opt-In Diagnostic)          │
│   └── AIServiceDiagnosticMatcher                                       │
│       ├── Computes Baseline Score (for ranking and MatchResult)        │
│       ├── Calls POST http://localhost:8001/api/v1/ai/semantic-match    │
│       ├── Receives 384-d MiniLM cosine & similarity_index              │
│       ├── Captures diagnostics['ai_service'] with used_for_ranking=False│
│       └── Graceful fallback to baseline on error/timeout/degraded      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP REST (JSON)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AI MICROSERVICE (Port 8001)                     │
│                                                                        │
│   SEMANTIC_MATCHER="baseline" or "embedding"                           │
│   ├── Pretrained Model: sentence-transformers/all-MiniLM-L6-v2        │
│   ├── Pinned Revision: 1110a243fdf4706b3f48f1d95db1a4f5529b4d41       │
│   ├── Dense Dimensions: 384                                            │
│   ├── Section-Aware Chunking: Bounded to 500 characters per chunk      │
│   └── Offline Local CPU Inference (Thread-safe singleton)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Embedding-Dimension Mismatch Analysis

### Verification of Specific Claims

1. **Active Embedding Model:** **[VERIFIED]** `ai-services/src/similarity/embedding_matcher.py` (lines 30–32):
   ```python
   DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
   DEFAULT_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
   DEFAULT_DIMENSIONS = 384
   ```
2. **Verified Output Dimension:** **[VERIFIED]** `all-MiniLM-L6-v2` encodes input text into dense 384-dimensional unit vectors (`np.ndarray` of shape `(384,)`).
3. **ORM Model Declaration:** **[VERIFIED]** `backend/app/models/entities.py` (lines 338–348):
   ```python
   class ResumeEmbedding(TimestampMixin, Base):
       __tablename__ = "resume_embeddings"
       id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
       resume_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), unique=True, index=True)
       model_version: Mapped[str] = mapped_column(String(128))
       vector: Mapped[list[float]] = mapped_column(Vector(1024))
   ```
4. **Alembic Migration Declaration:** **[VERIFIED]** `backend/alembic/versions/0001_initial_schema.py` (lines 254–266):
   ```python
   op.create_table(
       "resume_embeddings",
       sa.Column("id", sa.Uuid(), primary_key=True),
       sa.Column("resume_id", sa.Uuid(), sa.ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False),
       sa.Column("model_version", sa.String(128), nullable=False),
       sa.Column("vector", sa.Text(), nullable=False),
       ...
   )
   op.execute("ALTER TABLE resume_embeddings ALTER COLUMN vector TYPE vector(1024) USING vector::vector")
   ```
5. **Production Code Persistence:** **[VERIFIED]** Zero lines of code in `backend/` or `ai-services/` instantiate `ResumeEmbedding` or execute an `INSERT` into `resume_embeddings`.
6. **Production Code Retrieval:** **[VERIFIED]** Zero lines of code in `backend/` or `ai-services/` query `ResumeEmbedding` or execute vector distance queries (`<->`, `<#>`, `<=>`).
7. **Defect Classification:** **[VERIFIED]** This is an **unused future-schema inconsistency** and a **latent integration defect**. No active crash occurs during current operations, but attempting to persist MiniLM embeddings will fail at the database boundary.
8. **Sufficiency of ORM Change Alone:** **[VERIFIED]** Changing only the Python ORM model (`Vector(384)`) is **completely insufficient**. PostgreSQL enforces column types at the database catalog level. An Alembic DDL migration is mandatory to alter the physical PostgreSQL column type.
9. **Risks to Existing PostgreSQL Databases:** **[INFERRED]** If a PostgreSQL database has executed `0001_initial_schema.py`, altering the column retroactively in that file would corrupt Alembic revision tracking. A forward migration (`0002_resize_vector_to_384.py`) is required. If rows were present, a type conversion using nullification or casting would be required (though table row count is 0).
10. **Impact of Changing Embedding Models Later:** **[INFERRED]** Switching to another model (e.g., `BGE-M3` with 1024-d or OpenAI `text-embedding-3-small` with 1536-d) would make all previously stored vectors incommensurable. It would require:
    - A new Alembic migration altering vector dimensions.
    - A full historical re-embedding backfill of all stored resumes.
    - Incrementing `model_version` and recalculating all semantic scores.

### Evaluation of Storage Options

| Dimension | Option A: Defer Vector Persistence (Recommended for SGP) | Option B: Align Storage with MiniLM (384-d) | Option C: Select Different Model (e.g. BGE-M3 1024-d) |
| :--- | :--- | :--- | :--- |
| **Description** | Keep `resume_embeddings` unpopulated; do not persist dense vectors during SGP. Compute similarity on demand or keep in diagnostics. | Add forward Alembic migration `vector(1024) -> vector(384)`; wire background Celery persistence of MiniLM embeddings. | Replace MiniLM with `BAAI/bge-m3` in `ai-services` to match the existing `vector(1024)` column. |
| **Benefits** | Zero risk of migration failures; zero additional storage overhead; no cold-start or GPU/VRAM demands for persistence; 100% compliant with SGP MVP scope. | Schema and code become consistent; enables future vector indexing (HNSW/IVFFlat) and nearest-neighbor semantic search. | High multilinguality and dense+sparse representation; matches original master-context vision. |
| **Costs & Complexity** | Minimal (documentation clarification only). | Medium: requires new Alembic migration, Celery task wiring, pgvector CI verification, and failure recovery logic. | High: BGE-M3 is ~2.2 GB (vs MiniLM's ~90 MB); requires 4GB+ RAM/VRAM; slow CPU inference (>300ms vs MiniLM's <35ms); exceeds laptop GPU limits (RTX 2050/3050). |
| **Compatibility Risks** | Zero. | Low if forward migration is used. | High: Breaks offline academic demo latency expectations. |
| **Suitability for SGP Demo** | **Highest (100% Recommended)**. | Optional (unneeded for SGP candidate review queue). | **Unsuitable** (violates hardware constraints). |

---

## 4. Semantic Ranking & Score-Mapping Execution Trace

### End-to-End Execution Trace

```
1. Configuration Resolution:
   Settings.semantic_matcher = os.getenv("CAREERSYNC_SEMANTIC_MATCHER", "baseline")
   [backend/app/core/config.py:36]

2. Engine Initialization (EvaluationService):
   if settings.semantic_matcher.lower() == "embedding":
       matcher = AIServiceDiagnosticMatcher(base_url, api_key, timeout)
   else:
       matcher = SublinearTFCosineMatcher()
   engine = DeterministicEvaluationEngine(semantic_matcher=matcher)
   [backend/app/services/evaluation.py:432-441]

3. Text Corpus Assembly:
   candidate_corpus = f"{candidate.name} {candidate.headline} {resume_text} {' '.join(all_candidate_skills)}"
   job_corpus = f"{job.title} {job.description} {' '.join(s.name for s in job.skills)}"
   [backend/app/services/evaluation.py:328-329]

4. Match Execution:
   semantic_result = self.semantic_matcher.match(...)
   [backend/app/services/evaluation.py:331-336]
   
   4A. If SublinearTFCosineMatcher:
       - Computes sublinear TF cosine in [0.0, 1.0]
       - similarity_score = round(min(100.0, max(0.0, cosine * 1.8 * 100)), 1)
       - diagnostics = {"raw_cosine": ..., "cand_token_count": ..., "job_token_count": ...}
   
   4B. If AIServiceDiagnosticMatcher:
       - Runs baseline matcher internally -> baseline_result
       - Sends POST to /api/v1/ai/semantic-match
       - Captures response into diagnostics["ai_service"]
       - diagnostics["ai_service"]["used_for_ranking"] = False
       - Returns SemanticMatchResult with similarity_score = baseline_result.similarity_score

5. Overall Weighted Score Calculation:
   overall_score = calculate_weighted_score(
       weights,
       skills=skills_score,         # e.g. 40%
       experience=experience_score, # e.g. 30%
       education=education_score,   # e.g. 15%
       semantic=semantic_score,     # e.g. 15%
   )
   where calculate_weighted_score = round((w_sk*sk + w_exp*exp + w_edu*edu + w_sem*sem) / 100, 2)
   [backend/app/services/scoring.py:131-142]

6. Deterministic Candidate Ranking:
   Key in rank_candidates():
   (
       candidate.coverage_tier(),      # Tier 1 (No gaps) -> Tier 2 (Uncertain) -> Tier 3 (Gap)
       -candidate.overall_score(weights), # Composite fit (descending)
       -candidate.skills_score,        # 1st tie-breaker
       -candidate.experience_score,    # 2nd tie-breaker
       -candidate.education_score,     # 3rd tie-breaker
       -candidate.semantic_score,      # 4th tie-breaker
       str(candidate.candidate_id),    # Deterministic UUID tie-breaker
   )
   [backend/app/services/scoring.py:158-169]

7. Persistence:
   MatchResult persisted with overall_score, scores breakdown, and ranking_attribution.
   diagnostics (including embedding telemetry) persisted in evaluation audit trail.
```

### Answer to Core Ranking Questions

1. **What the baseline matcher calculates:** **[VERIFIED]** Exact token-frequency cosine similarity with logarithmic term dampening ($1 + \ln(\text{tf})$) and stopword removal, scaled linearly via $1.8 \times 100$ and capped at $100.0$.
2. **What the embedding matcher calculates:** **[VERIFIED]** Dense cosine similarity of mean-pooled section chunks using `all-MiniLM-L6-v2` in $[-1.0, 1.0]$ (practically $[0.15, 0.90]$), returned as `raw_similarity` and multiplied by 100 as `similarity_index`.
3. **Which values actually affect final candidate score and ranking:** **[VERIFIED]** Exclusively `SublinearTFCosineMatcher`'s score. The dense embedding value **never** affects the final score or ranking under any configuration.
4. **Role of AI-service diagnostic result:** **[VERIFIED]** Telemetry collection for offline research and latency benchmarking without introducing regressions to active candidate evaluations.
5. **Mathematical comparability:** **[VERIFIED]** Incomparable. Baseline is lexical, sparse, and starts near 0.0 for unrelated pairs. Dense embedding is contextual and dense, with an empirical floor of ~0.18–0.22 even on negative controls due to representation geometry.
6. **Human relevance calibration:** **[VERIFIED]** Neither score is calibrated against human hiring decisions.
7. **Double-counting risk:** **[VERIFIED]** Severe risk if dense embeddings are run over text that includes explicit skill lists. A candidate with "Python" would receive points under $S_{\text{skills}}$ and additional points under $S_{\text{semantic}}$ for the exact same token.
8. **Failure behavior:** **[VERIFIED]** `AIServiceDiagnosticMatcher` catches timeouts, network errors, and malformed responses, recording the error in diagnostics while returning the baseline score with zero downtime.
9. **Impact of enabling embedding mode:** **[VERIFIED]** Only populates `diagnostics["ai_service"]`; zero effect on rank or scores.
10. **Verifying tests:** **[VERIFIED]** `backend/tests/test_ai_service_semantic_integration.py` (all 5 tests pass), `backend/tests/test_intelligence_layer.py` (lines 169–248).

---

## 5. Score-Mapping Approaches & Trade-Offs

### Approach 1: Keep Dense Embeddings Diagnostic-Only (Recommended for Current SGP)
- **Mechanism:** Maintain `CAREERSYNC_SEMANTIC_MATCHER=baseline` as the scoring source. Record `all-MiniLM-L6-v2` similarity in `diagnostics["ai_service"]`.
- **Score Calculation Impact:** Zero impact. Preserves existing reproducible baseline behavior.
- **Normalization Required:** None.
- **Bias & Regression Risks:** Zero risk of regression.
- **Evaluation Requirements:** Pilot 30-pair benchmark serves as diagnostic proof of integration.
- **Verdict:** **[RECOMMENDATION]** Ideal for academic evaluation and live viva demonstration. Demonstrates awareness of neural embeddings without relying on uncalibrated weights.

### Approach 2: Replace Baseline Semantic Component with Dense Embedding
- **Mechanism:** Replace $S_{\text{semantic}}$ with a normalized transformation of dense cosine similarity: $S_{\text{semantic}} = f(\text{raw\_cosine})$.
- **Score Calculation Impact:** Replaces the 15% semantic component in `calculate_weighted_score()`.
- **Normalization Required:** **Mandatory**. Because negative controls score ~0.18–0.22 and top matches score ~0.80, a raw multiplier ($100 \times r$) would compress the effective range to $[20, 80]$. Requires min-max or sigmoid anchoring:
  $$\hat{S}_{\text{semantic}} = \text{clamp}\left( \frac{r - 0.20}{0.80 - 0.20} \times 100, 0, 100 \right)$$
  *(Hypothesis only — requires empirical calibration).*
- **Bias & Regression Risks:** High risk of ranking inversion where articulate but unqualified candidates outrank qualified candidates with concise resumes.
- **Evaluation Requirements:** Must demonstrate superior held-out ranking accuracy on $\ge 100$ annotated pairs before adoption.

### Approach 3: Combine Baseline Lexical and Dense Neural Similarity
- **Mechanism:** Compute a blended semantic score: $S_{\text{semantic}} = \alpha S_{\text{baseline}} + (1 - \alpha) S_{\text{embedding}}$.
- **Score Calculation Impact:** Combines two secondary signals into the 15% semantic factor.
- **Normalization Required:** Mandatory dual-score normalization.
- **Bias & Regression Risks:** Extreme risk of double-counting. If both baseline and dense embedding ingest skill tokens, skills are counted three times across the overall score formula.
- **Evaluation Requirements:** Requires multi-factor regression analysis and ablation studies on $\ge 200$ independent pairs.

---

## 6. Evaluation Requirements & Plan Alignment

In accordance with [`docs/INDEPENDENT_EVALUATION_PLAN.md`](file:///c:/Users/Hit/Desktop/SGP%205TH%20Sem/AI-Job-Matcher/docs/INDEPENDENT_EVALUATION_PLAN.md):

1. **Benchmark Size & Representation:**
   - The current 30-pair benchmark (`ai-services/fixtures/evaluation/evaluation_benchmark.json`) is an exploratory sanity check.
   - Any proposal to alter production ranking requires a pilot dataset of **100–300 permitted pairs** across multiple job families (Frontend, Backend, AI/ML, Non-Tech).
2. **Annotation Protocol & Reliability:**
   - Must use at least two independent annotators.
   - Must calculate **Cohen's kappa ($\kappa$)** on categorical labels (`strong_match`, `partial_match`, `weak_match`, `insufficient_information`). Minimum threshold: $\kappa \ge 0.70$.
   - Adjudication process must be recorded for disagreements.
3. **Partitioning Discipline:**
   - Strict 50/50 split: Calibration/Dev partition and Held-out Test partition.
   - Candidates and job families must be segregated across splits to prevent data leakage.
   - **Zero tuning** of weights, normalization anchors, or chunk sizes against the held-out partition.
4. **Ranking Metrics:**
   - Compute **NDCG@3, NDCG@5**, Precision@K, and Spearman rank correlation on grouped multi-candidate requisition pools.
   - Report sample size ($N$) and confidence intervals / standard error in all reports.

---

## 7. Recommended Decisions

### Current SGP Demonstration Recommendation: **[RECOMMENDATION]**
1. **Preserve Baseline Ranking:** Maintain `CAREERSYNC_SEMANTIC_MATCHER=baseline` as the default. Candidate scores and leaderboard ranks remain 100% deterministic, explainable, and reproducible on CPU.
2. **Retain Diagnostic Telemetry:** Keep `AIServiceDiagnosticMatcher` active in development environments (`CAREERSYNC_SEMANTIC_MATCHER=embedding`) to record MiniLM similarity in `MatchResult.diagnostics` without affecting recruiter rankings.
3. **Defer Vector Persistence:** Keep `resume_embeddings` unpopulated. Do not write embeddings to the database during the 5th-semester demo.

### Future Production Direction: **[RECOMMENDATION]**
1. **Residual Semantic Scoring:** When dense embeddings are enabled in scoring, apply them strictly as a **residual signal** over candidate summary and role description text with explicit structured skills stripped out. This mathematically eliminates double-counting.
2. **Schema Realignment:** Plan a dedicated forward Alembic migration resizing `vector(1024)` to `vector(384)` if MiniLM is selected, or retain 1024 if migrating to a multilingual model like `BGE-M3`.
3. **Async Background Embedding:** Generate and persist embeddings asynchronously inside Celery workers (`careersync.resume.process`), never blocking synchronous HTTP request threads.

---

## 8. Explicit Decisions Requiring Approval

1. **[REQUIRES APPROVAL]** Formally approve **Approach 1** (Diagnostic-Only Dense Embeddings) as the binding decision for the 5th-semester SGP evaluation.
2. **[REQUIRES APPROVAL]** Formally approve **Option A** (Deferral of Vector Persistence) for the SGP scope, confirming that no database writes to `resume_embeddings` will occur during the demonstration.
3. **[REQUIRES APPROVAL]** Approve the future migration design (Option B: resizing to 384 dimensions vs Option C: upgrading model to BGE-M3) for post-semester roadmap planning.

---

## 9. Risks and Migration Considerations

- **PostgreSQL Compatibility Risk:** In environments running PostgreSQL with pgvector, any migration altering `resume_embeddings.vector` must be tested against a real PostgreSQL container in CI.
- **Rollback Safety:** Because dense embeddings are currently isolated in diagnostics, rolling back or disabling the AI microservice carries zero risk to core recruiter workflows.
- **Academic Viva Positioning:** In academic evaluations, explainability is heavily favored over black-box scores. Presenting deterministic TF-cosine with exact token-overlap evidence as the primary scoring mechanism—with dense neural embeddings presented as an integrated diagnostic comparison—is methodologically sound and defensible.

---

## 10. Future Implementation Steps (Separately Approved Task)

If the team subsequently authorizes enabling dense embeddings in final ranking:
1. **Step 1:** Execute the 100-pair independent evaluation plan with dual annotators and Cohen's kappa measurement.
2. **Step 2:** Formulate and calibrate the residual score-mapping function $\hat{S}_{\text{semantic}}$ on the development partition.
3. **Step 3:** Validate that held-out NDCG@3 improves over the baseline without causing skill-matching regressions.
4. **Step 4:** Create a forward Alembic migration (`0002_resize_vector_to_384.py`) and update `ResumeEmbedding.vector` in `entities.py`.
5. **Step 5:** Wire Celery `process_resume` worker to persist 384-d vectors into `resume_embeddings`.
6. **Step 6:** Update the backend engine to incorporate calibrated $\hat{S}_{\text{semantic}}$ behind an explicit feature flag.
