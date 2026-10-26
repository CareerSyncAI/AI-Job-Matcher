# CareerSync AI — Project Status & Verified Roadmap

**Status:** Authoritative Project Status  
**Academic Milestone:** 5th Semester System Development Project (SGP), CHARUSAT University  
**Last Verified:** October 26, 2026  
**Test Baseline:** 98 passed, 5 skipped (Backend) | 51 passed (AI Services) | 14 routes statically compiled (Frontend)  

---

## 1. Project Overview

CareerSync AI is an AI-assisted resume screening and candidate ranking intelligence platform:
- **For Hiring Teams:** Deterministic multi-factor candidate scoring, explainable verbatim evidence anchoring, and tiered candidate ranking without black-box bias.
- **For Candidates:** Transparent skill compatibility analysis, missing requirement detection, and ATS resume quality feedback.

---

## 2. Completed Milestones (Verified in Code & Tests)

### Milestone A: Core Matching & Truthfulness Engine
- [x] **Word-Boundary & Contextual Ambiguity Protection:** Regex tokenization prevents false substring collisions (`Java` ≠ `JavaScript`, `Go` ≠ `Google`, `R` ≠ `research`).
- [x] **Verbatim Evidence Anchoring:** Evidence claims preserve exact start/end character offsets into extracted text. Zero fabricated qualifications.
- [x] **Multi-Tier Candidate Ranking:** Implemented `CoverageTier` ordering where Tier 1 (`ALL_REQUIRED_MET`) strictly outranks Tier 2 (`ALL_CRITICAL_MET`) and Tier 3 (`CORE_PARTIAL`).
- [x] **Missing Mentions Distinction:** Missing mentions are recorded as `NOT_DETECTED` rather than confirmed `GAP`.
- [x] **Experience Interval Deduplication:** Overlapping employment dates are merged; internships are excluded from professional tenure calculations by default.

### Milestone B: Similarity Engine & Contract v1.1.0 Standard
- [x] **Pluggable Similarity Facade:** `BaseSimilarityEngine` ABC with dynamic backend dispatching via `CAREERSYNC_SEMANTIC_MATCHER`.
- [x] **Deterministic Sublinear TF-Cosine Matcher:** Production default matcher using $1 + \ln(\text{tf})$ and cosine normalization; zero heavy ML dependencies and 0.06 ms warm inference latency.
- [x] **Pretrained Dense Vector Embedding Matcher:** Standalone diagnostic matcher powered by `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, pinned revision `1110a24`).
- [x] **Explicit Fallback & Diagnostics:** Missing models or service timeouts gracefully fall back to deterministic baseline with `status="fallback"` and explicit `fallback_reason`.
- [x] **API Contract v1.1.0:** Authoritative schemas returning `raw_similarity`, `similarity_index`, `method`, `status`, `model_info`, and `diagnostics`.

### Milestone C: Security & Data Privacy Protections
- [x] **Multi-Layer Upload Guards:** Whitelisted extensions (`.pdf`, `.docx`), magic-byte inspection, 10MB ceiling, 15-page PDF limit, and 30MB/50:1 DOCX decompression ceiling.
- [x] **Tenant Isolation & IDOR Protection:** Candidate profile cannot be hijacked by recruiter uploads; scoring weights are redacted from candidates; job-scoped access verified.
- [x] **Session Security:** Argon2id password hashing, revocable refresh token sessions in HttpOnly cookies, and rate-limited login endpoints (5 attempts / 5 min).
- [x] **Log Privacy:** Candidate email addresses masked (`j***e@domain.com`) in server logs.

### Milestone D: Full-Stack Integration & Production Build
- [x] **Next.js 16 Frontend:** Authenticated dashboard connected to live FastAPI endpoints (recruiter candidates leaderboard, Kanban pipeline, job creation, candidate profile).
- [x] **Zero TypeScript & ESLint Errors:** Clean compilation across all 14 routes with Turbopack.
- [x] **Automated CI Quality Gates:** GitHub Actions `.github/workflows/ci.yml` hardened with Ruff linting for Python services and ESLint + TypeScript type checks for frontend.

---

## 3. Active Roadmap & Scope Boundaries

### Active Scope (5th Semester SGP):
1. **Recruiter Demonstration & Viva Evidence:** Complete and verified; demonstration decks stored in `docs/presentations/` and evidence recorded in `docs/audits/FINAL_DEMO_EVIDENCE.md`.
2. **Quality & Defect Register:** 100% of confirmed defects resolved and recorded in `docs/audits/SECURITY_AND_QUALITY_REGISTER.md`.

### Deferred Post-MVP Features (Explicitly Documented):
- **pgvector Vector Persistence & RAG:** Schema migration exists, but vector writes and RAG querying remain deferred per `ADR-001`.
- **Advanced Document Vision / OCR:** Docling, Surya, and neural NER (GLiNER) remain deferred; rule-based extraction satisfies performance requirements.
- **Mandatory Celery / Redis Runtime:** Worker queue remains optional; synchronous inline processing is the production default.
