# Resume Analysis Lifecycle API Contract

**Target Consumer:** Antigravity App (Frontend)  
**Base Prefix:** `/api/v1`  
**Auth:** Bearer JWT (`Authorization: Bearer <access_token>`) or HTTP-only auth cookie.  
**Ownership Rules:** Candidate (resume owner), Recruiter (owner of associated `ingestion_job_id` or `application.job_id`), or Admin.  
**Workflow Boundary:** Resume analysis state (`ResumeAnalysisStatus`) is strictly independent of recruiter `ApplicationStatus` (`new`, `under_review`, etc.). Starting, completing, failing, or retrying resume analysis never mutates `Application.status`.

---

## 1. Endpoints

| Method | Path | Purpose | Success Status |
|---|---|---|---|
| `POST` | `/api/v1/resumes/{resume_id}/analysis` | Explicitly start a new analysis run | `202 Accepted` |
| `GET` | `/api/v1/resumes/{resume_id}/analysis` | Get latest run status (or `ready` if none exists) — used for initial load & refresh recovery | `200 OK` |
| `GET` | `/api/v1/resumes/{resume_id}/analysis/{run_id}` | Poll a specific run by `run_id` | `200 OK` |
| `POST` | `/api/v1/resumes/{resume_id}/analysis/{run_id}/retry` | Retry a `failed` run (creates a new run with incremented `attempt_number`) | `202 Accepted` |

### Preserved Compatible Endpoints
- `POST /api/v1/jobs/{job_id}/resumes` (`202 Accepted`) — Resume upload/ingestion unchanged.
- `GET /api/v1/resumes/{resume_id}` (`200 OK`) — Resume metadata & `processing_status` unchanged.
- `GET /api/v1/resumes/{resume_id}/ats` (`200 OK`) — Synchronous on-demand ATS inspection unchanged.
- `POST /api/v1/resumes/analyze-text-ats` (`200 OK`) — Raw text ATS inspection for Resume Studio unchanged.

---

## 2. Status Enumeration & Stage IDs

### `status` (`ResumeAnalysisStatus`)
- `ready`: No analysis run has been initiated yet for this resume (`run_id` is `null`).
- `queued`: Run created and dispatched to worker/background runner; execution has not started.
- `running`: Worker/runner is actively executing a real backend stage.
- `completed`: All stages finished and `result` (`ATSAnalysisSchema`) is persisted (`result_available: true`).
- `failed`: Execution terminated with an error (`failure_code` and `failure_detail` populated, `result_available: false`).

### `current_stage` (Observable Stage IDs)
1. `ready` (pre-start)
2. `queued` (dispatched)
3. `extracting_text` (loading stored text or running `extract_text_from_file`)
4. `analyzing_ats` (running `ats_analyzer.analyze(text)`)
5. `persisting_results` (saving `result_payload`)
6. `completed` (terminal success)
7. `failed` (terminal failure)

### Valid Transitions
- `(none / ready)` -> `POST /analysis` -> `queued`
- `queued` -> `running` (`extracting_text` -> `analyzing_ats` -> `persisting_results`) -> `completed` | `failed`
- `queued` -> `failed` (if worker enqueue fails)
- `failed` -> `POST /analysis/{run_id}/retry` -> new run in `queued` (`attempt_number = prev + 1`, `retry_of_run_id = prev.id`)

---

## 3. Response Schema (`ResumeAnalysisStatusResponse`)

```json
{
  "resume_id": "uuid",
  "run_id": "uuid | null",
  "status": "ready | queued | running | completed | failed",
  "current_stage": "ready | queued | extracting_text | analyzing_ats | persisting_results | completed | failed | null",
  "attempt_number": 0,
  "retry_of_run_id": "uuid | null",
  "result_available": false,
  "failure_code": "string | null",
  "failure_detail": "string | null",
  "result": "ATSAnalysisSchema | null",
  "created_at": "datetime | null",
  "started_at": "datetime | null",
  "completed_at": "datetime | null",
  "failed_at": "datetime | null"
}
```

---

## 4. Example Requests & Responses

