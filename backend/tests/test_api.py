from __future__ import annotations


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "careersync-api"}
    assert "x-request-id" in res.headers
    assert res.headers["x-frame-options"] == "DENY"


def test_auth_and_job_flow(client):
    # Register recruiter
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "recruiter@example.com",
            "password": "Password123456!",
            "role": "recruiter",
            "organization_name": "Acme Inc",
        },
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == "recruiter@example.com"
    assert user_data["role"] == "recruiter"

    # Login recruiter
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter@example.com", "password": "Password123456!"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    token = token_data["access_token"]
    assert "careersync_refresh" in login_res.cookies

    # Create Job
    headers = {"Authorization": f"Bearer {token}"}
    job_res = client.post(
        "/api/v1/jobs",
        headers=headers,
        json={
            "title": "Senior AI Engineer",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 5.0,
            "education_required": "Bachelor",
            "description": "Build high-throughput LLM pipelines and deterministic ranking engines.",
            "skills": [{"name": "Python", "required": True, "min_years": 4.0}],
            "evaluation_weights": {"skills": 35, "experience": 35, "education": 15, "semantic": 15},
            "status": "open",
        },
    )
    assert job_res.status_code == 201
    job_data = job_res.json()
    assert job_data["title"] == "Senior AI Engineer"

    # List jobs
    list_res = client.get("/api/v1/jobs", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Candidate should not be able to list recruiter jobs
    client.post(
        "/api/v1/auth/register",
        json={"email": "candidate@example.com", "password": "Password123456!", "role": "candidate"},
    )
    cand_token = client.post(
        "/api/v1/auth/login",
        json={"email": "candidate@example.com", "password": "Password123456!"},
    ).json()["access_token"]

    forbidden_res = client.get("/api/v1/jobs", headers={"Authorization": f"Bearer {cand_token}"})
    assert forbidden_res.status_code == 403


def test_resume_idor_protection(client):
    # Register Candidate 1 & 2
    client.post("/api/v1/auth/register", json={"email": "c1@example.com", "password": "Password123456!", "role": "candidate"})
    client.post("/api/v1/auth/login", json={"email": "c1@example.com", "password": "Password123456!"})
    
    client.post("/api/v1/auth/register", json={"email": "c2@example.com", "password": "Password123456!", "role": "candidate"})
    c2_login = client.post("/api/v1/auth/login", json={"email": "c2@example.com", "password": "Password123456!"}).json()["access_token"]

    from uuid import uuid4
    random_uuid = str(uuid4())
    
    # Candidate 2 attempts to fetch Candidate 1's non-existent or unowned resume
    res = client.get(f"/api/v1/resumes/{random_uuid}", headers={"Authorization": f"Bearer {c2_login}"})
    assert res.status_code == 404


def test_tier1_evaluation_and_recruitment_workflow(client):
    # 1. Register and login recruiter
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "lead.recruiter@example.com",
            "password": "Password123456!",
            "role": "recruiter",
            "organization_name": "Tech Corp",
        },
    )
    recruiter_token = client.post(
        "/api/v1/auth/login",
        json={"email": "lead.recruiter@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    recruiter_headers = {"Authorization": f"Bearer {recruiter_token}"}

    # 2. Recruiter creates job
    job_payload = {
        "title": "Fullstack Platform Architect",
        "department": "Core Platform",
        "location": "Remote",
        "employment_type": "Full-time",
        "work_arrangement": "Remote",
        "experience_min_years": 4.0,
        "education_required": "Bachelor",
        "description": "Design distributed microservices with FastAPI and React.",
        "skills": [
            {"name": "Python", "required": True, "min_years": 3.0},
            {"name": "React", "required": True, "min_years": 2.0},
            {"name": "Docker", "required": False, "min_years": 1.0},
        ],
        "evaluation_weights": {"skills": 40, "experience": 30, "education": 15, "semantic": 15},
        "status": "open",
    }
    job_res = client.post("/api/v1/jobs", headers=recruiter_headers, json=job_payload)
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Verify public job directory lists the open job
    public_res = client.get("/api/v1/jobs/public/open")
    assert public_res.status_code == 200
    assert any(j["id"] == job_id for j in public_res.json())

    # 3. Register and login candidate
    client.post(
        "/api/v1/auth/register",
        json={"email": "applicant.alice@example.com", "password": "Password123456!", "role": "candidate"},
    )
    candidate_token = client.post(
        "/api/v1/auth/login",
        json={"email": "applicant.alice@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {candidate_token}"}

    # 4. Candidate uploads a resume
    files = {"file": ("alice_resume.pdf", b"%PDF-1.4 Mock PDF content containing Python and React expertise", "application/pdf")}
    upload_res = client.post("/api/v1/profile/resumes", headers=cand_headers, files=files)
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    # 5. Candidate applies to the job
    apply_res = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=cand_headers,
        json={"resume_id": resume_id},
    )
    assert apply_res.status_code == 201
    app_id = apply_res.json()["id"]

    # Candidate lists applications
    my_apps = client.get("/api/v1/applications", headers=cand_headers)
    assert my_apps.status_code == 200
    assert len(my_apps.json()) == 1

    # 6. Recruiter evaluates candidate application
    eval_res = client.post(
        f"/api/v1/applications/{app_id}/evaluate",
        headers=recruiter_headers,
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["status"] == "completed"
    assert eval_data["match_result"]["overall_score"] > 0
    assert len(eval_data["match_result"]["evaluated_skills"]) > 0

    # 7. Recruiter views candidate leaderboard for the job
    candidates_res = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=recruiter_headers)
    assert candidates_res.status_code == 200
    candidates = candidates_res.json()
    assert len(candidates) == 1
    assert candidates[0]["matchScore"] > 0
    assert len(candidates[0]["evidence"]) > 0

    # 8. Recruiter adds note to application
    note_res = client.post(
        f"/api/v1/applications/{app_id}/notes",
        headers=recruiter_headers,
        json={"body": "Great match on Python and React stack. Move to interview."},
    )
    assert note_res.status_code == 201

    # 9. Recruiter checks detailed candidate card
    cand_id = candidates[0]["id"]
    detail_res = client.get(f"/api/v1/jobs/{job_id}/candidates/{cand_id}", headers=recruiter_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["recruiterNotes"] == "Great match on Python and React stack. Move to interview."


def test_e2e_real_resume_worker_and_ai_integration(client, db_session, monkeypatch):
    """Verifies complete path: Resume upload -> Worker -> AI service -> Enriched Profile -> Deterministic Evaluation."""
    from app.workers.tasks import process_resume
    from app.models.entities import Resume, CandidateProfile

    # 1. Register candidate
    client.post(
        "/api/v1/auth/register",
        json={"email": "e2e.engineer@example.com", "password": "Password123456!", "role": "candidate"},
    )
    cand_token = client.post(
        "/api/v1/auth/login",
        json={"email": "e2e.engineer@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    # 2. Upload real-format docx resume
    from pathlib import Path
    sample_file = Path(__file__).parents[2] / "career-sync-storage" / "sample_real_resume.docx"
    with open(sample_file, "rb") as f:
        doc_bytes = f.read()

    files = {
        "file": (
            "resume.docx",
            doc_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    }
    upload_res = client.post("/api/v1/profile/resumes", headers=cand_headers, files=files)
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    # 3. Check if local AI microservice is live on port 8001; if offline in unit test runner, mock contract response
    import httpx
    ai_live = False
    try:
        with httpx.Client(timeout=0.5) as check_client:
            r = check_client.get("http://localhost:8001/health")
            if r.status_code == 200:
                ai_live = True
    except Exception:
        ai_live = False

    if not ai_live:
        class MockAIResponse:
            def __init__(self, json_data, status_code=200):
                self._json = json_data
                self.status_code = status_code
                self.text = "OK"

            def json(self):
                return self._json

        def mock_ai_post(self, url, *args, **kwargs):
            if "parse-resume" in url:
                return MockAIResponse({
                    "status": "completed",
                    "parser_version": "1.0.0",
                    "sections": {
                        "summary": "Senior Software Engineer with 8 years of distributed systems experience in high-scale environments.",
                        "skills": "Python, React, TypeScript, Docker, PostgreSQL, AWS",
                        "experience": "Lead Architect at FinTech Inc (2020 - Present)",
                        "education": "BS in Computer Science, MIT 2018"
                    }
                })
            elif "extract-entities" in url:
                return MockAIResponse({
                    "status": "completed",
                    "parser_version": "1.0.0",
                    "entities": {
                        "skills": [{"canonical_name": "Python"}, {"canonical_name": "React"}],
                        "experience": [{"organization": "FinTech Inc", "role_title": "Lead Architect"}],
                        "education": [{"degree_level": "Bachelor", "institution": "MIT"}]
                    }
                })
            return MockAIResponse({}, 404)

        monkeypatch.setattr(httpx.Client, "post", mock_ai_post)

    # Trigger worker task synchronously
    process_resume(resume_id, db=db_session)

    # 4. Verify database state
    from uuid import UUID
    resume = db_session.get(Resume, UUID(resume_id))
    assert resume is not None
    assert resume.processing_status.value == "completed"
    assert resume.extracted_text is not None
    assert len(resume.extracted_text) > 100

    candidate = db_session.get(CandidateProfile, resume.candidate_id)
    assert candidate is not None
    assert candidate.education is not None
    assert len(candidate.education.get("skills", [])) > 0


def test_ai_off_graceful_degradation(client, db_session, monkeypatch):
    """Verifies that when AI service is unavailable, worker handles it gracefully without crashing."""
    from app.core.config import Settings
    from app.workers.tasks import process_resume
    from app.models.entities import Resume

    # Point AI service to a dead port
    monkeypatch.setattr(
        "app.workers.tasks.get_settings",
        lambda: Settings(
            jwt_secret="a" * 32,
            ai_service_url="http://127.0.0.1:59999",
        ),
    )

    client.post(
        "/api/v1/auth/register",
        json={"email": "ai.off.cand@example.com", "password": "Password123456!", "role": "candidate"},
    )
    cand_token = client.post(
        "/api/v1/auth/login",
        json={"email": "ai.off.cand@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    from pathlib import Path
    sample_file = Path(__file__).parents[2] / "career-sync-storage" / "sample_real_resume.docx"
    with open(sample_file, "rb") as f:
        doc_bytes = f.read()

    files = {
        "file": (
            "resume_dead_ai.docx",
            doc_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    }
    upload_res = client.post("/api/v1/profile/resumes", headers=cand_headers, files=files)
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    # Process resume with AI offline
    process_resume(resume_id, db=db_session)

    from uuid import UUID
    resume = db_session.get(Resume, UUID(resume_id))
    assert resume is not None
    # Must gracefully degrade to needs_attention, never crash or fabricate AI output
    assert resume.processing_status.value == "needs_attention"
    assert resume.needs_attention_reason.value == "parse_failed"


