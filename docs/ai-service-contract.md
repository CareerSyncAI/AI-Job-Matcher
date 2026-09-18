# CareerSync AI — AI/NLP Service Contract

**Document Version:** 1.0.0  
**Status:** Authoritative (Single Source of Truth)  
**Author:** Antigravity (AI/NLP Engineering Track)  
**Consumer:** AGY (Core Application Engineering Track)  
**Last Updated:** September 18, 2026  

---

## 1. Architectural Boundary & Core Principle

1. **System Invariant:** The CareerSync AI core recruitment platform **must operate reliably and independently** of the AI service.
2. **Deterministic Priority:** The deterministic evaluation engine in `backend/app/services/scoring.py` is a first-class system capability. The AI service enriches and accelerates parsing, extraction, and semantic insights, but **does not own** user identity, application status, recruiter decisions, or final hiring authorization.
3. **Failure Isolation:** If the AI service is unavailable, unconfigured, or encounters an internal processing error, the application workflow remains intact. The resume or extraction task transitions to `failed` or `pending`, while the candidate application and deterministic scoring continue to function without interruption.

```
┌────────────────────────────────────────────────────────┐
│              CORE APPLICATION TRACK (AGY)              │
│  FastAPI Backend ──► PostgreSQL / SQLite ──► Scoring   │
│         │                                              │
│  Celery Worker (tasks.py: careersync.resume.process)   │
└─────────┼──────────────────────────────────────────────┘
          │ HTTP / REST Contract (JSON)
          ▼
┌────────────────────────────────────────────────────────┐
│            AI / NLP SERVICE TRACK (Antigravity)        │
│  ai-services/ (FastAPI Microservice on port 8001)       │
│  - PDF / DOCX Layout-Aware Parser                      │
│  - Section Boundary Detector                           │
│  - Hybrid Skill Extractor & Canonical Normalizer       │
│  - Chronological Experience & Education Parser         │
│  - Explainable Semantic Similarity Engine              │
└────────────────────────────────────────────────────────┘
```

---

## 2. Transport & Service Configuration

- **Default Protocol:** HTTP REST / JSON
- **Default Base URL:** `http://localhost:8001`
- **Environment Variable:** `AI_SERVICE_URL` (in backend configuration, e.g. `http://ai-service:8001` in Docker or `http://localhost:8001` in local dev)
- **Async Celery Task Boundary:** `careersync.resume.process(resume_id: str)` in `backend/app/workers/tasks.py`
- **Timeout Expectation:** Standard text extraction ≤ 5.0 seconds; full parsing & semantic embedding ≤ 15.0 seconds.

---

## 3. Standard Processing States

All AI operations report one of four explicit processing lifecycle states:

| State | Definition | Next Expected Action |
| :--- | :--- | :--- |
| `pending` | Task has been queued in Celery / worker buffer. | Worker will trigger AI processing request. |
| `processing` | AI microservice is actively extracting text and entities. | Client/backend polls or awaits callback. |
| `completed` | Parsing, extraction, and normalization succeeded. | Structured output is persisted to `EvaluationRun` / `CandidateProfile`. |
| `failed` | Error occurred (corrupt file, timeout, unsupported layout). | Error code recorded; deterministic fallback remains accessible. |

---

## 4. API Endpoints Specification

### 4.1. Health Check
`GET /health`

