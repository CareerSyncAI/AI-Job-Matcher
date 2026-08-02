# Task Management (`TASKS.md`)

This document tracks all project tasks, assignments, priorities, and implementation statuses.

> **Allowed Statuses**: `Not Started` | `In Progress` | `Blocked` | `Review` | `Completed`

---

## 📋 Task Board

### Task 1: Repository Scaffolding & Master README
- **Description**: Clone repository, setup directory structure (`frontend`, `backend`, `ai-services`, `database`, `docs`, `assets`, `.github`), and author master `README.md`.
- **Assigned To**: Hit & Antigravity
- **Priority**: High
- **Status**: Completed
- **Dependencies**: None
- **Notes**: Initial directory layout and root documentation completed.

---

### Task 2: Multi-AI Governance & Self-Documenting System Setup
- **Description**: Create mandatory governance documents (`README_AI.md`, `GIT_WORKFLOW.md`, `PROJECT_PROGRESS.md`, `AI_CHANGELOG.md`, `TASKS.md`, `SESSION.md`) inside `docs/`.
- **Assigned To**: Hit & Antigravity
- **Priority**: High
- **Status**: Completed
- **Dependencies**: Task 1
- **Notes**: Exactly 6 documentation files created to guide developers (Hit & Dhruv) and AI assistants.

---

### Task 3: System Architecture & API Contract Specification
- **Description**: Define REST API contracts and data schemas connecting Node.js/Express backend with Python/FastAPI AI microservice and MongoDB.
- **Assigned To**: Hit & Dhruv
- **Priority**: High
- **Status**: Not Started
- **Dependencies**: Task 2
- **Notes**: Must be completed before writing application boilerplate.

---

### Task 4: React Frontend Application Setup
- **Description**: Initialize React Single Page Application (SPA) structure inside `frontend/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 3
- **Notes**: Keep clean and modular; setup component directory structure.

---

### Task 5: Express Backend API Scaffolding
- **Description**: Initialize Node.js & Express server with router layout inside `backend/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 3
- **Notes**: Setup environment variables, middleware, and route controllers.

---

### Task 6: Python / FastAPI AI Microservice Setup
- **Description**: Setup Python environment, FastAPI server, and NLP libraries inside `ai-services/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 3
- **Notes**: Define endpoints for resume parsing, entity extraction, and match scoring.

---

### Task 7: MongoDB Database Schemas & Connection
- **Description**: Setup Mongoose/MongoDB connection logic and schemas inside `database/`.
- **Assigned To**: Unassigned
- **Priority**: Medium
- **Status**: Not Started
- **Dependencies**: Task 3
- **Notes**: Design candidate, job description, and evaluation score collections.
