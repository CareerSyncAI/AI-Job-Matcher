# CareerSync AI — Focused Delta Audit Report

**Date of Audit:** October 17, 2026  
**Auditor:** Antigravity (Advanced Agentic AI Pair Programmer)  
**Target Repository:** `CareerSyncAI/AI-Job-Matcher`  
**Current Head Commit:** `136f432f4657b30d0fbc6fb6b9e59af3f1ffa1ee`  
**Git Worktree State:** Clean (`nothing to commit, working tree clean`)  
**Active Working Branch:** `main` (tracking `origin/main`)  
**Document Status:** Complete & Authoritative Delta Audit  

---

## Executive Summary & Safety Record

### Repository Baseline Verification
Prior to static inspection and isolated validation, the repository state was recorded:
- **Active Branch:** `main` (Up to date with `origin/main`).
- **Worktree Status:** Clean (no uncommitted user modifications).
- **Remote Configuration:** `origin` -> `https://github.com/CareerSyncAI/AI-Job-Matcher.git`.
- **Active Commits Reviewed:** Audited delta from commit `1be7900` (subject of Second Deep Audit) up to `HEAD` (`136f432`).
- **Safety Invariants Maintained:** No application source code, schemas, migrations, dependencies, or environment configurations were modified. No models or packages were downloaded. No test was run against any production or development database.

---

## Authoritative Documentation Cross-Reference

| Reported Document Path | Actual Repository Path | Status & Discrepancies |
| :--- | :--- | :--- |
| `careersync-ai-master-context.md` | `careersync-ai-master-context.md` | **Verified Present**. Section numbers verified (0, 4, 8A, 15, 21). Contains internal version/stack contradictions (Next.js 15.5 vs 16.3; active branch develop vs main). |
| `docs/PROJECT_STATUS.md` | `docs/PROJECT_STATUS.md` | **Verified Present**. Summarizes completed Phase 0-2 and frontend milestone. |
| `docs/audits/CareerSyncAI_Second_Deep_Audit.md` | `docs/audits/CareerSyncAI_Second_Deep_Audit.md` | **Verified Present**. Audited commit `1be7900`. 13 subsequent commits recorded in git history. |
| `docs/INDEPENDENT_EVALUATION_PLAN.md` | `docs/INDEPENDENT_EVALUATION_PLAN.md` | **Verified Present**. Defines benchmark protocol (100–300 pairs, 2 annotators, held-out split). |
| Existing integration checklists | `docs/AI_SERVICE_INTEGRATION_CHECKLIST.md` | **Verified Present**. Defines pending semantic score mapping and diagnostic handoff. |
| Relevant AI-service documentation | `docs/ai-service-contract.md` | **Verified Present**. v1.1.0 contract authoritative specification. |

---

## Finding 1: Missing Backend Test Fixture (Test Suite Reproducibility)

- **Status:** **CONFIRMED DEFECT**
- **Repository Paths:**
  - `backend/tests/test_api.py` (Lines 298, 403)
  - `.gitignore` (Lines 56–59)
  - `career-sync-storage/sample_real_resume.docx` (Untracked local artifact)
- **Relevant Functions / Tests:**
  - `test_e2e_real_resume_worker_and_ai_integration` (`backend/tests/test_api.py:280`)
  - `test_ai_off_graceful_degradation` (`backend/tests/test_api.py:377`)
- **Evidence Supporting Finding:**
  1. In `backend/tests/test_api.py`, lines 298 and 403 hardcode:
     ```python
     sample_file = Path(__file__).parents[2] / "career-sync-storage" / "sample_real_resume.docx"
     with open(sample_file, "rb") as f:
         doc_bytes = f.read()
     ```
  2. In `.gitignore`, lines 56–59 explicitly ignore:
     ```gitignore
     career-sync-storage/uploads/
     career-sync-storage/*.docx
     career-sync-storage/*.doc
     career-sync-storage/*.pdf
     ```
  3. `git ls-files career-sync-storage` returns empty. The file `sample_real_resume.docx` is not tracked in Git.
  4. While the file exists locally on the developer machine (allowing local tests to pass), any clean clone (including GitHub Actions CI runner) lacks this file.
  5. Execution on a clean checkout raises: `FileNotFoundError: [Errno 2] No such file or directory: '.../career-sync-storage/sample_real_resume.docx'`.
