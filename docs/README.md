# CareerSync AI — Documentation Index

Welcome to the documentation repository for **CareerSync AI**. This documentation is structured using principles from the **Diátaxis documentation framework**, categorizing documents into Reference, Explanation, How-To, and Verification Evidence.

---

## 1. Technical Reference & Specifications

Authoritative technical specifications describing system contracts, APIs, schemas, and datasets:

| Document | Purpose & Scope | Target Audience |
| :--- | :--- | :--- |
| **[`ARCHITECTURE.md`](ARCHITECTURE.md)** | Runtime shape, domain flow, security boundaries, and deterministic ranking invariants | System Architects & Developers |
| **[`API.md`](API.md)** | Complete FastAPI v1 endpoints, request/response models, auth tokens, and error envelopes | Frontend & API Engineers |
| **[`DATABASE.md`](DATABASE.md)** | PostgreSQL relational schema (15 tables), Alembic migrations, constraints, and pgvector state | Database & Backend Engineers |
| **[`ai-service-contract.md`](ai-service-contract.md)** | Contract v1.1.0 specification for AI microservice parsers and similarity APIs | AI/ML & Integration Engineers |
| **[`DATASETS_AND_TAXONOMY.md`](DATASETS_AND_TAXONOMY.md)** | Approved vs rejected datasets, ESCO taxonomy provenance, and licensing audit | Data & Evaluation Engineers |
| **[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)** | Hybrid Glassmorphism, tri-theme palette, design tokens, and icon kit | Frontend & UI/UX Engineers |

---

## 2. Architectural Explanations & Decisions (ADRs)

In-depth technical reasoning and trade-off analyses behind architectural decisions:

| Document | Key Decision Addressed | Status |
| :--- | :--- | :---: |
| **[`decisions/ADR-001-embedding-and-ranking-architecture.md`](decisions/ADR-001-embedding-and-ranking-architecture.md)** | Why vector persistence is deferred for 5th Sem SGP and dense neural embeddings remain diagnostic-only | **Accepted** |

---

## 3. How-to Guides & Operational Status

Task-oriented guides, integration checklists, and project status tracking:

| Document | Purpose | Status |
| :--- | :--- | :---: |
| **[`PROJECT_STATUS.md`](PROJECT_STATUS.md)** | Verified completed milestones, current baseline, and active project roadmap | Active Baseline |
| **[`AI_SERVICE_INTEGRATION_CHECKLIST.md`](AI_SERVICE_INTEGRATION_CHECKLIST.md)** | Operational checklist and status for Contract v1.1.0 AI service integration | Complete |
| **[`INDEPENDENT_EVALUATION_PLAN.md`](INDEPENDENT_EVALUATION_PLAN.md)** | Protocol for independent evaluation with candidate splits and annotation rules | Planning Standard |
| **[`CHANGELOG.md`](CHANGELOG.md)** | Chronological log of prompt iterations, refactorings, and feature completions | Maintained |

---

## 4. Audits & Academic Evidence

Consolidated security registers, engineering audit reports, and viva demonstration evidence:

| Document | Contents & Significance |
| :--- | :--- |
| **[`audits/SECURITY_AND_QUALITY_REGISTER.md`](audits/SECURITY_AND_QUALITY_REGISTER.md)** | **Single Source of Truth** tracking all 23 historical security and code quality findings with test proof |
| **[`audits/FINAL_DEMO_EVIDENCE.md`](audits/FINAL_DEMO_EVIDENCE.md)** | Academic viva demonstration evidence pack, merge history, and live verification records |
| **[`audits/CAREERSYNC_AI_FINAL_AUDIT_REPORT.md`](audits/CAREERSYNC_AI_FINAL_AUDIT_REPORT.md)** | Comprehensive repository quality audit report (Phase 0–10) |
| **[`audits/CAREERSYNC_AI_FINAL_VERIFICATION.md`](audits/CAREERSYNC_AI_FINAL_VERIFICATION.md)** | Pre-commit verification report with benchmark critiques and 6-stage commit plan |

---

## 5. Historical Archive

Historical point-in-time audits, interim handoff documents, and prompt logs are archived to prevent documentation drift:

- **[`archive/audits/`](archive/audits/)**: Historical audits from earlier commits (`CareerSyncAI_Second_Deep_Audit.md`, `DELTA_AUDIT.md`, `SECURITY_AND_POSTGRES_CI_AUDIT.md`, `PROMPT_8_RESIDUAL_SECURITY_REVIEW.md`).
- **[`archive/CODEX_BACKEND_HANDOFF.md`](archive/CODEX_BACKEND_HANDOFF.md)**: Interim backend handoff notes from October 14, 2026.
- **[`archive/prompts/`](archive/prompts/)**: Historical Antigravity prompt logs and roadmap scratchpads.
- **[`presentations/`](presentations/)**: Academic viva defense decks (`CareerSync-AI-Overview.pptx`, `CareerSync-AI-Viva.pptx`).