### Initial / Pre-Start (`GET /api/v1/resumes/{resume_id}/analysis`)
```json
{
  "resume_id": "7f3c9b1e-1111-4444-8888-aaaaaaaaaaaa",
  "run_id": null,
  "status": "ready",
  "current_stage": "ready",
  "attempt_number": 0,
  "retry_of_run_id": null,
  "result_available": false,
  "failure_code": null,
  "failure_detail": null,
  "result": null,
  "created_at": null,
  "started_at": null,
  "completed_at": null,
  "failed_at": null
}
```

### Start Analysis (`POST /api/v1/resumes/{resume_id}/analysis` -> `202 Accepted`)
```json
{
  "resume_id": "7f3c9b1e-1111-4444-8888-aaaaaaaaaaaa",
  "run_id": "9a1d2e3f-2222-4444-8888-bbbbbbbbbbbb",
  "status": "queued",
  "current_stage": "queued",
  "attempt_number": 1,
  "retry_of_run_id": null,
  "result_available": false,
  "failure_code": null,
  "failure_detail": null,
  "result": null,
  "created_at": "2026-11-27T14:20:00Z",
  "started_at": null,
  "completed_at": null,
  "failed_at": null
}
```

### Poll Completed (`GET /api/v1/resumes/{resume_id}/analysis/{run_id}` -> `200 OK`)
```json
{
  "resume_id": "7f3c9b1e-1111-4444-8888-aaaaaaaaaaaa",
  "run_id": "9a1d2e3f-2222-4444-8888-bbbbbbbbbbbb",
  "status": "completed",
  "current_stage": "completed",
  "attempt_number": 1,
  "retry_of_run_id": null,
  "result_available": true,
  "failure_code": null,
  "failure_detail": null,
  "result": {
    "overall_ats_score": 86.5,
    "grade": "B",
    "section_score": 90.0,
    "contact_score": 100.0,
    "impact_score": 75.0,
    "formatting_score": 100.0,
    "skills_score": 62.5,
    "detected_sections": {
      "summary": true,
      "skills": true,
      "experience": true,
      "education": true,
      "projects": false,
      "certifications": false
    },
    "detected_skills": ["Docker", "FastAPI", "PostgreSQL", "Python", "Redis"],
    "missing_critical_sections": [],
    "contact_details": {
      "email": "jane.doe@example.com",
      "phone": "+1 (555) 123-4567",
      "profile_links": "https://www.linkedin.com/in/janedoe",
      "linkedin": "https://www.linkedin.com/in/janedoe",
      "github": null,
      "portfolio": null,
      "location": "San Francisco, CA"
    },
    "action_verbs_found": ["automated", "built", "deployed", "led", "reduced"],
    "quantifiable_metrics_count": 3,
    "word_count": 64,
    "strengths": ["All primary resume sections (Experience, Skills, Education) are clearly detectable."],
    "issues": []
  },
  "created_at": "2026-11-27T14:20:00Z",
  "started_at": "2026-11-27T14:20:00Z",
  "completed_at": "2026-11-27T14:20:01Z",
  "failed_at": null
}
```

### Failed Run (`status: "failed"`)
Common `failure_code` values: `file_missing`, `scanned_document`, `document_security_rejected`, `parse_failed`, `empty_text`, `worker_enqueue_failed`, `worker_timeout`, `analysis_error`.

---

## 5. Error Responses, Retry & Refresh Recovery

- `401 Unauthorized`: Missing or invalid JWT/session.
- `403 Forbidden`: Caller does not own the resume or associated job/application.
- `404 Not Found`: `resume_id` or `run_id` does not exist.
- `409 Conflict`:
  - `POST /analysis` when an active (`queued` or `running`) run already exists for `resume_id` (duplicate prevention).
  - `POST /analysis/{run_id}/retry` when target run is not `failed`, or another run is already `queued`/`running`.

### Polling & Refresh Recovery Guidance
1. On page load or browser refresh, call `GET /api/v1/resumes/{resume_id}/analysis`.
2. If `status` is `ready`, show the "Analyze Resume" action.
3. If `status` is `queued` or `running`, poll `GET /api/v1/resumes/{resume_id}/analysis/{run_id}` every 1500-2000 ms until `status` is `completed` or `failed`.
4. If `status` is `failed`, display `failure_detail` and offer Retry (`POST /api/v1/resumes/{resume_id}/analysis/{run_id}/retry`), then poll the newly returned `run_id`.