- **Actual Test Commands & Observed Results:**
  - Safe local test executed: `python -m pytest backend/tests/test_api.py -k "test_e2e_real_resume_worker_and_ai_integration or test_ai_off_graceful_degradation" -v`
  - Observed result: `2 passed in 4.88s` solely because untracked file exists on local disk. In CI or fresh clone, both tests immediately fail.
- **Impact on Recruiter Demonstration:**
  - Low impact on local live demonstration if running on this specific machine.
  - High impact on CI reproducibility, grading review, and fresh clone validation by evaluators.
- **Recommended Resolution:**
  1. Commit a synthetic, non-PII DOCX fixture to a dedicated test directory: `backend/tests/fixtures/synthetic_sample_resume.docx`.
  2. Update `test_api.py` lines 298 and 403 to load from `Path(__file__).parent / "fixtures" / "synthetic_sample_resume.docx"`.
  3. Alternatively, utilize the existing in-memory fixture helper `_create_docx_resume_bytes()` defined at line 5 of `backend/tests/test_api.py`.
- **Dependencies & Compatibility Risks:** Zero risk to production runtime.
- **Approval Required:** Yes (file path and fixture change approval).

---

## Finding 2: Embedding-Dimension Mismatch (Vector Schema vs Model)

- **Status:** **CONFIRMED DEFECT / UNUSED SCHEMA INCONSISTENCY (LATENT INTEGRATION DEFECT)**
- **Repository Paths:**
  - `backend/app/models/entities.py` (Line 346)
  - `backend/alembic/versions/0001_initial_schema.py` (Lines 254–266)
  - `ai-services/src/similarity/embedding_matcher.py` (Lines 30–32, 52)
  - `docs/DATABASE.md` (Line 12)
  - `careersync-ai-master-context.md` (Section 13, Line 418)
- **Relevant Classes & Models:**
  - `ResumeEmbedding` (`backend/app/models/entities.py:338`)
  - `vector: Mapped[list[float]] = mapped_column(Vector(1024))`
  - Migration: `0001_initial_schema.py:266` (`ALTER TABLE resume_embeddings ALTER COLUMN vector TYPE vector(1024) USING vector::vector`)
  - AI Service Engine: `SentenceEmbeddingMatcher` (`ai-services/src/similarity/embedding_matcher.py:27`)
- **Evidence Supporting Finding:**
  1. The deployed AI service uses `sentence-transformers/all-MiniLM-L6-v2` (pinned commit `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`).
  2. The real dense vector dimension of `all-MiniLM-L6-v2` is **384**.
  3. The database entity `ResumeEmbedding` and the Alembic migration define the column as `Vector(1024)`.
  4. The 1024-dimension was specified in early planning when `BGE-M3` was considered (Master Context Section 13).
  5. Static grep confirms **zero read or write queries** reference `ResumeEmbedding` or `resume_embeddings` anywhere in application endpoints, tasks, or services.
  6. Direct SQLite inspection of `backend/careersync.db` confirms table `resume_embeddings` contains exactly **0 rows**.
- **Nature of Defect:**
  - Not an active crash defect today because the table is unpopulated and unreferenced in data pipelines.
  - A confirmed **latent integration defect**: attempting to persist real 384-d embeddings into pgvector's `vector(1024)` column will fail with a dimension mismatch error (`ERROR: different vector dimensions 384 and 1024`).
