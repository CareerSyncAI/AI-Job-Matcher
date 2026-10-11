"""API Conformance Tests against docs/ai-service-contract.md."""

import os
import pytest
from fastapi.testclient import TestClient
from src.api.app import app, check_production_security, DEFAULT_DEV_KEY


@pytest.fixture
def client():
    return TestClient(app, headers={"X-AI-Service-Key": DEFAULT_DEV_KEY})


@pytest.mark.parametrize(
    "endpoint,method,payload",
    [
        ("/api/v1/ai/normalize-skills", "post", {"skills": ["Python"]}),
        ("/api/v1/ai/extract-entities", "post", {"resume_id": "r1", "text": "Python engineer", "sections": {}}),
        (
            "/api/v1/ai/semantic-match",
            "post",
            {
                "candidate_id": "c1",
                "candidate_profile": {"skills": ["Python"]},
                "job_requisition": {"job_id": "j1", "title": "Dev", "required_skills": ["Python"]},
            },
        ),
    ],
)
def test_unauthenticated_request_rejected(endpoint, method, payload):
    """Verifies unauthenticated calls to all protected endpoints return 401."""
    unauth_client = TestClient(app)
    response = getattr(unauth_client, method)(endpoint, json=payload)
    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.parametrize(
    "endpoint,method,payload",
    [
        ("/api/v1/ai/normalize-skills", "post", {"skills": ["Python"]}),
        ("/api/v1/ai/extract-entities", "post", {"resume_id": "r1", "text": "Python engineer", "sections": {}}),
        (
            "/api/v1/ai/semantic-match",
            "post",
            {
                "candidate_id": "c1",
                "candidate_profile": {"skills": ["Python"]},
                "job_requisition": {"job_id": "j1", "title": "Dev", "required_skills": ["Python"]},
            },
        ),
    ],
)
def test_invalid_api_key_rejected(endpoint, method, payload):
    """Verifies calls with invalid AI service key return 401."""
    bad_client = TestClient(app, headers={"X-AI-Service-Key": "wrong-key"})
    response = getattr(bad_client, method)(endpoint, json=payload)
    assert response.status_code == 401


def test_parse_resume_auth_rejection():
    """Verifies parse-resume endpoint also rejects missing/invalid auth headers."""
    files = {"file": ("test.pdf", b"%PDF-1.4 mock", "application/pdf")}
    unauth_client = TestClient(app)
    assert unauth_client.post("/api/v1/ai/parse-resume", files=files).status_code == 401

    bad_client = TestClient(app, headers={"X-AI-Service-Key": "invalid-key"})
    assert bad_client.post("/api/v1/ai/parse-resume", files=files).status_code == 401


def test_production_startup_rejects_default_dev_key(monkeypatch):
    """Verifies production environment aborts if using default dev key."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("AI_SERVICE_API_KEY", DEFAULT_DEV_KEY)
    with pytest.raises(RuntimeError, match="secure, non-default AI_SERVICE_API_KEY"):
        check_production_security()


def test_health_endpoint(client):
    """Verifies GET /health endpoint conforms to contract."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"
    assert data["service"] == "careersync-ai-engine"
    assert data["capabilities"]["skill_extraction"] is True
    assert data["capabilities"]["semantic_similarity"] is True


def test_normalize_skills_endpoint(client):
    """Verifies POST /api/v1/ai/normalize-skills endpoint conforms to contract."""
    payload = {
        "skills": ["ReactJS", "k8s", "golang", "postgres", "Amazon Web Services"]
    }
    response = client.post("/api/v1/ai/normalize-skills", json=payload)
    assert response.status_code == 200
    data = response.json()
    normalized = data["normalized"]
    assert len(normalized) == 5

    res_map = {item["input"]: item for item in normalized}
    assert res_map["ReactJS"]["canonical"] == "React"
    assert res_map["k8s"]["canonical"] == "Kubernetes"
    assert res_map["golang"]["canonical"] == "Go"
    assert res_map["postgres"]["canonical"] == "PostgreSQL"
    assert res_map["Amazon Web Services"]["canonical"] == "AWS"


def test_extract_entities_endpoint(client):
    """Verifies POST /api/v1/ai/extract-entities endpoint conforms to contract."""
    payload = {
        "resume_id": "res-test-01",
        "text": "Senior Systems Engineer with experience in Python, Docker, and PyTorch at Acme Corp (2020 - Present). Graduated with BS in Computer Science from Stanford in 2019.",
        "sections": {
            "skills": "Python, Docker, PyTorch, PostgreSQL",
            "experience": "Senior Systems Engineer at Acme Corp (2020 - Present)",
            "education": "BS in Computer Science, Stanford University, 2019"
        }
    }
    response = client.post("/api/v1/ai/extract-entities", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["resume_id"] == "res-test-01"
    assert data["status"] == "completed"

    entities = data["entities"]
    skills = [s["canonical_name"] for s in entities["skills"]]
    assert "Python" in skills
    assert "Docker" in skills
    assert "PyTorch" in skills

    assert len(entities["experience"]) >= 1
    assert entities["total_experience_months"] > 0
    assert len(entities["education"]) >= 1


def test_semantic_match_endpoint(client):
    """Verifies POST /api/v1/ai/semantic-match endpoint conforms to contract."""
    payload = {
        "candidate_id": "cand-01",
        "candidate_profile": {
            "headline": "Senior AI Systems Engineer",
            "skills": ["Python", "PyTorch", "Docker", "PostgreSQL", "FastAPI"],
            "experience_summary": "Engineered distributed inference services serving 20M users."
        },
        "job_requisition": {
            "job_id": "job-101",
            "title": "Lead AI Platform Engineer",
            "required_skills": ["Python", "PyTorch", "Docker"],
            "preferred_skills": ["FastAPI", "Kubernetes"],
            "description": "Looking for an engineer to lead our model inference platform using Python and PyTorch."
        }
    }
    response = client.post("/api/v1/ai/semantic-match", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["candidate_id"] == "cand-01"
    assert data["job_id"] == "job-101"
    assert 0.0 <= data["semantic_similarity_score"] <= 100.0
    assert data["alignment_grade"] in ["High", "Moderate", "Low"]
    assert "Python" in data["matched_key_concepts"]
    assert "PyTorch" in data["matched_key_concepts"]
    assert "Kubernetes" in data["missing_or_gap_concepts"]


def test_unsupported_file_type_error(client):
    """Verifies standard structured error response for unsupported file formats."""
    files = {"file": ("test.exe", b"invalid executable payload", "application/octet-stream")}
    response = client.post("/api/v1/ai/parse-resume", files=files)
    assert response.status_code == 415
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"
