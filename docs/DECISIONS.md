# Architecture & Technical Decisions

---

### Decision 1: Directory Structure & Governance Framework

- **Date**: 2026-08-02
- **Decision**: Adopt a clean, decoupled directory structure (`frontend`, `backend`, `ai-services`, `database`, `docs`, `assets`, `.github`) and establish mandatory project governance docs (`AI_CHANGELOG.md`, `PROJECT_PROGRESS.md`, `TASKS.md`, `DECISIONS.md`).
- **Reason**: Facilitates multi-developer collaboration between Hit and Dhruv, while maintaining complete context and auditability across all AI assistants (Antigravity, ChatGPT, Copilot, Claude).
- **Alternative Considered**: Monolithic layout without documentation or change logging.
- **Impact**: Clear separation of concerns between web frontend, API server, AI microservice, and database logic; ensures zero loss of project history.

---

### Decision 2: Core Technology Stack

- **Date**: 2026-08-02
- **Decision**: Use React.js (Frontend), Node.js + Express (Backend API), Python + FastAPI (AI/NLP microservice), and MongoDB (Database).
- **Reason**: Combines fast web UI development (React), light RESTful API server (Node/Express), high-performance ML/NLP handling (Python/FastAPI), and flexible document storage (MongoDB).
- **Alternative Considered**: Single Python Django monolithic application.
- **Impact**: Decoupled architecture allows independent development and scaling of web components and AI ranking models.
