# CareerSync AI — Development Changelog & Architecture Decisions

This document tracks major architectural decisions, trajectory changelogs, and repository history.

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

---

## 📜 Historical Logs & Git Workflow

- **Branching Strategy**:
  - `main`: Production stable release branch.
  - `develop`: Main integration branch.
  - `feature/backend-foundation`: Backend FastAPI, PostgreSQL & Alembic development.
  - `experimental/premium-hybrid-ui`: Next.js frontend UI overhaul.
