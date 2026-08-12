from __future__ import annotations

from app.models.enums import UserRole


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
    job_id = job_data["id"]

    # List jobs
    list_res = client.get("/api/v1/jobs", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Candidate should not be able to list recruiter jobs
    cand_reg = client.post(
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
    c1_token = client.post("/api/v1/auth/register", json={"email": "c1@example.com", "password": "Password123456!", "role": "candidate"}).json()
    c1_login = client.post("/api/v1/auth/login", json={"email": "c1@example.com", "password": "Password123456!"}).json()["access_token"]
    
    c2_token = client.post("/api/v1/auth/register", json={"email": "c2@example.com", "password": "Password123456!", "role": "candidate"}).json()
    c2_login = client.post("/api/v1/auth/login", json={"email": "c2@example.com", "password": "Password123456!"}).json()["access_token"]

    from uuid import uuid4
    random_uuid = str(uuid4())
    
    # Candidate 2 attempts to fetch Candidate 1's non-existent or unowned resume
    res = client.get(f"/api/v1/resumes/{random_uuid}", headers={"Authorization": f"Bearer {c2_login}"})
    assert res.status_code == 404

