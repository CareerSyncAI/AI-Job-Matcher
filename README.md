# CareerSync AI — AI-Assisted Resume Screening and Candidate Ranking

CareerSync AI is an automated recruitment intelligence platform designed to evaluate candidate resumes against structured job requirements, extract competencies, compute deterministic multi-factor match scores, and present evidence-backed evaluations via a modern web dashboard.

---

## 📌 Project Overview

The **CareerSync AI Resume Screening and Candidate Ranking System** assists hiring teams by streamlining initial resume ingestion, entity extraction, and skills matching. By grounding every evaluation claim in verbatim document snippets and applying deterministic scoring models with configurable weights, the system provides transparent, explainable evaluations for recruiters while preserving candidate privacy.

> **Note on Evaluation Transparency**: CareerSync AI provides deterministic, rule-grounded evaluations to assist human decision-makers. It does not replace human recruiter judgment and makes no claims of eliminating systemic bias.

---

## ✨ Features

- **📄 Document Text Extraction**: Ingests PDF and DOCX files with signature validation, SHA-256 deduplication, and size guards.
- **🎯 Deterministic Skill & Competency Matching**: Matches competencies using a curated canonical taxonomy with token-boundary regexes, ambiguity rules (e.g. C, Go, R), and strict transferable mappings.
- **🔍 Verbatim Evidence Anchoring**: Captures exact character spans and quotes from resume text rather than template-generated claims.
- **📊 Multi-Tier Candidate Ranking**: Employs "Uncertainty First" tier ordering (Tier 1: Complete Match, Tier 2: Insufficient Document Evidence / Not Detected, Tier 3: Confirmed Hard Gap) so missing mentions are never penalized more severely than verified disqualifications.
- **🛡️ Secure Access & Identity Protections**:
  - Argon2id password hashing and sliding-window login rate limiting.
  - HttpOnly JWT refresh token rotation with SHA-256 session digests.
  - Strict IDOR and recruiter ownership enforcement (draft requisitions and internal scoring weights remain private to job owners).
  - Registered candidate profile protection against recruiter upload hijacking.
- **⚡ Synchronous & Worker Processing Pipelines**: Supports both lightweight direct execution and Celery/Redis asynchronous worker pipelines.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 / React / TypeScript** | Full-stack web dashboard with ATS Kanban, Sourcing Directory, and Resume Studio |
| **Backend API** | **Python / FastAPI** | Authenticated REST API with rate-limiting, strict schemas, and audit logging |
| **Database** | **PostgreSQL + pgvector** | SQLAlchemy 2.x relational schema and Alembic migrations |
| **Async Processing** | **Redis / Celery** | Optional asynchronous queue boundary for heavy ingestion workloads |
| **AI / NLP Microservice** | **Python / FastAPI** | Modular AI service for document OCR and specialized entity extraction |

---

## 📂 Folder Structure

```text
AI-Job-Matcher/
├── .github/          # GitHub Workflows and CI configuration
├── ai-services/      # FastAPI AI microservice for parsing and entity extraction
├── assets/           # Media assets and diagrams
├── backend/          # Core FastAPI API, evaluation engine, and Alembic migrations
├── database/         # Database fixtures and init scripts
├── docs/             # Technical specifications and project status documentation
├── frontend/         # Next.js web application
└── README.md         # Primary project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Docker & Docker Compose (optional for PostgreSQL + Redis)

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate virtual environment
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Running Tests
```bash
# Backend pytest suite
cd backend
pytest -v

# AI Services pytest suite
cd ai-services
pytest -v

# Frontend build verification
cd frontend
npm run build
```

---

## 👥 Authors & Acknowledgments

Developed as a 5th Semester System Development Project (SGP).
