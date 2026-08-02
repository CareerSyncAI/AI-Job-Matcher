# Git Workflow & Branching Strategy (`GIT_WORKFLOW.md`)

This document defines the official Git branching strategy, daily development workflow, commit conventions, and local experiment policy for **Hit** and **Dhruv**.

---

## 🌿 Branching Strategy

The repository follows a structured 4-tier branching model to protect production stability while enabling parallel development and experimentation.

```text
main (Stable & Presentation Ready)
  ▲
  │ (Merge via PR)
develop (Daily Integration & Shared Dev)
  ▲                         ▲
  │ (Feature Merges)        │ (Tested Prototypes)
feature/*                 experiment/*
```

### 1. `main`
- **Purpose**: Holds production-ready, stable, and presentation-tested code only.
- **Rules**:
  - **NEVER** write code or commit directly to `main`.
  - **NEVER** push unverified or experimental code.
  - Merges into `main` occur only from `develop` after full system verification.

### 2. `develop`
- **Purpose**: Central integration branch for daily collaborative work between Hit and Dhruv.
- **Rules**:
  - Always run `git pull origin develop` before starting work.
  - Feature branches branch off `develop` and merge back into `develop`.

### 3. `feature/*`
- **Purpose**: Dedicated to implementing a single specific feature, task, or module (e.g., `feature/resume-parser`, `feature/ranking-dashboard`).
- **Naming**: `feature/<feature-name>`
- **Rules**: One feature per branch. Once completed and verified, merge into `develop`.

### 4. `experiment/*`
- **Purpose**: Isolated sandbox for local experimentation, AI testing, and prototype exploration.
- **Naming**: `experiment/<experiment-name>`
- **Rules**:
  - May remain local forever.
  - Push to remote only if the experiment yields useful code to integrate.

---

## 🔄 Daily Development Workflow

Follow this sequence for every work session:

```text
Start Work ──► git pull origin develop ──► Create feature/* or experiment/* ──► Develop & Test ──► Commit ──► Push (if needed) ──► Merge to develop
```

1. **Pull Latest Code**: Ensure local `develop` is up to date:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **Create Working Branch**:
   ```bash
   git checkout -b feature/resume-parser
   # OR for experimental work:
   git checkout -b experiment/spacy-vs-transformers
   ```
3. **Develop & Test**: Make localized changes, keeping documentation in `docs/` updated.
4. **Commit Changes**: Use standard commit messages (see below).
5. **Push & Merge**: Push working branch and merge to `develop` after review.

---

## 📝 Commit Naming Conventions

All commit messages must follow standard semantic prefixing:

| Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feat:` | New feature or functional component | `feat(backend): add resume upload REST endpoint` |
| `fix:` | Bug fix or issue resolution | `fix(ai-services): resolve PDF parsing encoding error` |
| `docs:` | Documentation updates | `docs: update TASKS.md and AI_CHANGELOG.md` |
| `refactor:` | Code changes that neither fix bugs nor add features | `refactor(database): optimize Mongoose query indexes` |
| `style:` | Formatting, indentation, missing semicolons | `style(frontend): format candidate card component` |
| `test:` | Adding or modifying unit/integration tests | `test(ai-services): add tests for skill extraction` |

---

## 🧪 Local Experiment Policy

Developers (**Hit** & **Dhruv**) are strongly encouraged to experiment locally without risking shared stability.

### Recommended Workspace Options:

1. **Official Shared Workspace**:
   `AI-Job-Matcher/` (Contains official `main` & `develop` branches)

2. **Personal Lab Workspaces (Optional)**:
   - `AI-Job-Matcher-Lab-Hit/`
   - `AI-Job-Matcher-Lab-Dhruv/`

3. **Local Experiment Branches**:
   - `experiment/custom-nlp-model`

### Core Rule for Experiments:
Nothing from local experiment workspaces or `experiment/*` branches should enter the official `develop` or `main` branches until it has been thoroughly tested, verified, and documented.
