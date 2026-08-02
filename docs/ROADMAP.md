# 🗺️ Project Roadmap & Phased Execution Plan (`ROADMAP.md`)

This roadmap defines the 11 sequential software engineering phases for the **AI-Based Resume Screening and Candidate Ranking System** (CareerSync AI / AI Job Matcher).

---

## 🗺️ 11-Phase Sequential Lifecycle

### Phase 0: Repository Setup & Governance 🟢 [COMPLETED]
- **Focus**: Git repository initialization, branching strategy (`main`, `develop`, `feature/*`, `experiment/*`), AI rules, and Software Engineering Knowledge Base setup.
- **Key Deliverables**: `docs/README_AI.md`, `docs/PROJECT_STATE.md`, `docs/GIT_WORKFLOW.md`, `docs/TASKS.md`, `docs/AI_CHANGELOG.md`, `docs/SESSION.md`.

---

### Phase 1: Requirement Analysis 🟡 [NEXT PRIORITY]
- **Focus**: Define core functional requirements, non-functional requirements, user roles (Recruiter, Candidate, Admin), and use case specifications.
- **Key Deliverables**: `docs/REQUIREMENTS.md`.

---

### Phase 2: System Architecture Design ⚪ [PLANNED]
- **Focus**: High-level system architecture, service communication (Express ◄► FastAPI), component interfaces, and explainable AI scoring framework design.
- **Key Deliverables**: `docs/ARCHITECTURE.md`.

---

### Phase 3: Database Design ⚪ [PLANNED]
- **Focus**: Entity-Relationship diagrams, MongoDB document schemas (Users, Resumes, Jobs, Evaluation Scores), indexing strategies, and data models.
- **Key Deliverables**: `docs/DATABASE.md`.

---

### Phase 4: Backend API Development ⚪ [PLANNED]
- **Focus**: Node.js & Express RESTful API server, authentication (JWT), file upload handling (Multer), MongoDB connection, and route controllers.
- **Key Deliverables**: `docs/API.md`, Express code in `backend/`.

---

### Phase 5: AI Microservices & NLP Pipeline ⚪ [PLANNED]
- **Focus**: Python & FastAPI microservice, PDF/DOCX parsing (`PyPDF2`/`pdfplumber`), entity extraction (`spaCy`), transformer embeddings, cosine similarity scoring, and explainable score breakdowns.
- **Key Deliverables**: FastAPI code in `ai-services/`.

---

### Phase 6: Frontend Development ⚪ [PLANNED]
- **Focus**: React.js Single Page Application (SPA), recruiter dashboard, candidate ranking tables, score visualization charts, job posting management, and optional blind screening toggle.
- **Key Deliverables**: React code in `frontend/`.

---

### Phase 7: System Integration ⚪ [PLANNED]
- **Focus**: Connecting React frontend to Express API backend, linking Express API to FastAPI AI microservice, and end-to-end data flow validation.
- **Key Deliverables**: Integrated system & environment configs.

---

### Phase 8: Testing & Quality Assurance ⚪ [PLANNED]
- **Focus**: Unit testing, API integration testing, NLP extraction evaluation on sample resumes, and bias mitigation testing.
- **Key Deliverables**: Test suites & test reports in `docs/` and `tests/`.

---

### Phase 9: Deployment & DevOps ⚪ [PLANNED]
- **Focus**: Environment configuration (`.env.example`), containerization (Docker), and deployment scripts/instructions.
- **Key Deliverables**: Deployment guides & `.github/` workflows.

---

### Phase 10: Final Presentation & Defense ⚪ [PLANNED]
- **Focus**: Demonstration dataset (curated sample resumes & job postings), architecture slides, project report, and live demo rehearsal.
- **Key Deliverables**: Presentation assets in `assets/` and final report in `docs/`.