- **Comparison of Possible Resolutions:**
  - *Option A (Resize Schema):* Add a new Alembic migration altering column `vector` to `Vector(384)` and update `entities.py`. This aligns the schema with the implemented `all-MiniLM-L6-v2` model.
  - *Option B (Explicit Deferral):* Document `resume_embeddings` as a deferred future feature for semantic search/clustering, keeping it uncoupled from current evaluation.
  - *Option C (Remove Infrastructure):* Drop `ResumeEmbedding` from models and migrations until vector retrieval is active.
- **Recommended Resolution:** Option A (Resize schema to 384 via a forward Alembic migration), or Option B if the team still plans to evaluate `BGE-M3` later.
- **Impact on Recruiter Demonstration:** None (demonstration uses deterministic scoring and in-memory similarity diagnostics).
- **Dependencies & Compatibility Risks:** Requires pgvector migration in environments running PostgreSQL.
- **Approval Required:** Yes (database schema modification decision).

---

## Finding 3: Semantic Score-Mapping Decision (Baseline vs Embedding Influence)

- **Status:** **VERIFIED ARCHITECTURAL STATE (PENDING RESOLUTION)**
- **Repository Paths:**
  - `backend/app/core/config.py` (Line 36: `semantic_matcher: str = "baseline"`)
  - `backend/app/services/semantic_matcher.py` (Lines 50–178: `SublinearTFCosineMatcher`, Lines 180–304: `AIServiceDiagnosticMatcher`)
  - `backend/app/services/evaluation.py` (Lines 327–356, Lines 432–441)
  - `backend/app/services/scoring.py` (Lines 131–142, Lines 154–170)
  - `docs/AI_SERVICE_INTEGRATION_CHECKLIST.md` (Lines 40–56)
- **Behavior of Configuration Flags:**
  - `CAREERSYNC_SEMANTIC_MATCHER` (Backend):
    - Default mode: `"baseline"`. Initializes `SublinearTFCosineMatcher`. Computes $1 + \ln(\text{tf})$ cosine similarity scaled to $[0, 100]$ via $\min(100.0, \text{cosine} \times 1.8 \times 100)$. Contributes directly to `overall_score` via `weights.semantic`.
    - Diagnostic mode: `"embedding"`. Initializes `AIServiceDiagnosticMatcher`. Calls AI-service `/api/v1/ai/semantic-match`. **Critically, the returned embedding similarity is stored exclusively in `diagnostics["ai_service"]` with `"used_for_ranking": False`. The actual `similarity_score` returned for scoring and ranking remains the baseline fallback score.**
  - `SEMANTIC_MATCHER` (AI Service):
    - Default mode: `"baseline"`. Uses `BaselineSemanticMatcher`.
    - Set to `"embedding"`: Uses `SentenceEmbeddingMatcher` (`all-MiniLM-L6-v2`).
- **Does Semantic Similarity Influence Final Ranking?**
  - **Baseline TF-Cosine:** **YES**, it contributes 15% (default `JobWeights.semantic`) to composite fit and acts as the 4th tie-breaker in `rank_candidates()`.
  - **Dense Embedding (MiniLM):** **NO**, it does not influence ranking. It is strictly recorded as diagnostic telemetry.
- **Evaluation Plan for Resolving Score-Mapping:**
  - **Candidate Approaches:**
    1. *Approach A (Existing Baseline):* Sublinear TF-cosine with 1.8x calibration. High explainability, fast CPU execution (<0.1ms), but purely lexical.
    2. *Approach B (Semantic Similarity Alone):* Direct mapping of cosine distance from `all-MiniLM-L6-v2`. Risk: neural embedding captures general topical similarity (e.g. general tech jargon) and can overshadow missing mandatory qualifications.
    3. *Approach C (Hybrid Residual Fit - Recommended):* Semantic similarity is computed only on free-text experience summary and role descriptions after explicit structured skills are extracted and scored. This guarantees zero double-counting of required competencies.
  - **Score Normalization:** Raw cosine $r \in [0, 1]$ mapped via piecewise linear or calibrated sigmoid anchoring $r=0.4 \rightarrow 50$, $r=0.7 \rightarrow 85$.
  - **Evidence Attribution:** Semantic similarity cannot declare a skill "Matched" or "Gap"; evidence must remain verbatim source text.
  - **Failure Behavior:** Any HTTP error, timeout (>15s), or degraded state automatically falls back to baseline with explicit `fallback_reason`.
  - **Reproducibility:** Seed, model ID, pinned commit (`1110a243`), and device must be stamped in `MatchResult.diagnostics`.
