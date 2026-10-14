# CareerSync AI — Project Status & Roadmap

This document provides a consolidated, live overview of project requirements, active architecture, completed milestones, and development roadmap.

---

## 📌 Project Overview & Objectives

CareerSync AI is an AI-assisted recruitment intelligence platform designed for the 5th Semester System Development Project (SGP):
- **For Hiring Teams**: Deterministic multi-factor candidate scoring, explainable verbatim evidence anchoring, and tiered candidate ranking.
- **For Candidates**: Target role compatibility exploration, transparent skill gap identification, and ATS quality resume inspection.

---

## 🎯 Completed Milestones

### Core Matching Engine & Truthfulness (Phase 0)
- [x] **Word-Boundary & Contextual Ambiguity Protection**: Solved substring matching collisions (e.g., JavaScript does not falsely match Java; Google does not match Go; research does not match R).
- [x] **Verbatim Evidence Anchoring**: Stored exact character start/end offsets and source document spans instead of fabricated template snippets.
- [x] **Uncertainty-First Multi-Tier Ranking**: Implemented `CoverageTier` ordering where unconfirmed missing mentions (`not_detected`) are Tier 2, and confirmed disqualifications (`gap`) are Tier 3.
- [x] **Real Metric Calculation**: Replaced fake copies with true token sequence matchers; integrated preferred skills scoring and genuine experience intervals.
- [x] **Loud Parse Failures**: Empty resume extractions and corrupted uploads fail explicitly as `NEEDS_ATTENTION` rather than proceeding to false evaluations.

### Pluggable Similarity Engines & Contract v1.1.0 (Phase 1 & 2)
- [x] **Pluggable Similarity Facade**: Implemented `BaseSimilarityEngine` ABC with dynamic dispatching between baseline and embedding engines via `SEMANTIC_MATCHER`.
- [x] **Deterministic Sublinear TF-Cosine Baseline**: Production default matcher using $1 + \ln(\text{tf})$ and cosine normalization; zero heavy ML dependencies and zero cold-start delay.
- [x] **Pretrained Dense Vector Embedding Matcher**: Implemented `SentenceEmbeddingMatcher` powered by `sentence-transformers/all-MiniLM-L6-v2` with pinned immutable commit `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
- [x] **Section-Aware Bounded Chunking**: Resumes chunked across logical sections (summary, experience, skills, education) with 500-char limits to prevent attention truncation, aggregated via mean pooling.
- [x] **Thread-Safe Lazy Loading & CPU Inference**: Engine cached in memory once per process using `threading.Lock`; verified warm inference latency under 50ms on CPU.
- [x] **Explicit Degraded Fallback**: Missing model files or inference errors automatically fallback to deterministic baseline with `status="degraded"` and an explicit `fallback_reason`.
- [x] **API Contract v1.1.0 Standard**: Updated `/api/v1/similarity` schemas to return `raw_similarity`, `similarity_index`, `method`, `status`, `fallback_reason`, `model_info`, and `diagnostics`.
- [x] **Curated 30-Pair Comparative Benchmark**: Evaluated 15 dev and 15 held-out test pairs across 8 role families:
  - **Held-out Pairwise Accuracy**: 94.81% (Embedding) vs. 85.71% (Baseline).
  - **Overall Pairwise Accuracy**: 94.16% (Embedding) vs. 86.69% (Baseline).
  - **Hard Negative Discrimination**: 100% rejection parity across both engines.

### Security & Privacy Protections
- [x] **Candidate Hijack Prevention**: Recruiter resume uploads containing registered candidate emails are isolated into dedicated unlinked profiles to prevent profile mutation or account hijacking.
- [x] **Job Read Authorization & Weight Redaction**: `GET /jobs/{id}` hides internal weights for candidates and external recruiters, and returns 404 for unowned DRAFT jobs.
- [x] **Safe Demo Seeding**: Auto-seed strictly disabled in production environments; development requires explicit configuration.
- [x] **AI Microservice Security**: Added `X-AI-Service-Key` header authentication, sanitized error returns, and replaced wildcard CORS with explicit allowed origins.
- [x] **Cross-Platform Compatibility**: Fixed path separation logic for `safe_filename` to run reliably across both Linux and Windows.
- [x] **Single Migration Head**: Resolved dual-head Alembic migrations into a single linear revision (`0001_initial_schema.py`).

### Frontend Integration (Next.js 16 + React)
- [x] Connected `dashboard/recruiter/candidates` to live FastAPI endpoints (`GET /jobs`, `GET /jobs/{id}/candidates`, and status updates).
- [x] Connected `dashboard/recruiter/pipeline` to real Kanban status updates and recruiter audit notes APIs.
- [x] Connected `dashboard/` to live open jobs, candidate applications, and requisition counts.
- [x] Connected `dashboard/applications` to live `/applications/me` without mock data fallback.
- [x] Verified 100% clean Next.js production build (`npm run build`).

---

## 🚀 Active Roadmap & Upcoming Slices

1. **Controlled Backend Integration**:
   - Update backend client to consume Contract v1.1.0 response fields while preserving existing semantic weighting without breaking regressions.
2. **Benchmark Scaling**:
   - Expand the ground-truth benchmark suite to include 50+ diverse resume variations across non-tech domains (e.g. healthcare, legal, finance).
3. **Advanced Parser Integrations**:
   - Staging specialized vision/OCR layout parsers (Docling/Surya) behind the Celery/Redis async worker boundary.
