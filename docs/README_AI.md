# AI & Developer Governance Guidelines (`README_AI.md`)

> **MANDATORY INSTRUCTION FOR ALL AI ASSISTANTS**
> Any AI assistant (Antigravity, ChatGPT, GitHub Copilot, Claude, Cursor, etc.) working on this repository **MUST** read this document and all accompanying files in `docs/` before suggesting, editing, creating, or deleting any file or folder.

---

## 📌 Repository Overview

This repository hosts the **AI-Based Resume Screening and Candidate Ranking System** (CareerSync AI / AI Job Matcher), developed as a 5th Semester System Development Project (SGP).

- **Lead Developers**: Hit & Dhruv
- **AI Collaborators**: Antigravity, ChatGPT, GitHub Copilot, Claude, Cursor, etc.
- **Repository Architecture**: Multi-tier architecture comprising `frontend/` (React), `backend/` (Node.js/Express), `ai-services/` (Python/FastAPI), `database/` (MongoDB), `docs/`, `assets/`, and `.github/`.

---

## 🚨 Essential Repository Rules for AI Assistants

All AI assistants entering this codebase must strictly observe the following 12 golden rules:

1. **Read Documentation First**: Read ALL documentation inside `docs/` before making any change or generating code.
2. **Understand Repository Status**: Inspect `docs/PROJECT_PROGRESS.md` and `docs/SESSION.md` to understand current work and past context.
3. **Never Assume Architecture**: Rely on documented architectural decisions and ask developers before proposing structural deviations.
4. **Never Overwrite Previous Work**: Preserve work done by Hit, Dhruv, or previous AI assistants.
5. **Never Silently Modify Files**: Always explain modifications and rationale clearly to the user before or upon making them.
6. **Never Delete Documentation**: Maintain, update, and append to existing documentation; never erase past history.
7. **Never Rename Folders Without Confirmation**: Obtain explicit approval from developers before modifying folder layouts.
8. **Never Perform Git Operations Automatically**: Do not run `git commit`, `git push`, or `git merge` automatically unless explicitly instructed by the user.
9. **Explain Major Changes First**: Describe significant architectural or structural edits prior to implementation.
10. **Synchronize Documentation**: Update `docs/AI_CHANGELOG.md`, `docs/PROJECT_PROGRESS.md`, `docs/TASKS.md`, and `docs/SESSION.md` whenever repository state changes.
11. **Leave Complete Context**: Write concise but thorough documentation so any human developer or subsequent AI can resume work immediately.
12. **Maintainer First, Assistant Second**: Act primarily as a project maintainer responsible for repository hygiene, clarity, and discipline, and secondarily as a coding assistant.

---

## 📂 Documentation Structure Map

Any AI assistant must inspect and update these 6 files inside `docs/`:

| File | Purpose | When to Update |
| :--- | :--- | :--- |
| **`README_AI.md`** | Master AI governance rules & workflow guidelines | When overall AI rules or project governance evolve |
| **`GIT_WORKFLOW.md`** | Branching strategy, commit conventions & local lab policy | When Git strategies or workflow conventions change |
| **`PROJECT_PROGRESS.md`** | Chronological record of completed, current & pending work | Upon completing or updating any project milestone |
| **`AI_CHANGELOG.md`** | Detailed log of all AI modifications and file operations | Append after EVERY edit, creation, refactor, or deletion |
| **`TASKS.md`** | Task board with statuses, assignments & dependencies | Whenever starting, updating, or completing a task |
| **`SESSION.md`** | Active session log tracking current AI/developer focus | At the start and end of every active work session |

---

## 🔄 First Action Checklist for AI Sessions

Before taking any action in this repository, execute the following workflow:

```text
1. Inspect docs/README_AI.md  --> Review core rules
2. Inspect docs/SESSION.md    --> Read current session context & active goal
3. Inspect docs/PROJECT_PROGRESS.md --> Check completed vs pending milestones
4. Inspect docs/TASKS.md      --> Check task assignments & status
5. Inspect docs/GIT_WORKFLOW.md --> Confirm branching & commit conventions
6. Inspect docs/AI_CHANGELOG.md --> Read recent AI operations
```