- **Impact on Recruiter Demonstration:** Preserving baseline behavior ensures 100% deterministic, explainable ranking for the academic demonstration.
- **Approval Required:** Yes (team agreement before enabling embedding in ranking).

---

## Finding 4: Master-Context Contradictions & Documentation Drift

- **Status:** **CONFIRMED DOCUMENTATION DEFECTS & DRIFT**
- **Repository Paths:**
  - `careersync-ai-master-context.md`
  - `frontend/package.json`
  - `backend/app/models/enums.py`
  - `backend/requirements.txt`
  - `ai-services/requirements.txt`

### Detailed Discrepancy Matrix

| Item | Master Context Document | Actual Repository Implementation | Classification | Proposed Minimal Correction |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js Version** | Section 16 states: `Next.js 15.5.x` (Do not upgrade to 16.x). Section 22 states: `Next.js 16.3.0`. | `frontend/package.json` specifies `"next": "16.3.8"`, `"react": "19.2.8"`. | **Internal Contradiction / Outdated Doc** | Update Section 16 to state `Next.js 16.3.x (Turbopack) & React 19.x`, aligning with Section 22 and `package.json`. |
| **State Management** | Section 16 mentions `Zustand (app-store.ts)`. | Section 22 notes Zustand was cleanly removed. `package.json` has no Zustand. | **Outdated Documentation** | Remove Zustand reference from Section 13 and 16. |
| **Active Git Branch** | Section 1 states: `Repository: AI-Job-Matcher, active branch develop`. | Active branch is `main` (`HEAD -> origin/main`). All active PRs target `main`. | **Outdated Documentation** | Update Section 1 to designate `main` as active development and release branch. |
| **Embedding Model** | Section 13 & 16 list `BGE-M3 (Hybrid dense+sparse)`. | Implemented: `sentence-transformers/all-MiniLM-L6-v2` (pinned rev `1110a243`). | **Intentional Architectural Decision** | Update Section 13 & 16 to reflect `all-MiniLM-L6-v2` on CPU as current implementation, noting `BGE-M3` as future research. |
| **Document Parsers** | Sections 13, 15A, 16 specify `Docling`. | Code uses `pdfplumber` + `pypdf` for PDF, `python-docx` for DOCX. No Docling dependency. | **Intentional Architectural Decision** | Update parser specs to `pdfplumber / python-docx` (Docling staged as future async worker milestone). |
| **Entity Extractor** | Sections 13, 15A, 16 specify `GLiNER`. | Code uses regex/rule-based extractors (`SkillExtractor`, `ExperienceExtractor`, `EducationExtractor`). No GLiNER dependency. | **Intentional Architectural Decision** | Clarify that extraction is currently deterministic rule-based, with GLiNER staged for future phases. |
| **Fuzzy Matcher** | Sections 13, 16 specify `RapidFuzz`. | Uses `difflib.SequenceMatcher` from standard library. `rapidfuzz` not in `requirements.txt`. | **Implementation Discrepancy** | Either document standard library `difflib` token ratio or install `rapidfuzz` in requirements. |
| **User Roles & Admin Scope** | Section 7 says `Admin: OUT OF SCOPE`. Mentions only Recruiter and Candidate. | `backend/app/models/enums.py` defines `CANDIDATE`, `RECRUITER`, `ADMIN`. `ADMIN` role is enforced on `/api/v1/evaluation/benchmark`. | **Incomplete Specification** | Clarify that `ADMIN` is a restricted backend-only system role for benchmark evaluation, but has no dedicated frontend portal. |
| **"Guest" Role** | Discussed in historical prompts. | No "Guest" role exists anywhere in backend or frontend. | **Obsolete / Non-Existent Concept** | Reaffirm no Guest role exists; keep unauthorized access blocked. |
| **Frontend Route Structure** | Section 12 lists `/jobs`, `/jobs/[jobId]/candidates`, `/jobs/[jobId]/comparison`. | Implemented routes: `/dashboard/recruiter/jobs`, `/dashboard/recruiter/candidates`, `/dashboard/recruiter/pipeline`. | **Outdated Documentation** | Update Route Architecture table in Section 12 to match actual `/dashboard/recruiter/*` routes. |

