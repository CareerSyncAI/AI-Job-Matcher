# CareerSync AI — Development Changelog & Architecture Decisions

This document tracks major architectural decisions (ADRs), release trajectory changelogs, and repository history.

---

## 🏛️ Architectural Decision Records (ADRs)

### ADR 001: Consolidated Single Frontend Application
- **Decision**: Consolidated all experimental UI builds into `frontend/` and removed legacy `frontend2/`.
- **Rationale**: Eliminates duplication, ensures single source of truth for Next.js App Router routes and design tokens.

### ADR 002: Deterministic AI Match Scoring Policy
- **Decision**: Candidate match scores are computed deterministically via weighted multi-factor scoring:
  $$\text{Score} = (w_{\text{skills}} S_{\text{skills}} + w_{\text{exp}} S_{\text{exp}} + w_{\text{edu}} S_{\text{edu}} + w_{\text{sem}} S_{\text{sem}}) \times 100$$
- **Rationale**: Eliminates black-box AI bias, guarantees reproducibility, and provides explainable candidate evidence.

### ADR 003: FastAPI + PostgreSQL + pgvector Backend Monolith
- **Decision**: Standardized on Python FastAPI with SQLAlchemy 2.x, Alembic, and PostgreSQL 16 `pgvector`.
- **Rationale**: Direct vector search support inside relational database, fast async request handling, and clean Pydantic contracts.

### ADR 004: Pluggable Dual-Engine Semantic Architecture
- **Decision**: Implemented an abstract base `BaseSimilarityEngine` with two concrete implementations:
  1. `BaselineSimilarityEngine`: Sublinear TF-Cosine matcher ($1 + \ln(\text{tf})$) as the default.
  2. `SentenceEmbeddingMatcher`: Dense vector semantic model using `sentence-transformers/all-MiniLM-L6-v2` pinned to commit `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
- **Rationale**: Retains 100% deterministic, zero-dependency baseline capability while allowing optional dense vector contextual matching with zero hallucinated competencies and automatic fallback on model absence.

### ADR 005: AI Service Contract v1.1.0 & Uncalibrated Semantic Signal Separation
- **Decision**: Upgraded AI Service `/api/v1/similarity` schema to expose `raw_similarity`, `similarity_index`, `method`, `status`, `fallback_reason`, `model_info`, and `diagnostics`.
- **Rationale**: Ensures raw cosine similarities are clearly treated as uncalibrated decision-support signals rather than hiring probabilities or calibrated confidence, preserving backend control over multi-factor weighting.

---

## 📜 Release Trajectory & Changelog

### Version 1.1.0 (Current)
- **AI Microservice**:
  - Implemented pluggable architecture (`BaselineSimilarityEngine` vs `SentenceEmbeddingMatcher`).
  - Added thread-safe model caching and section-aware bounded chunking (500-char max).
  - Pinned `sentence-transformers/all-MiniLM-L6-v2` to immutable revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
  - Added smoke test and verified local CPU inference latency (~40ms).
  - Implemented API Contract v1.1.0 with diagnostics and explicit fallback fields.
  - Curated 30-pair comparative evaluation benchmark (`fixtures/evaluation/evaluation_benchmark.json`) with 94.8% held-out accuracy.
- **Repository Modernization**:
  - Cleaned root folder: organized presentation decks into `docs/presentations/` and audit logs into `docs/audits/`.
  - Upgraded documentation across all modules (`ai-services/README.md`, `frontend/README.md`, `backend/README.md`, `docs/README.md`).
  - Enhanced CI workflow with CPU-only PyTorch wheel on Linux runners.

### Version 1.0.0
- Complete deterministic matching engine with word-boundary regexes and verbatim evidence anchoring.
- Role-based access control, Argon2id auth, HttpOnly JWT rotation.
- ATS Kanban pipeline with real-time status transitions.
- Next.js 16 frontend with Glassmorphism design system.
