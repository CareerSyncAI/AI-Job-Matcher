# 🔌 API Endpoint Specifications (`API.md`)

> **PHASE 4 DELIVERABLE: BACKEND API DEVELOPMENT**

---

## 📌 1. Service Communication Overview
- **Express Backend API**: Exposed on `http://localhost:5000/api/v1`
- **FastAPI AI Microservice**: Internal REST API on `http://localhost:8000/ai/v1`

---

## 🚀 2. Endpoint Index

### Auth Endpoints (`Express`)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Job Management Endpoints (`Express`)
- `GET /api/v1/jobs`
- `POST /api/v1/jobs`

### Resume & Evaluation Endpoints (`Express`)
- `POST /api/v1/resumes/upload`
- `GET /api/v1/evaluations/job/:jobId`

### Internal AI Microservice Endpoints (`FastAPI`)
- `POST /ai/v1/parse-resume`
- `POST /ai/v1/score-candidate`