- **Impact on Recruiter Demonstration:** High documentation confusion for academic graders; zero code break if code is untouched.
- **Approval Required:** Yes (documentation correction approval).

---

## Finding 5: Document-Upload Hardening Verification

- **Status:** **MIXED: CORE VALIDATIONS VERIFIED; ADVANCED GUARDS MISSING**
- **Repository Paths:**
  - `backend/app/services/storage.py`
  - `backend/app/services/text_extraction.py`
  - `backend/app/api/v1/resumes.py`
  - `ai-services/src/api/app.py`
  - `ai-services/src/parsers/pdf_parser.py`
  - `ai-services/src/parsers/docx_parser.py`

### Detailed Hardening Audit Matrix

| Security / Integrity Control | Current Implementation State | Status | Evidence / Repository Location |
| :--- | :--- | :--- | :--- |
| **File Extension & MIME Validation** | Validated against `{".pdf", ".docx"}` and mapped MIME types in `ALLOWED_MIME_TYPES`. | **VERIFIED PRESENT** | `storage.py:41–48` rejects extension/MIME disagreements with HTTP 415. |
| **Magic-Byte / Signature Check** | PDF must start with `%PDF-` (`b"%PDF-"`); DOCX must start with ZIP signature `PK\x03\x04`. | **VERIFIED PRESENT** | `storage.py:49–52` rejects invalid binary headers with HTTP 415. |
| **Maximum Upload Size** | 10 MB strict limit (`max_upload_bytes = 10 * 1024 * 1024`). | **VERIFIED PRESENT** | `storage.py:59–64` reads up to `limit + 1`, raises HTTP 413 if exceeded. AI service also streams with 10MB cap. |
| **Filename Sanitization** | Non-alphanumeric stripped, backslashes normalized, invalid `.`/`..` rejected, length capped to 255. | **VERIFIED PRESENT** | `storage.py:30–38` (`safe_filename`). |
| **Path Traversal Protection** | Storage key is strictly generated UUID (`uuid4() + extension`). User filename is never used in path. | **VERIFIED PRESENT** | `storage.py:73–77`. In addition, `delete_storage_key` verifies `candidate.parent == root`. |
| **Empty File Handling** | Rejects 0-byte payload with HTTP 400. | **VERIFIED PRESENT** | `storage.py:61–62`. |
| **Corrupt / Unreadable Files** | Caught during extraction; flags resume as `NEEDS_ATTENTION` with reason `PARSE_FAILED`. | **VERIFIED PRESENT** | `resumes.py:155–163` & `text_extraction.py:25`. |
| **PDF Page Count Limit** | **NO page count limit** exists. `pdfplumber` iterates through all pages in input PDF. | **CONFIRMED DEFECT** | `text_extraction.py:37` & `pdf_parser.py:47`. A 100-page PDF can exhaust worker memory/CPU. |
| **DOCX ZIP Bomb / Expansion Limit** | `python-docx` opens file stream without verifying uncompressed size or expansion ratio. | **CONFIRMED DEFECT** | `text_extraction.py:64`. High-compression ZIP bomb could cause disk/memory exhaustion. |
| **Extraction Timeout Enforcement** | Synchronous inline extraction in `text_extraction.py` has no process timeout or interrupt handler. | **CONFIRMED DEFECT** | `text_extraction.py:13`. AI service contract specifies 15s, but endpoint handler lacks timeout wrapper. |
| **Hidden / Tiny Text Manipulation** | `page.extract_text()` in `pdfplumber`/`pypdf` extracts all text streams indiscriminately. | **CONFIRMED DEFECT** | White-on-white text, 1pt font, or text outside cropbox is extracted and feeds keyword matching. |
| **Prompt Injection in Document** | Document text is parsed into tokens and entity matches. No LLM generation currently runs. | **VERIFIED RISK** | No active LLM injection vulnerability today, but candidate text must be escaped in UI / Markdown Memos. |

