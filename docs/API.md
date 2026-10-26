# CareerSync AI — API Specification (FastAPI v1)

**Base URL:** `/api/v1`  
**Interactive Docs:** `http://localhost:8000/docs` (Swagger UI) & `http://localhost:8000/redoc` (ReDoc)  
**Security Envelope:** Bearer JWT Access Tokens (`Authorization: Bearer <token>`) & HttpOnly Revocable Refresh Cookies  
**Standard Error Format:** All errors return JSON with `error.code`, `error.message`, and `request_id`.

---

## 1. Authentication & Session Management (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new user as `candidate` or `recruiter`. |
| `POST` | `/api/v1/auth/login` | Public | Authenticate credentials; returns access token and sets HttpOnly refresh cookie. Rate-limited to 5 failures / 5 min. |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate refresh session and issue new access token. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke current refresh session and clear cookie. |
| `GET` | `/api/v1/auth/me` | Authenticated | Return authenticated principal's profile, role, and permissions. |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Update account password and revoke all existing sessions. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Secure password recovery dispatch preventing email enumeration. |

---

## 2. Job Requisitions (`/api/v1/jobs`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/jobs` | Public / Auth | List available jobs. Draft jobs are visible only to the owning recruiter. |
| `POST` | `/api/v1/jobs` | Recruiter | Create a new job requisition with title, description, skills, and custom weights. |
| `GET` | `/api/v1/jobs/{job_id}` | Public / Auth | Retrieve job details. Internal scoring weights are redacted from candidates and external recruiters. |
| `PATCH` | `/api/v1/jobs/{job_id}` | Recruiter | Update job fields, status (`OPEN`, `PAUSED`, `CLOSED`), or scoring weights (must sum to 100). |
| `POST` | `/api/v1/jobs/{job_id}/reevaluate` | Recruiter | Batch re-evaluate all candidate applications for a job against updated requirements with concurrency locking (`SELECT FOR UPDATE NOWAIT`). |
| `GET` | `/api/v1/jobs/{job_id}/candidates` | Recruiter | Return ranked candidate leaderboard for an owned job with deterministic scores, coverage tiers, and fit breakdowns. |

---

## 3. Resume Ingestion & ATS Studio (`/api/v1/resumes` & `/api/v1/profile`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/jobs/{job_id}/resumes` | Recruiter | Stream and ingest candidate resume for a job requisition (PDF/DOCX, 10MB ceiling, magic-byte inspection, SHA-256 deduplication). |
| `POST` | `/api/v1/profile/resumes` | Candidate | Upload candidate's own profile resume. |
| `GET` | `/api/v1/resumes/{resume_id}` | Owner | Retrieve extracted text, parsed sections, and processing status (`PENDING`, `COMPLETED`, `NEEDS_ATTENTION`). |
| `POST` | `/api/v1/resumes/analyze-text` | Authenticated | Analyze raw text in ATS studio for formatting issues, contact detection, section structure, and keyword density. |
| `GET` | `/api/v1/resumes/{resume_id}/analyze` | Owner | Analyze stored resume in ATS studio with strict IDOR access checks. |

---

## 4. Candidate Applications & Pipeline (`/api/v1/applications`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/jobs/{job_id}/applications` | Candidate | Submit application to a job using candidate's uploaded resume. Enforces processing completion. |
| `GET` | `/api/v1/applications` | Candidate | List authenticated candidate's active and historical applications. |
| `PATCH` | `/api/v1/applications/{app_id}/status` | Recruiter | Transition application status (`APPLIED` → `SCREENING` → `INTERVIEWING` → `OFFERED` / `REJECTED`). |
| `POST` | `/api/v1/applications/{app_id}/notes` | Recruiter | Attach timestamped evaluation notes to an application. |

---

## 5. Evaluation & Diagnostic Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/evaluation/benchmark` | Admin | Execute automated synthetic regression benchmark suite (`BenchmarkRunner`) and return JSON metrics summary. |
| `GET` | `/health` | Public | Return server health status, database connectivity, and timestamp. |

---

## 6. AI Microservice Boundary (Port 8001, Contract v1.1.0)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/parse-resume` | Header Key | Extract raw text and logical semantic sections from PDF/DOCX bytes. |
| `POST` | `/api/v1/ai/extract-entities` | Header Key | Extract structured skills, experience tenure, and education credentials. |
| `POST` | `/api/v1/ai/normalize-skills` | Header Key | Normalize skill variants to canonical taxonomy names with confidence scores. |
| `POST` | `/api/v1/ai/semantic-match` | Header Key | Compute semantic similarity index and diagnostics (`baseline` or `embedding` mode). |
| `GET` | `/health` | Public | Check AI service status, loaded model ID, and vector dimensions. |
