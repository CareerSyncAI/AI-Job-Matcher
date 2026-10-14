import io
import docx


def _create_docx_resume_bytes(text: str = "Experienced Software Engineer with Python, React, and Docker expertise.") -> bytes:
    doc = docx.Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


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
    # 1. Register Candidate 1 & Candidate 2
    client.post("/api/v1/auth/register", json={"email": "c1@example.com", "password": "Password123456!", "role": "candidate"})
    c1_token = client.post("/api/v1/auth/login", json={"email": "c1@example.com", "password": "Password123456!"}).json()["access_token"]
    c1_headers = {"Authorization": f"Bearer {c1_token}"}

    client.post("/api/v1/auth/register", json={"email": "c2@example.com", "password": "Password123456!", "role": "candidate"})
    c2_token = client.post("/api/v1/auth/login", json={"email": "c2@example.com", "password": "Password123456!"}).json()["access_token"]
    c2_headers = {"Authorization": f"Bearer {c2_token}"}

    # Register Recruiter 1 & Recruiter 2
    client.post("/api/v1/auth/register", json={"email": "r1@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "Org 1"})
    r1_token = client.post("/api/v1/auth/login", json={"email": "r1@example.com", "password": "Password123456!"}).json()["access_token"]
    r1_headers = {"Authorization": f"Bearer {r1_token}"}

    client.post("/api/v1/auth/register", json={"email": "r2@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "Org 2"})
    r2_token = client.post("/api/v1/auth/login", json={"email": "r2@example.com", "password": "Password123456!"}).json()["access_token"]
    r2_headers = {"Authorization": f"Bearer {r2_token}"}

    # Candidate 1 uploads a profile resume
    pdf_payload = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = client.post(
        "/api/v1/profile/resumes",
        headers=c1_headers,
        files={"file": ("c1_resume.pdf", pdf_payload, "application/pdf")},
    )
    assert upload_res.status_code == 202
    c1_resume_id = upload_res.json()["id"]

    # Candidate 1 can view metadata and ATS
    res = client.get(f"/api/v1/resumes/{c1_resume_id}", headers=c1_headers)
    assert res.status_code == 200
    ats_res = client.get(f"/api/v1/resumes/{c1_resume_id}/ats", headers=c1_headers)
    assert ats_res.status_code == 200
    assert "detected_skills" in ats_res.json()
    assert isinstance(ats_res.json()["detected_skills"], list)

    # Candidate 2 cannot view Candidate 1's resume or ATS data (403 Forbidden)
    res_c2 = client.get(f"/api/v1/resumes/{c1_resume_id}", headers=c2_headers)
    assert res_c2.status_code == 403
    ats_c2 = client.get(f"/api/v1/resumes/{c1_resume_id}/ats", headers=c2_headers)
    assert ats_c2.status_code == 403

    # Recruiter 1 (unrelated) cannot view Candidate 1's profile resume or ATS data (403 Forbidden, no 500 error)
    res_r1 = client.get(f"/api/v1/resumes/{c1_resume_id}", headers=r1_headers)
    assert res_r1.status_code == 403
    ats_r1 = client.get(f"/api/v1/resumes/{c1_resume_id}/ats", headers=r1_headers)
    assert ats_r1.status_code == 403

    # Recruiter 1 creates Job 1 and uploads a candidate resume directly
    job1_res = client.post(
        "/api/v1/jobs",
        headers=r1_headers,
        json={
            "title": "Backend Dev", "department": "Eng", "location": "Remote",
            "employment_type": "Full-time", "work_arrangement": "Remote",
            "experience_min_years": 2.0, "education_required": "Bachelor",
            "description": "Dev", "skills": [{"name": "Python", "required": True}],
            "evaluation_weights": {"skills": 100, "experience": 0, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    job1_id = job1_res.json()["id"]
    job1_upload = client.post(
        f"/api/v1/jobs/{job1_id}/resumes",
        headers=r1_headers,
        files={"file": ("job1_candidate.pdf", pdf_payload, "application/pdf")},
    )
    assert job1_upload.status_code == 202
    job1_resume_id = job1_upload.json()["id"]

    # Recruiter 1 can access job resume and ATS
    assert client.get(f"/api/v1/resumes/{job1_resume_id}", headers=r1_headers).status_code == 200
    assert client.get(f"/api/v1/resumes/{job1_resume_id}/ats", headers=r1_headers).status_code == 200

    # Recruiter 2 cannot access Recruiter 1's job resume or ATS data
    assert client.get(f"/api/v1/resumes/{job1_resume_id}", headers=r2_headers).status_code == 403
    assert client.get(f"/api/v1/resumes/{job1_resume_id}/ats", headers=r2_headers).status_code == 403


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
    docx_bytes = _create_docx_resume_bytes("Alice Vance\nExperienced Fullstack Engineer with Python, React, and Docker expertise.")
    files = {"file": ("alice_resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
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


def test_substring_collision_resistance():
    """Verify that substring skills (Java in JavaScript, Go in Google, R in research) do NOT produce false matches."""
    from app.services.evaluation import DeterministicEvaluationEngine
    from app.models.entities import Job, JobSkill, CandidateProfile, Resume
    from app.models.enums import JobStatus, EvaluatedSkillStatus
    from app.services.scoring import Weights

    engine = DeterministicEvaluationEngine()
    tricky_resume = "JavaScript developer working at Google using PostgreSQL and conducting research."

    job = Job(
        title="Backend Engineer",
        description="Core systems",
        experience_min_years=0,
        education_required="Any",
        skills_weight=100,
        experience_weight=0,
        education_weight=0,
        semantic_weight=0,
        status=JobStatus.OPEN,
        skills=[
            JobSkill(name="Java", normalized_name="java", required=True),
            JobSkill(name="Go", normalized_name="go", required=True),
            JobSkill(name="R", normalized_name="r", required=True),
            JobSkill(name="SQL", normalized_name="sql", required=True),
        ],
    )
    cand = CandidateProfile(name="Applicant", total_experience_years=3.0, education={"skills": []})
    resume = Resume(extracted_text=tricky_resume)
    weights = Weights(skills=100, experience=0, education=0, semantic=0)

    result = engine.evaluate(job=job, candidate=cand, resume=resume, weights=weights)

    matched_names = {s["name"] for s in result["evaluated_skills"] if s["status"] == EvaluatedSkillStatus.MATCHED}
    assert "Java" not in matched_names, "Java must not match from JavaScript"
    assert "Go" not in matched_names, "Go must not match from Google"
    assert "R" not in matched_names, "R must not match from research"
    # Score should NOT be inflated
    assert result["skills_score"] <= 25.0


def test_job_read_authorization_and_weight_redaction(client):
    """Verify that non-owners cannot see DRAFT jobs, and candidates/other recruiters see redacted weights."""
    # Recruiter 1
    client.post("/api/v1/auth/register", json={"email": "rec1@agency.com", "password": "Password123456!", "role": "recruiter"})
    r1_token = client.post("/api/v1/auth/login", json={"email": "rec1@agency.com", "password": "Password123456!"}).json()["access_token"]
    r1_headers = {"Authorization": f"Bearer {r1_token}"}

    # Recruiter 2
    client.post("/api/v1/auth/register", json={"email": "rec2@agency.com", "password": "Password123456!", "role": "recruiter"})
    r2_token = client.post("/api/v1/auth/login", json={"email": "rec2@agency.com", "password": "Password123456!"}).json()["access_token"]
    r2_headers = {"Authorization": f"Bearer {r2_token}"}

    # Candidate
    client.post("/api/v1/auth/register", json={"email": "viewer.cand@example.com", "password": "Password123456!", "role": "candidate"})
    cand_token = client.post("/api/v1/auth/login", json={"email": "viewer.cand@example.com", "password": "Password123456!"}).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    # R1 creates draft job with internal weights
    create_res = client.post("/api/v1/jobs", headers=r1_headers, json={
        "title": "Secret Strategy Lead",
        "description": "Confidential hiring initiative",
        "employment_type": "Full-time",
        "work_arrangement": "Remote",
        "skills": [{"name": "Python", "required": True}],
        "evaluation_weights": {"skills": 50, "experience": 30, "education": 10, "semantic": 10},
        "status": "draft",
    })
    assert create_res.status_code == 201
    job_id = create_res.json()["id"]

    # Candidate and Recruiter 2 attempt to read draft job -> 404
    assert client.get(f"/api/v1/jobs/{job_id}", headers=cand_headers).status_code == 404
    assert client.get(f"/api/v1/jobs/{job_id}", headers=r2_headers).status_code == 404

    # Recruiter 1 opens the job
    patch_res = client.patch(f"/api/v1/jobs/{job_id}", headers=r1_headers, json={"status": "open"})
    assert patch_res.status_code == 200

    # Recruiter 1 sees true weights
    r1_job = client.get(f"/api/v1/jobs/{job_id}", headers=r1_headers).json()
    assert r1_job["evaluation_weights"]["skills"] == 50

    # Candidate sees redacted weights (all 0)
    cand_job = client.get(f"/api/v1/jobs/{job_id}", headers=cand_headers).json()
    assert cand_job["evaluation_weights"]["skills"] == 0
    assert cand_job["evaluation_weights"]["experience"] == 0

    # Recruiter 2 sees redacted weights
    r2_job = client.get(f"/api/v1/jobs/{job_id}", headers=r2_headers).json()
    assert r2_job["evaluation_weights"]["skills"] == 0


def test_candidate_profile_anti_hijack(client, db_session):
    """Ensure recruiter resume upload containing registered user email does not hijack or mutate registered profile."""
    from app.models.entities import CandidateProfile, Resume
    from app.api.v1.resumes import _find_or_create_candidate

    # Registered candidate Alice
    alice = CandidateProfile(
        email="alice.registered@example.com",
        name="Alice Real",
        headline="Senior AI Scientist",
        education={"degree": "Master", "skills": ["PyTorch", "Transformers"]},
        total_experience_years=5.0,
    )
    from uuid import uuid4
    alice.user_id = uuid4()
    db_session.add(alice)
    db_session.commit()

    # Recruiter uploads resume text referencing Alice's email
    hijack_attempt_text = "Junior Dev\nEmail: alice.registered@example.com\nSkills: HTML, CSS\nTenure: 1 year"
    created_cand = _find_or_create_candidate(db_session, filename="fake_resume.pdf", extracted_text=hijack_attempt_text)

    # Must NOT return Alice's registered profile
    assert created_cand.id != alice.id
    assert created_cand.user_id is None

    # Alice's real profile skills must NOT be touched
    db_session.refresh(alice)
    assert alice.education["skills"] == ["PyTorch", "Transformers"]
    assert alice.total_experience_years == 5.0


def test_candidate_profile_update_preserves_skills(client):
    """F1: Ensure partial profile update without skills does not erase existing skills."""
    # Register candidate
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": "f1_candidate@example.com", "password": "Password123456!", "role": "candidate"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "f1_candidate@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Set initial skills
    p1 = client.put("/api/v1/auth/profile", headers=headers, json={"skills": ["Python", "FastAPI"]})
    assert p1.status_code == 200
    assert p1.json()["skills"] == ["Python", "FastAPI"]

    # Partial update: headline only, skills omitted
    p2 = client.put("/api/v1/auth/profile", headers=headers, json={"headline": "Lead Backend Architect"})
    assert p2.status_code == 200
    assert p2.json()["headline"] == "Lead Backend Architect"
    assert p2.json()["skills"] == ["Python", "FastAPI"]

    # Explicit empty skills list clears skills
    p3 = client.put("/api/v1/auth/profile", headers=headers, json={"skills": []})
    assert p3.status_code == 200
    assert p3.json()["skills"] == []


def test_apply_to_job_enforces_resume_processing_status(client, db_session):
    """F4: Candidate cannot apply with a QUEUED or NEEDS_ATTENTION resume."""
    from app.models.entities import Resume
    from app.models.enums import ProcessingStatus

    # Create recruiter and open job
    client.post("/api/v1/auth/register", json={"email": "rec.f4@example.com", "password": "Password123456!", "role": "recruiter"})
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.f4@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}
    job_id = client.post("/api/v1/jobs", headers=rec_h, json={"title": "Test Job", "description": "Desc", "status": "open"}).json()["id"]

    # Register candidate
    client.post("/api/v1/auth/register", json={"email": "cand.f4@example.com", "password": "Password123456!", "role": "candidate"})
    cand_tok = client.post("/api/v1/auth/login", json={"email": "cand.f4@example.com", "password": "Password123456!"}).json()["access_token"]
    cand_h = {"Authorization": f"Bearer {cand_tok}"}

    # Upload resume
    files = {"file": ("f4.pdf", b"%PDF-1.4 Mock", "application/pdf")}
    res_id = client.post("/api/v1/profile/resumes", headers=cand_h, files=files).json()["id"]

    from uuid import UUID
    # Manually transition resume to QUEUED
    resume = db_session.query(Resume).filter(Resume.id == UUID(res_id)).one()
    resume.processing_status = ProcessingStatus.QUEUED
    db_session.commit()

    # Apply attempt while QUEUED must fail with 409
    apply_queued = client.post(f"/api/v1/jobs/{job_id}/applications", headers=cand_h, json={"resume_id": res_id})
    assert apply_queued.status_code == 409
    assert "still being processed" in str(apply_queued.json())

    # Manually transition resume to NEEDS_ATTENTION
    resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
    db_session.commit()

    # Apply attempt while NEEDS_ATTENTION must fail with 422
    apply_failed = client.post(f"/api/v1/jobs/{job_id}/applications", headers=cand_h, json={"resume_id": res_id})
    assert apply_failed.status_code == 422
    assert "Resume processing failed" in str(apply_failed.json())


def test_job_weights_all_zero_rejected(client):
    """F6: All-zero job weights must be rejected by API validation with 422."""
    client.post("/api/v1/auth/register", json={"email": "rec.f6@example.com", "password": "Password123456!", "role": "recruiter"})
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.f6@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={
            "title": "Invalid Job",
            "description": "Desc",
            "evaluation_weights": {"skills": 0, "experience": 0, "education": 0, "semantic": 0},
        },
    )
    assert res.status_code == 422
    assert "Evaluation weights must sum to exactly 100" in str(res.json())


def test_evaluation_benchmark_restricted_to_admin(client):
    """F9: Non-admin users cannot trigger benchmark evaluations."""
    client.post("/api/v1/auth/register", json={"email": "cand.f9@example.com", "password": "Password123456!", "role": "candidate"})
    tok = client.post("/api/v1/auth/login", json={"email": "cand.f9@example.com", "password": "Password123456!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}

    res = client.get("/api/v1/evaluation/benchmark", headers=headers)
    assert res.status_code == 403


def test_apply_to_job_handles_evaluation_failure_cleanly(client, monkeypatch):
    """When auto-evaluation raises an exception, the application is created, failed run is recorded, and duplicates are prevented."""
    # 1. Register recruiter and create job
    client.post("/api/v1/auth/register", json={"email": "rec.evalfail@example.com", "password": "Password123456!", "role": "recruiter"})
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.evalfail@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}
    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={
            "title": "Backend Dev",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 3.0,
            "education_required": "Bachelor",
            "description": "Python, SQL, APIs",
            "skills": [{"name": "Python", "required": True, "min_years": 2.0}],
            "evaluation_weights": {"skills": 40, "experience": 30, "education": 15, "semantic": 15},
            "status": "open",
        },
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # 2. Register candidate and upload resume
    client.post("/api/v1/auth/register", json={"email": "cand.evalfail@example.com", "password": "Password123456!", "role": "candidate"})
    cand_tok = client.post("/api/v1/auth/login", json={"email": "cand.evalfail@example.com", "password": "Password123456!"}).json()["access_token"]
    cand_h = {"Authorization": f"Bearer {cand_tok}"}

    docx_bytes = _create_docx_resume_bytes("Python Software Engineer with 4 years experience in SQL and FastAPI.")
    upload_res = client.post(
        "/api/v1/profile/resumes",
        headers=cand_h,
        files={"file": ("my_resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    # 3. Mock EvaluationService.evaluate_application to simulate unexpected evaluation crash
    from app.services.evaluation import EvaluationService
    def crashing_evaluate(self, db, *, application_id, recruiter_id):
        raise RuntimeError("Simulated transient evaluation failure")

    monkeypatch.setattr(EvaluationService, "evaluate_application", crashing_evaluate)

    # 4. Apply to job: Should succeed with 201 Created
    apply_res = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=cand_h,
        json={"resume_id": resume_id},
    )
    assert apply_res.status_code == 201
    app_data = apply_res.json()
    assert app_data["status"] == "new"
    app_id = app_data["id"]

    # 5. Verify that duplicate application is rejected with 409
    dup_res = client.post(
        f"/api/v1/jobs/{job_id}/applications",
        headers=cand_h,
        json={"resume_id": resume_id},
    )
    assert dup_res.status_code == 409

    # 6. Verify that an EvaluationRun with status FAILED was recorded
    from app.db.session import SessionLocal
    from app.models.entities import EvaluationRun
    from app.models.enums import EvaluationStatus
    from uuid import UUID
    db = SessionLocal()
    try:
        run = db.query(EvaluationRun).filter(EvaluationRun.application_id == UUID(app_id)).first()
        assert run is not None
        assert run.status == EvaluationStatus.FAILED
    finally:
        db.close()




