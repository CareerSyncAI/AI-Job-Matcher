# CareerSync AI — AI-Assisted Resume Screening and Candidate Ranking

> 🤖 **IMPORTANT NOTICE FOR ALL AI ASSISTANTS & DEVELOPERS**:
> Before reading or modifying this repository, you **MUST** read [docs/README_AI.md](file:///c:/Users/Hit/Desktop/SGP%205TH%20Sem/AI-Job-Matcher/docs/README_AI.md) and review all documentation inside `docs/` (`GIT_WORKFLOW.md`, `PROJECT_PROGRESS.md`, `AI_CHANGELOG.md`, `TASKS.md`, `SESSION.md`).

An intelligent, automated recruitment platform designed to evaluate candidate resumes against job descriptions, extract key qualification metrics, score applicant suitability using Natural Language Processing (NLP), and present candidate rankings via an intuitive web dashboard.

---

## 📌 Project Overview

The **AI-Based Resume Screening and Candidate Ranking System** streamlines the recruitment process for hiring managers and recruiters. By automating the initial resume parsing, entity extraction, and contextual skill matching, the system reduces screening time and minimizes evaluation bias, allowing organizations to identify top talent quickly and accurately.

---

## ✨ Proposed Features

- **📄 Resume Parsing & Entity Extraction**: Automatically extracts contact information, work experience, education history, key skills, and certifications from resumes (PDF, DOCX).
- **🤖 AI-Driven Skill Matching & Scoring**: Utilizes Natural Language Processing (NLP) models to calculate similarity scores between applicant resumes and target job descriptions.
- **📊 Interactive Candidate Dashboard**: Provides recruiters with a central dashboard featuring multi-dimensional candidate rankings, score distributions, and filtering tools.
- **🔍 Bias Reduction & Anonymized Evaluation**: Optional anonymized mode hides demographic data to foster objective and fair candidate evaluation.
- **🗄️ Database Management**: Efficiently stores and manages candidate profiles, job postings, and screening histories.
- **📑 Summary & Insight Reports**: Generates exportable evaluation summaries highlighting candidate strengths, missing skill gaps, and match percentages.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js / React / TypeScript** | Active application in `frontend/`; `frontend2/` is preserved reference material |
| **Backend API** | **Python / FastAPI** | Authenticated REST API, domain workflows, upload security, and ownership checks |
| **Database** | **PostgreSQL + pgvector** | SQLAlchemy/Alembic relational model and scoped embeddings |
| **Async processing** | **Redis / Celery** | Queue boundary for resume parsing and evaluation work |
| **AI / ML Services** | **Separate Python boundary** | Docling, GLiNER, RapidFuzz, and BGE-M3 integration is staged after the core API |
| **Version Control** | **Git & GitHub** | Collaborative source code control and version management |

---

## 📂 Folder Structure

```text
AI-Job-Matcher/
├── .github/          # GitHub Workflows, issue templates, and CI/CD configurations
├── ai-services/      # Python & FastAPI microservices for AI/ML and NLP processing
├── assets/           # Static media assets, architecture diagrams, and images
├── backend/          # FastAPI API, SQLAlchemy models, and Alembic migrations
├── database/         # Database fixtures and seed data
├── docs/             # Technical specifications, SRS, and project documentation
├── frontend/         # Active Next.js application source code
├── frontend2/        # Preserved frontend reference/backup
└── README.md         # Primary project documentation
```

---

## 🚀 Getting Started

Start local infrastructure with `docker compose up -d postgres redis`. See
`backend/README.md` for FastAPI, Poetry, and migration commands. Real AI model
inference is staged behind the processing boundary and is not represented by
the current deterministic fixtures.

---

## 👥 Authors & Acknowledgments

Developed as a 5th Semester System Development Project (SGP).