Verifies AI service availability and lists active models/parsers.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "careersync-ai-engine",
  "capabilities": {
    "pdf_parsing": true,
    "docx_parsing": true,
    "skill_extraction": true,
    "skill_normalization": true,
    "experience_structuring": true,
    "semantic_similarity": true
  }
}
```

---

### 4.2. Raw Resume File Parsing
`POST /api/v1/ai/parse-resume`

Extracts layout-aware normalized text and identified section blocks from PDF or DOCX binary payload.

**Request:** `multipart/form-data`
- `file`: Binary file (PDF or DOCX, max 10MB)
- `resume_id`: (Optional string) Tracking identifier

**Response `200 OK`:**
```json
{
  "resume_id": "res-101",
  "status": "completed",
  "source_format": "pdf",
  "parser_version": "1.0.0",
  "processing_duration_ms": 342,
  "raw_text_length": 3420,
  "sections": {
    "contact": "John Doe | john.doe@email.com | +1 (555) 019-2834",
    "summary": "Senior Software Engineer with 6+ years specializing in distributed systems...",
    "skills": "Python, Go, FastAPI, PostgreSQL, Kubernetes, Docker, Redis",
    "experience": "Senior Systems Engineer at Stripe (2021 - Present)...",
    "education": "B.S. in Computer Science, University of California, Berkeley (2015 - 2019)",
    "projects": "Built high-throughput message bus with Go and Redis...",
    "certifications": "AWS Certified Solutions Architect Associate"
  },
  "warnings": []
}
```

---

### 4.3. Structured Entity Extraction
`POST /api/v1/ai/extract-entities`

Extracts structured skills, employment tenure, and education credentials from parsed text or raw document.

**Request `application/json`:**
```json
{
  "resume_id": "res-101",
  "text": "Full text of resume...",
  "sections": {
    "skills": "Python, React.js, PostgreSQL, Docker, AWS",
    "experience": "Software Engineer at Acme Corp (Jan 2021 - Present)...",
    "education": "B.S. Computer Science, Stanford University, 2020"
  }
}
```

**Response `200 OK`:**
```json
{
  "resume_id": "res-101",
  "status": "completed",
  "parser_version": "1.0.0",
  "entities": {
    "skills": [
      {
        "raw_name": "React.js",
        "canonical_name": "React",
        "category": "Frontend",
        "confidence": 0.98,
        "source_section": "skills"
      },
      {
        "raw_name": "Python",
        "canonical_name": "Python",
        "category": "Backend",
        "confidence": 1.0,
        "source_section": "skills"
      },
      {
        "raw_name": "PostgreSQL",
        "canonical_name": "PostgreSQL",
        "category": "Databases",
        "confidence": 0.99,
        "source_section": "skills"
      }
    ],
    "experience": [
      {
        "organization": "Acme Corp",
        "role_title": "Software Engineer",
        "start_date": "2021-01",
        "end_date": null,
        "is_current": true,
        "duration_months": 42,
        "highlights": [
          "Scaled ingestion pipeline processing 10M events/day",
          "Engineered microservices using FastAPI and Docker"
        ]
      }
    ],
    "total_experience_months": 42,
    "total_experience_years": 3.5,
    "education": [
      {
        "institution": "Stanford University",
        "degree_level": "Bachelor",
        "degree_name": "B.S. in Computer Science",
        "field_of_study": "Computer Science",
        "graduation_year": 2020
      }
    ]
  },
  "extraction_metadata": {
    "total_skills_detected": 5,
    "total_experience_entries": 1,
    "duration_ms": 118
  }
}
```

---

### 4.4. Skill Normalization Engine
`POST /api/v1/ai/normalize-skills`

Maps arbitrary raw skill strings and variations to the canonical taxonomy.

**Request `application/json`:**
```json
{
  "skills": ["ReactJS", "k8s", "golang", "postgres", "Amazon Web Services"]
}
```

**Response `200 OK`:**
```json
{
  "normalized": [
    { "input": "ReactJS", "canonical": "React", "category": "Frontend", "matched": true },
    { "input": "k8s", "canonical": "Kubernetes", "category": "Cloud & DevOps", "matched": true },
    { "input": "golang", "canonical": "Go", "category": "Backend", "matched": true },
    { "input": "postgres", "canonical": "PostgreSQL", "category": "Databases", "matched": true },
    { "input": "Amazon Web Services", "canonical": "AWS", "category": "Cloud & DevOps", "matched": true }
  ]
}
```

---

### 4.5. Semantic Match & Similarity
`POST /api/v1/ai/semantic-match`

Computes vector/semantic similarity between candidate profile representation and target job requisition.

**Request `application/json`:**
```json
{
  "candidate_id": "cand-001",
  "candidate_profile": {
    "headline": "Senior Full-Stack Architect",
    "skills": ["React", "TypeScript", "Next.js", "GraphQL", "Tailwind CSS"],
    "experience_summary": "Architected modern web frontend and API gateways serving 2M users."
  },
  "job_requisition": {
    "job_id": "job-101",
    "title": "Staff Frontend Engineer",
    "required_skills": ["React", "TypeScript", "Next.js"],
    "preferred_skills": ["Tailwind CSS", "GraphQL", "Turbopack"],
    "description": "Lead web platform architecture, modern design system tokens, and App Router optimization."
  }
}
```

**Response `200 OK`:**
```json
{
  "candidate_id": "cand-001",
  "job_id": "job-101",
  "semantic_similarity_score": 93.5,
  "alignment_grade": "High",
  "matched_key_concepts": [
    "Modern Web Architecture",
    "Next.js App Router",
    "Design System Engineering",
    "GraphQL API Integration"
  ],
  "missing_or_gap_concepts": [
    "Turbopack"
  ],
  "model_info": {
    "engine": "semantic-cosine-v1",
    "vector_dimensions": 384,
    "offline_compatible": true
  }
}
```

---

## 5. Standardized Error Format

Whenever an operation fails within the AI microservice, it returns a structured JSON error payload matching the backend convention:

```json
{
  "error": {
    "code": "CORRUPT_DOCUMENT_PAYLOAD",
    "message": "Unable to extract text stream from PDF payload. File header may be truncated or corrupted.",
    "recoverable": false,
    "suggested_fallback": "REVERT_TO_DETERMINISTIC_EVALUATION"
  }
}
```

### Standard Error Codes:

| Code | HTTP Status | Cause |
| :--- | :---: | :--- |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | File format is neither PDF nor DOCX. |
| `PAYLOAD_TOO_LARGE` | 413 | Document file exceeds 10MB limit. |
| `CORRUPT_DOCUMENT_PAYLOAD` | 422 | Unreadable or encrypted PDF/DOCX structure. |
| `EXTRACTION_TIMEOUT` | 504 | Document layout processing exceeded 15.0s window. |
| `SERVICE_DEGRADED` | 503 | Optional embedding model weights uninitialized; fallback active. |

---

## 6. Integration Contract Rules for Core Track (AGY)

1. **Celery Worker Ingestion:**
   In `backend/app/workers/tasks.py`:
   ```python
   @celery_app.task(name="careersync.resume.process")
   def process_resume(resume_id: str) -> None:
       # 1. Fetch Resume record from database
       # 2. Call AI Service POST /api/v1/ai/parse-resume or /extract-entities
       # 3. Update Resume status ('processing' -> 'completed' or 'failed')
       # 4. Populate extracted skills into CandidateProfile if applicable
       # 5. Deterministic EvaluationRun remains independent and safe
   ```

2. **Zero Hallucination Guarantee:**
   The AI service never fabricates skills or dates. If a field cannot be reliably extracted from the resume text, it is returned as `null` or omitted.

3. **Offline & Academic Evaluation Compatibility:**
   The AI service runs 100% locally with zero external API calls (no OpenAI/Gemini external billing requirement). This ensures the SGP 5th Semester academic viva and demo work completely without internet access.
