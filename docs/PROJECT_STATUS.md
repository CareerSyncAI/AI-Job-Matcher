# CareerSync AI — Project Status & Roadmap

This document provides a consolidated overview of project requirements, active architecture, completed milestones, and development roadmap.

---

## 📌 Project Overview & Objectives

CareerSync AI is an AI-assisted recruitment intelligence platform designed for the 5th Semester System Development Project (SGP):
- **For Hiring Teams**: Deterministic multi-factor candidate scoring, explainable verbatim evidence anchoring, and tiered candidate ranking.
- **For Candidates**: Target role compatibility exploration, transparent skill gap identification, and ATS quality resume inspection.

---

## 🎯 Completed Milestones

### Core Matching Engine & Truthfulness (Phase 0)
- [x] **Word-Boundary & Contextual Ambiguity Protection**: Solved substring matching collision (e.g. JavaScript does not falsely match Java; Google does not match Go; research does not match R).
- [x] **Verbatim Evidence Anchoring**: Stored exact character start/end offsets and source document spans instead of fabricated template snippets.
- [x] **Uncertainty-First Multi-Tier Ranking**: Implemented `CoverageTier` ordering where unconfirmed missing mentions (`not_detected`) are tier 2, and confirmed disqualifications (`gap`) are tier 3.
- [x] **Real Metric Calculation**: Replaced fake rapidfuzz copies with true token sequence matchers; integrated preferred skills scoring and genuine experience intervals.
- [x] **Loud Parse Failures**: Empty resume extractions and corrupted uploads fail explicitly as `NEEDS_ATTENTION` rather than proceeding to false evaluations.

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

1. **Benchmark Expansion**:
   - Expand the ground-truth benchmark suite to include 50+ diverse resume variations across non-tech domains.
2. **Dense Vector Embedding Evaluation**:
   - Compare BGE-M3 and sentence-transformer embeddings against the established human-rated ground-truth benchmark before enabling vector similarity search.
3. **Advanced Parser Integrations**:
   - Staging specialized vision/OCR layout parsers (Docling/Surya) behind the async worker boundary.
