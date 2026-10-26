# CareerSync AI — System Architecture & Topology

**Status:** Authoritative Architectural Baseline  
**Target Milestone:** 5th Semester System Development Project (SGP)  

---

## 1. System Runtime Shape

```text
Next.js 16 (Port 3000) ──HTTP REST──► FastAPI Backend (Port 8000) ──SQLAlchemy 2.0──► PostgreSQL 16
(App Router, React 19)                ├── Security & Ownership Authority              ├── Relational Schema (15 Tables)
                                       ├── Deterministic Recruiter Ranking             └── pgvector (Vector 1024; Deferred)
                                       └── Diagnostic Adapter ──────────────────────► AI Microservice (Port 8001)
                                            (CAREERSYNC_SEMANTIC_MATCHER)              ├── Contract v1.1.0 Standard
                                                                                       ├── PDF / DOCX Document Parsers
                                                                                       └── all-MiniLM-L6-v2 (CPU Diagnostic)
```

### Architectural Principles:
1. **Monolith as Security & Domain Authority:** The FastAPI backend (`backend/app`) is the sole arbiter of identity, role permissions, tenant isolation, and candidate ranking. Frontend routes and middleware are presentation layers, never authorization boundaries.
2. **Deterministic Recruiter Ranking Invariant:** Candidate ranking is driven 100% deterministically by `DeterministicEvaluationEngine` (`backend/app/services/evaluation.py`) using `CoverageTier` ordering and `SublinearTFCosineMatcher` ($1 + \ln(\text{tf})$).
3. **Diagnostic Neural Matcher Separation:** Dense neural embeddings (`sentence-transformers/all-MiniLM-L6-v2`) in `ai-services` serve strictly as an exploratory diagnostic signal under Contract v1.1.0. They do **not** dictate or override candidate ranking in production.
4. **Architectural Decision Record (ADR):** For the mathematical, distributional, and storage justification of this separation, see:
   - **[`docs/decisions/ADR-001-embedding-and-ranking-architecture.md`](decisions/ADR-001-embedding-and-ranking-architecture.md)**

---

## 2. Domain Data Flow

```text
Job Requisition ──► Requirements & Weights ──► Candidate Profile ──► Resume Document
                                                                           │
                                                                   Upload Validation
                                                                (10MB, PDF/DOCX, SHA-256)
                                                                           ▼
Application (Bridge) ──► EvaluationRun (Fingerprinted) ──► Immutable MatchResult (Snapshot)
                                                                ├── CoverageTier (1 to 4)
                                                                ├── Weighted Fit Score (0-100)
                                                                ├── Verbatim Evidence Claims (Offsets)
                                                                └── Audit Event Logged
```

### Key Domain Rules:
- **`Application` as First-Class Bridge:** Connects a candidate to a job. Recruiter uploads create application records under the job tenant without mutating the candidate's personal profile.
- **`MatchResult` Immutability:** Match results are point-in-time immutable records. Changing job weights, updating a candidate profile, or triggering a batch re-evaluation produces a new `EvaluationRun`; historical evaluations are never overwritten in place.
- **Verbatim Grounding:** Evidence claims must record exact character offsets into the raw extracted text. Unmentioned skills are classified as `NOT_DETECTED` rather than speculative `GAP`.

---

## 3. Security, Privacy & Invariant Boundaries

1. **Role-Based Tenant Isolation:**
   - Recruiters can only access candidates, applications, resumes, and evaluation notes associated with jobs they own.
   - Candidates can only inspect their own applications and profile resumes. Internal recruiter scoring weights are redacted (returned as 0).
2. **Document Ingestion Security:**
   - Streamed uploads are capped at 10 MB.
   - Content types are checked against magic bytes (`%PDF-`, `PK\x03\x04`).
   - PDF page limits (maximum 15 pages) and DOCX archive safety (decompression ceiling 30MB, entry count <= 500, ratio <= 50:1) prevent parser denial-of-service.
   - File storage keys are random UUIDs; direct filesystem paths are never stored in the database.
3. **Data Privacy & Local Inference:**
   - Zero candidate data or resume texts are transmitted to external third-party proprietary APIs (OpenAI, Gemini, Anthropic).
   - Candidate email addresses are masked (`j***e@domain.com`) in server logs.
   - AI microservice endpoints mandate `X-AI-Service-Key` header authentication.
