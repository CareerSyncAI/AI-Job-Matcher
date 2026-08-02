# Task Management (`TASKS.md`)

This document tracks all project tasks organized by project phases.

> **Allowed Statuses**: `Not Started` | `In Progress` | `Blocked` | `Review` | `Completed`

---

## 📋 Task Board by Phase

### Phase 0: Repository Setup & Governance 🟢 [COMPLETED]

#### Task 0.1: Repository Scaffolding & Master README
- **Description**: Clone repository, setup directory structure (`frontend`, `backend`, `ai-services`, `database`, `docs`, `assets`, `.github`), and author master `README.md`.
- **Assigned To**: Hit & Antigravity
- **Priority**: High
- **Status**: Completed
- **Dependencies**: None

#### Task 0.2: 11-Phase Governance & Knowledge Base Setup
- **Description**: Establish Software Engineering Knowledge Base (`PROJECT_STATE.md`, `README_AI.md`, `ROADMAP.md`, `GIT_WORKFLOW.md`, `PROJECT_PROGRESS.md`, `AI_CHANGELOG.md`, `TASKS.md`, `SESSION.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`).
- **Assigned To**: Hit & Antigravity (Software Architect)
- **Priority**: High
- **Status**: Completed
- **Dependencies**: Task 0.1

#### Task 0.3: Create Develop Branch
- **Description**: Create and push `develop` branch to remote repository (`origin/develop`).
- **Assigned To**: Antigravity
- **Priority**: High
- **Status**: Completed
- **Dependencies**: Task 0.2

---

### Phase 1: Requirement Analysis 🟡 [IN PROGRESS]

#### Task 1.1: Functional & Non-Functional Requirements Definition
- **Description**: Define user roles, user stories, use cases, and functional requirements in `docs/REQUIREMENTS.md`.
- **Assigned To**: Hit, Dhruv & Antigravity (Software Architect)
- **Priority**: High
- **Status**: In Progress
- **Dependencies**: Task 0.3

---

### Phase 2: System Architecture Design ⚪ [PLANNED]

#### Task 2.1: Microservice & Component Architecture Design
- **Description**: Define service boundaries between Node.js/Express and Python/FastAPI, data flows, and explainable AI scoring models in `docs/ARCHITECTURE.md`.
- **Assigned To**: Hit, Dhruv & AI Architect
- **Priority**: High
- **Status**: Not Started
- **Dependencies**: Task 1.1

---

### Phase 3: Database Design ⚪ [PLANNED]

#### Task 3.1: MongoDB Schema & ERD Specification
- **Description**: Design Mongoose schemas (`users`, `jobs`, `resumes`, `evaluations`) in `docs/DATABASE.md`.
- **Assigned To**: Unassigned
- **Priority**: High
- **Status**: Not Started
- **Dependencies**: Task 2.1

---

### Phase 4: Backend API Development ⚪ [PLANNED]

#### Task 4.1: Express API Boilerplate & Authentication
- **Description**: Setup Express server with JWT auth and REST controllers in `backend/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 3.1

---

### Phase 5: AI Microservices & NLP Pipeline ⚪ [PLANNED]

#### Task 5.1: FastAPI Setup & Resume Scoring Engine
- **Description**: Implement PDF text extraction, `spaCy` NER, sentence transformers, and explainable scoring in `ai-services/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 2.1 & 4.1

---

### Phase 6: Frontend Development ⚪ [PLANNED]

#### Task 6.1: React SPA & Dashboard Interface
- **Description**: Build React dashboard, candidate ranking tables, and anonymized screening toggle in `frontend/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 2.1 & 4.1
