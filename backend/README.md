# CareerSync AI — Backend API & Matching Engine

The **CareerSync AI Backend** is an enterprise-grade modular FastAPI backend. It serves as the single source of truth for authentication, role-based authorization, PostgreSQL persistence, deterministic candidate scoring, secure resume storage, and immutable evaluation snapshots.

---

## 🏛️ System Core Responsibilities

1. **Deterministic Multi-Factor Scoring**:
   $$\text{Final Score} = \left( w_{\text{skills}} S_{\text{skills}} + w_{\text{exp}} S_{\text{exp}} + w_{\text{edu}} S_{\text{edu}} + w_{\text{sem}} S_{\text{sem}} \right) \times 100$$
   - Eliminates black-box AI bias and hallucinated hiring decisions.
   - Grounded strictly in verbatim document token extractions and candidate evidence.
2. **"Uncertainty-First" Tier Ordering**:
   - Categorizes candidate competencies into 3 explicit tiers:
     - **Tier 1 (Complete Match)**: Verifiable exact or canonical transferable skill match.
     - **Tier 2 (Not Detected / Insufficient Evidence)**: Skill not mentioned in document text; not penalized as an active disqualification.
     - **Tier 3 (Confirmed Gap)**: Actively conflicting or confirmed missing required capability.
3. **Robust Security Boundaries**:
   - Argon2id password hashing with brute-force sliding-window protection.
   - HttpOnly JWT access/refresh token rotation with SHA-256 session digests.
   - Strict IDOR and ownership checks: Draft requisitions and internal recruiter weights are strictly redacted for non-owners.
   - Candidate profile hijacking protection: Recruiter resume uploads matching registered candidate emails are isolated in unlinked candidate records.
   - Isolated file storage: Resume files are stored outside served directories using non-predictable UUID keys.
4. **AI-Service Integration**:
   - Connects to the standalone AI microservice over HTTP (`/api/v1/similarity` and `/api/v1/extract-text`) with API-key authentication (`X-AI-Service-Key`).
   - Graceful fallback: If the AI service is unreachable, defaults to internal fallback scoring mechanisms with explicit audit logging.

---

## 📐 API Architecture & Route Map

Versioned endpoints reside under `/api/v1`:

| Route Group | Path | Key Capabilities |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | User registration, login, refresh tokens, role assignment, logout |
| **Jobs** | `/api/v1/jobs` | Requisition creation, weight configuration, candidate pipeline queries |
| **Resumes** | `/api/v1/resumes` | Resume upload, MIME-type validation, text extraction, ATS parsing |
| **Matches** | `/api/v1/matches` | Deterministic multi-factor candidate ranking and scorecards |
| **Applications** | `/api/v1/applications` | Recruiter ATS Kanban pipeline status updates, candidate application submissions |

Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

---

## 🛠️ Local Development & Setup

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 15+ (with `pgvector` extension)
- Redis 7+ (optional, for Celery asynchronous task queues)

### 2. Environment Setup
```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```ini
CAREERSYNC_ENVIRONMENT="development"
CAREERSYNC_JWT_SECRET="your-32-character-minimum-secure-jwt-secret-key"
CAREERSYNC_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/careersync"
CAREERSYNC_REDIS_URL="redis://localhost:6379/0"
CAREERSYNC_AI_SERVICE_URL="http://localhost:8001"
CAREERSYNC_AI_SERVICE_API_KEY="dev-ai-service-key-change-in-prod"
CAREERSYNC_STORAGE_PATH="../career-sync-storage"
```

### 4. Database Migrations
Run Alembic migrations to bring the PostgreSQL schema to the latest head:
```bash
alembic upgrade head
```

### 5. Running the Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Running Tests
```bash
# Run complete backend test suite (48 tests)
pytest -v
```
