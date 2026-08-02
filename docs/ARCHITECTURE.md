# 🏗️ System Architecture & Design Specification (`ARCHITECTURE.md`)

> **PHASE 2 DELIVERABLE: ARCHITECTURE DESIGN**

---

## 📐 1. High-Level Architecture Overview

The system follows a multi-tier, microservice-decoupled architecture:

```text
┌─────────────────────────────────────────────────────────┐
│                    React.js Frontend                    │
│                 (Recruiter & Applicant UI)               │
└────────────────────────────┬────────────────────────────┘
                             │ REST API (HTTP/JSON)
┌────────────────────────────▼────────────────────────────┐
│                  Node.js / Express API                  │
│        (Auth, CRUD, File Handling, Job Management)       │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               │ Internal REST             │ Mongoose Driver
┌──────────────▼─────────────┐   ┌─────────▼──────────────┐
│    Python / FastAPI AI     │   │    MongoDB Database    │
│  (NLP Parsing & Scoring)   │   │  (Users, Jobs, Scores) │
└────────────────────────────┘   └────────────────────────┘
```

---

## 🧩 2. Core Service Modules

1. **Frontend Application (`frontend/`)**: React.js SPA handling recruiter dashboards, candidate tables, and UI visualizations.
2. **Backend API Server (`backend/`)**: Node.js & Express API server handling JWT authentication, job postings, file upload storage, and orchestrating AI service requests.
3. **AI & NLP Microservice (`ai-services/`)**: Python & FastAPI service executing PDF/DOCX text parsing (`pdfplumber`/`PyPDF2`), entity extraction (`spaCy`), transformer embeddings, and scoring metrics.
4. **Database Layer (`database/`)**: MongoDB storing users, candidate profiles, job postings, and evaluation score histories.

---

## 📊 3. Explainable AI Scoring Framework Architecture

Match Score is calculated using a weighted multi-component model:

$$Score = (0.35 \times SkillScore) + (0.35 \times ExpScore) + (0.15 \times EduScore) + (0.15 \times SemanticScore)$$

---

## ⚖️ 4. Blind Screening & Anonymization Engine

A dedicated text sanitization filter strips PII (Personally Identifiable Information) before sending text to the scoring pipeline:
- Strips candidate full name, email, phone, address.
- Sanitizes gender markers and graduation year ranges.