- **Recommended Minimal Fixes:**
  1. Add PDF page limit: Reject or truncate PDFs exceeding 10 pages (`if len(pdf.pages) > 10: raise HTTPException(400, "Resume exceeds maximum 10 pages")`).
  2. Guard DOCX decompression: Inspect `zipfile.ZipFile` total uncompressed size before passing to `docx.Document`, capping expansion at 20MB.
  3. Filter tiny PDF text: Use `pdfplumber` character filtering (`char['size'] >= 5.0`) to ignore invisible/micro text.
- **Impact on Recruiter Demonstration:** High stability benefit; prevents accidental server hang if an unusually large sample resume is uploaded.
- **Approval Required:** Yes (upload policy limits approval).

---

## Finding 6: PostgreSQL and pgvector CI Coverage

- **Status:** **CONFIRMED DEFECT / UNVERIFIED IN CI**
- **Repository Paths:**
  - `.github/workflows/ci.yml` (Lines 10–45)
  - `backend/alembic/versions/0001_initial_schema.py` (Line 266)
  - `backend/tests/conftest.py` (Lines 14, 32–36)
  - `docker-compose.yml` (Lines 1–17: `pgvector/pgvector:pg16`)
- **Evidence Supporting Finding:**
  1. `ci.yml` runs `backend-tests` without a PostgreSQL service container.
  2. `backend/tests/conftest.py` unconditionally forces `os.environ["CAREERSYNC_DATABASE_URL"] = "sqlite://"` and creates an in-memory SQLite engine with `StaticPool`.
  3. Tests execute `Base.metadata.create_all(engine)`. **Alembic migrations are never run during tests or in CI.**
  4. Migration `0001_initial_schema.py` executes PostgreSQL-specific commands:
     - `op.execute("ALTER TABLE resume_embeddings ALTER COLUMN vector TYPE vector(1024) USING vector::vector")`
     - PostgreSQL native enums: `sa.Enum(name="user_role", ...)`
  5. SQLite does not support `pgvector` or `ALTER COLUMN TYPE`. Running `alembic upgrade head` against SQLite fails immediately.
  6. Consequently, PostgreSQL schema migrations are completely unvalidated in CI. Any broken SQL, invalid enum type, or pgvector syntax error is masked.
- **Recommended Isolated CI Proposal:**
  - Add a dedicated GitHub Actions job `backend-postgres-migration` to `.github/workflows/ci.yml`:
    ```yaml
    postgres-migration-tests:
      name: PostgreSQL & pgvector Migration Test
      runs-on: ubuntu-latest
      services:
        postgres:
          image: pgvector/pgvector:pg16
          env:
            POSTGRES_DB: careersync_test
            POSTGRES_USER: careersync
            POSTGRES_PASSWORD: careersync_password
          ports:
            - 5432:5432
          options: >-
            --health-cmd pg_isready
            --health-interval 5s
            --health-timeout 5s
            --health-retries 5
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: "3.11"
        - name: Install dependencies
          run: |
            pip install -r backend/requirements.txt
        - name: Run Alembic Migrations
          working-directory: backend
          env:
            CAREERSYNC_DATABASE_URL: "postgresql+psycopg://careersync:careersync_password@localhost:5432/careersync_test"
          run: |
            alembic upgrade head
            alembic downgrade base
            alembic upgrade head
    ```
