# AI-Based Resume Screening and Candidate Ranking System

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
| **Frontend** | **React.js** | Single Page Application (SPA) for candidate & recruiter interface |
| **Backend API** | **Node.js / Express.js** | RESTful API server handling business workflows and data endpoints |
| **AI / ML Services** | **Python / FastAPI** | Microservice executing NLP parsing, semantic embedding & ranking models |
| **Database** | **MongoDB** | NoSQL database storing candidate profiles, resumes, and job listings |
| **Version Control** | **Git & GitHub** | Collaborative source code control and version management |

---

## 📂 Folder Structure

```text
AI-Job-Matcher/
├── .github/          # GitHub Workflows, issue templates, and CI/CD configurations
├── ai-services/      # Python & FastAPI microservices for AI/ML and NLP processing
├── assets/           # Static media assets, architecture diagrams, and images
├── backend/          # Node.js & Express API backend server logic
├── database/         # MongoDB schema definitions, migrations, and seed scripts
├── docs/             # Technical specifications, SRS, and project documentation
├── frontend/         # React.js application source code
└── README.md         # Primary project documentation
```

---

## 🚀 Getting Started

Instructions for setting up the frontend, backend, database, and AI microservices locally will be added here as development progresses.

---

## 👥 Authors & Acknowledgments

Developed as a 5th Semester System Development Project (SGP).