- **Dependencies & Compatibility Risks:** Requires Linux runner in CI (standard on GitHub Actions). Zero risk to local developers using SQLite.
- **Approval Required:** Yes (CI workflow modification approval).

---

## Finding 7: Model Evaluation & Independent Benchmark Plan

- **Status:** **VERIFIED BENCHMARK LIMITATIONS (METHODOLOGICAL GAP)**
- **Repository Paths:**
  - `docs/INDEPENDENT_EVALUATION_PLAN.md`
  - `ai-services/fixtures/evaluation/evaluation_benchmark.json`
  - `ai-services/evaluation_report.json`
  - `backend/app/evaluation/benchmark_runner.py`
  - `README.md` (Lines 105–115)
- **Current Benchmark Facts vs Planned Targets:**

| Dimension | `INDEPENDENT_EVALUATION_PLAN.md` Spec | Current Actual Implementation | Discrepancy / Gap |
| :--- | :--- | :--- | :--- |
| **Dataset Size** | 100–300 permitted candidate-job pairs | 30 synthetic curated pairs | **Small Sample Limitation** (30 pairs total). |
| **Split Structure** | Separate dev, tuning, and held-out partitions | 15 dev pairs, 15 held-out test pairs | Partition size (15 pairs) too small for meaningful confidence intervals. |
| **Annotators** | At least 2 independent reviewers + adjudication | 1 author / curated labels; no dual annotation | **Unverified Inter-Annotator Reliability** (no Cohen's kappa). |
| **Reported Metrics** | NDCG@k, Precision@k, Recall@k, Spearman $\rho$ | Pairwise consistency (94.81%), Spearman $\rho$, Pearson $r$ | Ranking NDCG@K not measured on full job candidate lists. |
| **README Claims** | "94.81% Pairwise Consistency" | 94.81% observed across only 15 held-out test pairs | Valid as a pilot smoke test, but sample size limitation must be highlighted. |
| **Extraction Evaluation** | Measured against gold spans | Experience/Education gold labels injected in runner | `benchmark_runner.py` evaluates candidate profile with gold fields injected. |

- **Proposed Smallest Defensible Next Evaluation Step:**
  1. Expand benchmark from 30 to 60 pairs across 4 distinct role families (Frontend, Backend, AI/ML, Non-Tech/Operations).
  2. Implement dual annotation for relevance labels on the 30 new pairs; calculate and report Cohen's kappa $\kappa$.
  3. Keep split strictly 50/50: 30 calibration/dev, 30 held-out test.
  4. Measure NDCG@3 and NDCG@5 on multi-candidate pools per job requisition.
  5. Include sample size ($N=30$) and standard error in all presentation summaries; avoid unqualified accuracy claims.
- **Approval Required:** Yes (evaluation design and benchmark expansion approval).

---

## Finding 8: Remaining Verification Gaps & Demonstration Blockers

- **Status:** **VERIFIED AUDIT STATUS ACROSS STACK**

### Verification Status Matrix

| Component | Status | Empirical Evidence / Test Command | Demonstration Blocker? |
| :--- | :--- | :--- | :--- |
| **Frontend Production Build** | **VERIFIED PASSING** | `npm run build` executed in `frontend/`. 14 static pages generated cleanly in 1584ms with zero TypeScript or Turbopack errors. | **No** (Build is healthy). |
| **AI-Service Model Inference** | **UNVERIFIED / BLOCKED** | Local `ai-services/models/cache` is empty. Running real embedding model inference without cached weights requires network download from Hugging Face, which is blocked by safety instructions. | **No** (Service has graceful fallback to deterministic baseline). |
| **PostgreSQL Migration Behavior** | **UNVERIFIED / BLOCKED** | Requires running PostgreSQL container with pgvector. Tests currently use SQLite `create_all()`. | **No for SQLite demo; Yes for PostgreSQL staging**. |
| **CI on Current `main` Branch** | **VERIFIED FAILING ON FRESH CLONES** | Backend CI fails on fresh clone due to missing `sample_real_resume.docx` (Finding 1). | **No for local demo; Yes for repo acceptance**. |
| **Recruiter Workflow E2E** | **VERIFIED PASSING** | `test_tier1_evaluation_and_recruitment_workflow` in `test_api.py` passes using in-memory DOCX bytes. Recruiter job creation, resume upload, evaluation, ranking, and notes function properly. | **No** (Core flow works). |
| **ATS Analysis Ownership Guard** | **VERIFIED FIXED** | `GET /resumes/{id}/ats` verifies job recruiter ownership (tested at line 160–166 of `test_api.py`). | **No**. |
| **AI Microservice Authentication** | **VERIFIED SECURED** | `verify_ai_service_key` enforces `X-AI-Service-Key` header with 401 on missing/invalid keys. | **No**. |

---

## Prioritized Remediation Roadmap

To prepare CareerSync AI for academic evaluation and final grading, fixes should be executed strictly in the following order:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. REPRODUCIBLE BACKEND TESTS (P1)                                     │
│    Add committed synthetic DOCX fixture; fix test_api.py file paths    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. MASTER-CONTEXT CONSISTENCY (P2)                                     │
│    Align Next.js 16.3, active branch 'main', all-MiniLM-L6-v2, roles   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. EMBEDDING-SCHEMA RESOLUTION (P2)                                    │
│    Decide to resize schema to vector(384) or formally defer table      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. SEMANTIC SCORE-MAPPING DECISION (P2)                                │
│    Formally confirm Residual Hybrid Fit (Approach C) vs Baseline       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. UPLOAD HARDENING (P2)                                               │
│    Enforce PDF page count (10) and DOCX ZIP expansion caps             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. POSTGRESQL / PGVECTOR CI COVERAGE (P3)                              │
│    Add isolated pgvector service container job in GitHub Actions       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 7. BENCHMARK & EVALUATION EXPANSION (P3)                               │
│    Expand to 60 pairs with dual annotation and Cohen's kappa           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 8. END-TO-END DEMO VERIFICATION (P3)                                   │
│    Dry-run complete recruiter SGP scenario on Windows launcher batch   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Unresolved Team Decisions & Blocked Checks

1. **Test Fixture Approach (Team Decision Required):**
   - Option A: Commit a small synthetic `.docx` file (`synthetic_sample_resume.docx`) in `backend/tests/fixtures/`.
   - Option B: Refactor `test_e2e_real_resume_worker_and_ai_integration` and `test_ai_off_graceful_degradation` to use the existing `_create_docx_resume_bytes()` in-memory generator.
2. **ResumeEmbedding Table Resolution (Team Decision Required):**
   - Option A: Add a forward Alembic migration resizing `vector(1024)` to `vector(384)` to match `all-MiniLM-L6-v2`.
   - Option B: Formally mark `resume_embeddings` as an unpopulated deferred feature.
3. **Semantic Scoring Rollout (Team Decision Required):**
   - Keep `CAREERSYNC_SEMANTIC_MATCHER=baseline` for the SGP demonstration, with embedding diagnostics preserved in `ranking_attribution.semantic_diagnostics`.
4. **Blocked Runtime Verifications:**
   - Real offline model inference test without mock is blocked until pre-cached model weights are explicitly supplied.
   - PostgreSQL migration test in local terminal is blocked due to no isolated PostgreSQL/pgvector instance.
