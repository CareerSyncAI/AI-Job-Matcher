from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import docx
import pytest

from app.models.entities import (
    Application,
    CandidateProfile,
    EvaluatedSkill,
    EvaluationRun,
    EvidenceClaim,
    Job,
    JobSkill,
    MatchResult,
    RecruiterProfile,
    Resume,
    User,
)
from app.models.enums import (
    EvaluatedSkillStatus,
    EvaluationStatus,
    EvidenceConfidence,
    EvidenceKind,
)


def _docx_bytes(text: str) -> bytes:
    doc = docx.Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _setup_candidate_and_job(client, db_session, suffix="1"):
    # Recruiter
    recruiter_email = f"freshness-rec-{suffix}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": recruiter_email,
            "password": "Password123456!",
            "role": "recruiter",
            "organization_name": "Freshness Corp",
        },
    )
    r_token = client.post(
        "/api/v1/auth/login",
        json={"email": recruiter_email, "password": "Password123456!"},
    ).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job_data = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": f"Senior Software Engineer {suffix}",
            "description": "Building high scale APIs with Python and Docker.",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [
                {"name": "Python", "required": True},
                {"name": "PostgreSQL", "required": True},
                {"name": "Docker", "required": False},
                {"name": "Redis", "required": False},
            ],
            "status": "open",
        },
    ).json()

    # Candidate
    candidate_email = f"freshness-cand-{suffix}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": candidate_email,
            "password": "Password123456!",
            "role": "candidate",
        },
    )
    c_token = client.post(
        "/api/v1/auth/login",
        json={"email": candidate_email, "password": "Password123456!"},
    ).json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    resume_bytes = _docx_bytes("Senior Python Engineer with extensive Docker containerization experience.")
    upload = client.post(
        "/api/v1/profile/resumes",
        headers=c_headers,
        files={
            "file": (
                "resume.docx",
                resume_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert upload.status_code == 202

    app_res = client.post(
        f"/api/v1/jobs/{job_data['id']}/applications",
        headers=c_headers,
        json={"resume_id": upload.json()["id"]},
    )
    assert app_res.status_code == 201
    application_id = app_res.json()["id"]

    return {
        "candidate_headers": c_headers,
        "recruiter_headers": r_headers,
        "job": job_data,
        "application_id": application_id,
    }


def test_newer_pending_evaluation_masks_stale_completed(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="pending")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    # 1. Existing completed evaluation run
    t1 = datetime.now(UTC) - timedelta(hours=2)
    run1 = (
        db_session.query(EvaluationRun)
        .filter_by(application_id=app_id)
        .one()
    )
    run1.created_at = t1
    run1.completed_at = t1
    run1.status = EvaluationStatus.COMPLETED

    # 2. Add newer pending (queued/running) evaluation run
    t2 = datetime.now(UTC)
    run2 = EvaluationRun(
        application_id=app_id,
        status=EvaluationStatus.QUEUED,
        scoring_version="v2",
        weights_used={"skills": 40, "experience": 30, "education": 15, "semantic": 15},
        created_at=t2,
    )
    db_session.add(run2)
    db_session.commit()

    # Query match results: must return pending, NOT stale completed score
    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["evaluation_status"] == "pending"
    assert data["overall_match_score"] is None
    assert data["evaluated_at"] is None
    assert data["skill_evidence"] == []
    assert data["matched_skills"] == []


def test_newer_failed_evaluation_masks_stale_completed(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="failed")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    # 1. Completed run in history
    t1 = datetime.now(UTC) - timedelta(hours=2)
    run1 = (
        db_session.query(EvaluationRun)
        .filter_by(application_id=app_id)
        .one()
    )
    run1.created_at = t1
    run1.completed_at = t1
    run1.status = EvaluationStatus.COMPLETED

    # 2. Newer run failed
    t2 = datetime.now(UTC)
    run2 = EvaluationRun(
        application_id=app_id,
        status=EvaluationStatus.FAILED,
        scoring_version="v2",
        weights_used={"skills": 40, "experience": 30, "education": 15, "semantic": 15},
        created_at=t2,
        completed_at=t2,
    )
    db_session.add(run2)
    db_session.commit()

    # Query match results: must report failed status, NOT stale score
    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["evaluation_status"] == "failed"
    assert data["overall_match_score"] is None
    assert data["skill_evidence"] == []


def test_historical_completed_evaluation_preserved_via_run_id(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="historical")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    # Historical run (completed)
    t1 = datetime.now(UTC) - timedelta(days=1)
    run1 = (
        db_session.query(EvaluationRun)
        .filter_by(application_id=app_id)
        .one()
    )
    run1.created_at = t1
    run1.completed_at = t1
    run1.status = EvaluationStatus.COMPLETED
    persisted_result = db_session.query(MatchResult).filter_by(evaluation_run_id=run1.id).one()
    expected_score = persisted_result.overall_score

    # Newer run is pending
    t2 = datetime.now(UTC)
    run2 = EvaluationRun(
        application_id=app_id,
        status=EvaluationStatus.RUNNING,
        scoring_version="v2",
        weights_used={"skills": 40, "experience": 30, "education": 15, "semantic": 15},
        created_at=t2,
    )
    db_session.add(run2)
    db_session.commit()

    # Normal query returns pending
    res_latest = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res_latest.json()["evaluation_status"] == "pending"

    # Query with ?run_id={run1.id} preserves historical results
    res_hist = client.get(f"/api/v1/applications/{app_id}/match-results?run_id={run1.id}", headers=c_headers)
    assert res_hist.status_code == 200
    hist_data = res_hist.json()
    assert hist_data["evaluation_status"] == "completed"
    assert hist_data["overall_match_score"] == expected_score
    assert len(hist_data["matched_skills"]) > 0

    # Non-existent run_id returns 404
    fake_run = uuid4()
    res_missing = client.get(f"/api/v1/applications/{app_id}/match-results?run_id={fake_run}", headers=c_headers)
    assert res_missing.status_code == 404


def test_required_versus_preferred_skill_classification(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="reqpref")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    evidence = data["skill_evidence"]
    assert len(evidence) > 0

    # Skills configured in setup:
    # Python (required=True) -> matched
    # Docker (required=False) -> matched
    # PostgreSQL (required=True) -> missing / not_detected
    # Redis (required=False) -> missing / not_detected

    python_ev = next((e for e in evidence if e["requirement"] == "Python"), None)
    docker_ev = next((e for e in evidence if e["requirement"] == "Docker"), None)
    postgres_ev = next((e for e in evidence if e["requirement"] == "PostgreSQL"), None)
    redis_ev = next((e for e in evidence if e["requirement"] == "Redis"), None)

    # 1. Matched required
    assert python_ev is not None
    assert python_ev["type"] == "matched"
    assert python_ev["required"] is True
    assert python_ev["details"] == python_ev["sourceText"]

    # 2. Matched preferred
    assert docker_ev is not None
    assert docker_ev["type"] == "matched"
    assert docker_ev["required"] is False
    assert docker_ev["details"] == docker_ev["sourceText"]

    # 3. Missing required
    assert postgres_ev is not None
    assert postgres_ev["type"] == "not_detected"
    assert postgres_ev["required"] is True
    assert postgres_ev["details"] is None

    # 4. Missing preferred
    assert redis_ev is not None
    assert redis_ev["type"] == "not_detected"
    assert redis_ev["required"] is False
    assert redis_ev["details"] is None


def test_accurate_evidence_attribution_and_no_generic_skill_match(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="no-generic")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    # Rule: Never return generic "Skill Match" when a specific skill name is available
    for ev in data["skill_evidence"]:
        assert ev["requirement"] != "Skill Match"
        assert ev["requirement"] != "Not Detected"
        assert ev["requirement"] in ["Python", "PostgreSQL", "Docker", "Redis"]


def test_missing_source_metadata_represented_as_unknown(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="metadata")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    for ev in data["skill_evidence"]:
        # Rule: Never invent "skills" section when actual section cannot be verified
        assert ev["source_section"] != "skills"
        assert ev["source_section"] == "unknown"

    # Not detected skills have null snippet and unknown section
    postgres_ev = next(e for e in data["skill_evidence"] if e["requirement"] == "PostgreSQL")
    assert postgres_ev["sourceText"] is None
    assert postgres_ev["character_start"] is None
    assert postgres_ev["character_end"] is None
    assert postgres_ev["source_section"] == "unknown"


def test_direct_versus_transferable_evidence(client, db_session):
    # Setup job with JavaScript required, candidate with TypeScript (taxonomy transferable)
    recruiter_email = "transfer-rec@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": recruiter_email, "password": "Password123456!", "role": "recruiter", "organization_name": "T Corp"},
    )
    r_token = client.post("/api/v1/auth/login", json={"email": recruiter_email, "password": "Password123456!"}).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Frontend Engineer",
            "description": "JavaScript frontend development",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [{"name": "JavaScript", "required": True}],
            "status": "open",
        },
    ).json()

    cand_email = "transfer-cand@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": cand_email, "password": "Password123456!", "role": "candidate"},
    )
    c_token = client.post("/api/v1/auth/login", json={"email": cand_email, "password": "Password123456!"}).json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    resume = _docx_bytes("Experienced TypeScript engineer specializing in frontends.")
    upload = client.post(
        "/api/v1/profile/resumes",
        headers=c_headers,
        files={"file": ("resume.docx", resume, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    app = client.post(f"/api/v1/jobs/{job['id']}/applications", headers=c_headers, json={"resume_id": upload.json()["id"]}).json()

    res = client.get(f"/api/v1/applications/{app['id']}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    assert "JavaScript" in data["transferable_skills"]
    js_ev = next(e for e in data["skill_evidence"] if e["requirement"] == "JavaScript")
    assert js_ev["type"] == "transferable"
    assert js_ev["required"] is True
    assert "typescript" in js_ev["claim"].lower()


def test_java_vs_javascript_no_cross_contamination(client, db_session):
    # Recruiter creates job requiring both Java and JavaScript
    r_email = "javajs-rec@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": r_email, "password": "Password123456!", "role": "recruiter", "organization_name": "Polyglot Corp"},
    )
    r_token = client.post("/api/v1/auth/login", json={"email": r_email, "password": "Password123456!"}).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Full Stack Polyglot Engineer",
            "description": "Enterprise systems with Java backend and JavaScript frontend.",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [
                {"name": "Java", "required": True},
                {"name": "JavaScript", "required": True},
            ],
            "status": "open",
        },
    ).json()

    # Candidate has ONLY JavaScript experience in resume (no Java)
    c_email = "js-only-cand@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": c_email, "password": "Password123456!", "role": "candidate"},
    )
    c_token = client.post("/api/v1/auth/login", json={"email": c_email, "password": "Password123456!"}).json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    resume = _docx_bytes("Senior JavaScript frontend engineer with Node.js and React expertise.")
    upload = client.post(
        "/api/v1/profile/resumes",
        headers=c_headers,
        files={"file": ("resume.docx", resume, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    app = client.post(f"/api/v1/jobs/{job['id']}/applications", headers=c_headers, json={"resume_id": upload.json()["id"]}).json()

    res = client.get(f"/api/v1/applications/{app['id']}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    # JavaScript must be matched; Java must NOT be matched to JavaScript snippet
    assert "JavaScript" in data["matched_skills"]
    assert "Java" not in data["matched_skills"]
    assert "Java" in data["missing_skills"]

    js_ev = next(e for e in data["skill_evidence"] if e["requirement"] == "JavaScript")
    java_ev = next(e for e in data["skill_evidence"] if e["requirement"] == "Java")

    assert js_ev["type"] == "matched"
    assert "JavaScript" in js_ev["claim"]

    assert java_ev["type"] == "not_detected"
    assert java_ev["sourceText"] is None
    assert "JavaScript" not in java_ev["claim"]


def test_invalid_evidence_character_offsets_sanitization():
    from app.schemas.evaluations import CandidateEvidenceItem

    # Negative offset
    item1 = CandidateEvidenceItem(
        requirement="Python",
        claim="Claim",
        type="matched",
        character_start=-5,
        character_end=10,
    )
    assert item1.character_start is None
    assert item1.character_end is None

    # Inverted offset (end < start)
    item2 = CandidateEvidenceItem(
        requirement="Python",
        claim="Claim",
        type="matched",
        character_start=50,
        character_end=20,
    )
    assert item2.character_start is None
    assert item2.character_end is None

    # Missing one offset
    item3 = CandidateEvidenceItem(
        requirement="Python",
        claim="Claim",
        type="matched",
        character_start=10,
        character_end=None,
    )
    assert item3.character_start is None
    assert item3.character_end is None

    # Valid offset
    item4 = CandidateEvidenceItem(
        requirement="Python",
        claim="Claim",
        type="matched",
        character_start=10,
        character_end=25,
    )
    assert item4.character_start == 10
    assert item4.character_end == 25


def test_historical_evaluation_belonging_to_another_candidate_isolated(client, db_session):
    setup1 = _setup_candidate_and_job(client, db_session, suffix="iso1")
    setup2 = _setup_candidate_and_job(client, db_session, suffix="iso2")

    app1_id = UUID(setup1["application_id"])
    app2_id = UUID(setup2["application_id"])
    c1_headers = setup1["candidate_headers"]

    # Candidate 2's evaluation run
    run2 = db_session.query(EvaluationRun).filter_by(application_id=app2_id).first()
    assert run2 is not None

    # Candidate 1 requests Candidate 2's evaluation run ID
    res = client.get(f"/api/v1/applications/{app1_id}/match-results?run_id={run2.id}", headers=c1_headers)
    # Must reject with 404 (not found for this application)
    assert res.status_code == 404


def test_stale_candidate_ranking_and_never_tier_1(client, db_session):
    # Setup job with Python and Docker required
    r_email = "stalerank-rec@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": r_email, "password": "Password123456!", "role": "recruiter", "organization_name": "Rank Corp"},
    )
    r_token = client.post("/api/v1/auth/login", json={"email": r_email, "password": "Password123456!"}).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Backend Engineer",
            "description": "Python API services",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [
                {"name": "Python", "required": True},
            ],
            "status": "open",
        },
    ).json()

    # Candidate 1: Current, has Python
    c1_email = "cand1-current@example.com"
    client.post("/api/v1/auth/register", json={"email": c1_email, "password": "Password123456!", "role": "candidate"})
    c1_token = client.post("/api/v1/auth/login", json={"email": c1_email, "password": "Password123456!"}).json()["access_token"]
    c1_headers = {"Authorization": f"Bearer {c1_token}"}

    res1 = _docx_bytes("Senior Python Engineer with 5 years backend development.")
    up1 = client.post("/api/v1/profile/resumes", headers=c1_headers, files={"file": ("resume.docx", res1, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    app1 = client.post(f"/api/v1/jobs/{job['id']}/applications", headers=c1_headers, json={"resume_id": up1.json()["id"]}).json()

    # Candidate 2: Evaluated, but made stale by altering configuration_hash
    c2_email = "cand2-stale@example.com"
    client.post("/api/v1/auth/register", json={"email": c2_email, "password": "Password123456!", "role": "candidate"})
    c2_token = client.post("/api/v1/auth/login", json={"email": c2_email, "password": "Password123456!"}).json()["access_token"]
    c2_headers = {"Authorization": f"Bearer {c2_token}"}

    res2 = _docx_bytes("Lead Python Architect with 10 years experience.")
    up2 = client.post("/api/v1/profile/resumes", headers=c2_headers, files={"file": ("resume.docx", res2, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    app2 = client.post(f"/api/v1/jobs/{job['id']}/applications", headers=c2_headers, json={"resume_id": up2.json()["id"]}).json()

    # Invalidate candidate 2's configuration hash to simulate stale evaluation from older requirements
    run2 = db_session.query(EvaluationRun).filter_by(application_id=UUID(app2["id"])).first()
    run2.configuration_hash = "outdated_config_hash"
    db_session.commit()

    # Recruiter lists candidates
    cands_res = client.get(f"/api/v1/jobs/{job['id']}/candidates", headers=r_headers)
    assert cands_res.status_code == 200
    candidates = cands_res.json()

    cand1_card = next(c for c in candidates if c["application_id"] == app1["id"])
    cand2_card = next(c for c in candidates if c["application_id"] == app2["id"])

    assert cand1_card["evaluation_status"] == "current"
    assert cand1_card["is_fresh"] is True

    assert cand2_card["evaluation_status"] == "stale"
    assert cand2_card["is_fresh"] is False

    # Current candidate MUST rank above stale candidate in candidate list!
    ordered_ids = [c["application_id"] for c in candidates]
    assert ordered_ids.index(app1["id"]) < ordered_ids.index(app2["id"])


def test_pending_and_failed_candidates_zeroed_in_candidate_list(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="zeroed")
    app_id = UUID(setup["application_id"])
    r_headers = setup["recruiter_headers"]
    job_id = setup["job"]["id"]

    # 1. Initially completed run
    run1 = db_session.query(EvaluationRun).filter_by(application_id=app_id).first()
    run1.status = EvaluationStatus.COMPLETED

    # 2. Add newer queued run
    t2 = datetime.now(UTC)
    run2 = EvaluationRun(
        application_id=app_id,
        status=EvaluationStatus.QUEUED,
        scoring_version="v2",
        weights_used={"skills": 40, "experience": 30, "education": 15, "semantic": 15},
        created_at=t2,
    )
    db_session.add(run2)
    db_session.commit()

    res = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers)
    assert res.status_code == 200
    card = next(c for c in res.json() if c["application_id"] == str(app_id))
    assert card["evaluation_status"] == "pending"
    assert card["matchScore"] == 0.0

    # 3. Mark run as failed
    run2.status = EvaluationStatus.FAILED
    db_session.commit()

    res_failed = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers)
    card_failed = next(c for c in res_failed.json() if c["application_id"] == str(app_id))
    assert card_failed["evaluation_status"] == "failed"
    assert card_failed["matchScore"] == 0.0


def test_changed_job_requirements_marks_evaluations_stale(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="config-change")
    app_id = UUID(setup["application_id"])
    job_id = UUID(setup["job"]["id"])
    r_headers = setup["recruiter_headers"]

    # Initially evaluation is current
    res_before = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers)
    card_before = next(c for c in res_before.json() if c["application_id"] == str(app_id))
    assert card_before["evaluation_status"] == "current"
    assert card_before["is_fresh"] is True

    # Job requirements change: add a new required skill
    job_record = db_session.query(Job).filter_by(id=job_id).one()
    new_skill = JobSkill(job_id=job_id, name="Kubernetes", normalized_name="kubernetes", required=True)
    db_session.add(new_skill)
    db_session.commit()

    # Now card must be stale (config changed, previous evaluation hash does not match)
    res_after = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers)
    card_after = next(c for c in res_after.json() if c["application_id"] == str(app_id))
    assert card_after["evaluation_status"] == "stale"
    assert card_after["is_fresh"] is False


def test_unknown_and_unevaluated_cannot_receive_tier_1():
    from app.services.scoring import (
        CoverageTier,
        candidate_card_coverage_tier,
        candidate_card_rank_key,
    )
    from types import SimpleNamespace

    # Card with unknown status but all matched skills
    card_unknown = SimpleNamespace(
        id=uuid4(),
        evaluation_status="unknown",
        matchedSkills=["Python"],
        transferableSkills=[],
        evidence=[],
        matchScore=95.0,
        skillScore=95.0,
        experienceScore=95.0,
        educationScore=95.0,
        semanticScore=95.0,
    )
    job_skill = SimpleNamespace(name="Python", required=True)
    tier = candidate_card_coverage_tier(card_unknown, [job_skill])
    assert tier != CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS
    assert tier == CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE

    # Rank key must zero out effective score for unknown status
    key = candidate_card_rank_key(card_unknown, [job_skill])
    # key: (tier_val, is_current_flag, -effective_match_score, ...)
    assert key[0] == CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE.value
    assert key[1] == 1  # Not current
    assert key[2] == -0.0  # Zeroed score


def test_changing_old_score_of_stale_candidate_does_not_change_ranking(client, db_session):
    # Setup job
    r_email = "staletest-rec@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": r_email, "password": "Password123456!", "role": "recruiter", "organization_name": "ScoreProof Corp"},
    )
    r_token = client.post("/api/v1/auth/login", json={"email": r_email, "password": "Password123456!"}).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Data Engineer",
            "description": "SQL and Python data pipelines",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [{"name": "Python", "required": True}],
            "status": "open",
        },
    ).json()
    job_id = job["id"]

    # Candidate 1: Current, fresh evaluation with moderate score (~70-80)
    c1_email = "cand1-proof@example.com"
    client.post("/api/v1/auth/register", json={"email": c1_email, "password": "Password123456!", "role": "candidate"})
    c1_token = client.post("/api/v1/auth/login", json={"email": c1_email, "password": "Password123456!"}).json()["access_token"]
    c1_headers = {"Authorization": f"Bearer {c1_token}"}
    up1 = client.post("/api/v1/profile/resumes", headers=c1_headers, files={"file": ("resume.docx", _docx_bytes("Python engineer with 2 years experience."), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}).json()
    app1 = client.post(f"/api/v1/jobs/{job_id}/applications", headers=c1_headers, json={"resume_id": up1["id"]}).json()

    # Candidate 2: Evaluated, but made stale
    c2_email = "cand2-proof@example.com"
    client.post("/api/v1/auth/register", json={"email": c2_email, "password": "Password123456!", "role": "candidate"})
    c2_token = client.post("/api/v1/auth/login", json={"email": c2_email, "password": "Password123456!"}).json()["access_token"]
    c2_headers = {"Authorization": f"Bearer {c2_token}"}
    up2 = client.post("/api/v1/profile/resumes", headers=c2_headers, files={"file": ("resume.docx", _docx_bytes("Senior Python architect with 10 years experience."), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}).json()
    app2 = client.post(f"/api/v1/jobs/{job_id}/applications", headers=c2_headers, json={"resume_id": up2["id"]}).json()

    # Make Candidate 2 stale
    run2 = db_session.query(EvaluationRun).filter_by(application_id=UUID(app2["id"])).first()
    run2.configuration_hash = "stale_hash_value"
    res2 = db_session.query(MatchResult).filter_by(evaluation_run_id=run2.id).first()
    res2.overall_score = 99.0
    db_session.commit()

    # Initial ranking check: Candidate 1 (current) MUST outrank Candidate 2 (stale)
    res_list1 = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers).json()
    ids1 = [c["application_id"] for c in res_list1]
    assert ids1.index(app1["id"]) < ids1.index(app2["id"])

    # Now alter Candidate 2's old score: change to 10.0 or 100.0
    res2.overall_score = 10.0
    db_session.commit()

    res_list2 = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers).json()
    ids2 = [c["application_id"] for c in res_list2]
    # Changing stale candidate's score has ZERO influence on ranking: Candidate 1 is still ahead!
    assert ids2.index(app1["id"]) < ids2.index(app2["id"])
    assert ids1 == ids2


def test_ranking_keys_zero_effective_scores_for_all_non_current_statuses():
    from app.services.scoring import (
        CoverageTier,
        candidate_card_coverage_tier,
        candidate_card_rank_key,
    )
    from types import SimpleNamespace

    statuses = ["stale", "unknown", "pending", "queued", "running", "failed", "not_evaluated"]
    job_skills = [SimpleNamespace(name="Python", required=True)]

    for st in statuses:
        card = SimpleNamespace(
            id=uuid4(),
            evaluation_status=st,
            is_fresh=False,
            matchedSkills=["Python"],
            transferableSkills=[],
            evidence=[],
            matchScore=98.5,
            skillScore=95.0,
            experienceScore=90.0,
            educationScore=85.0,
            semanticScore=80.0,
        )
        tier = candidate_card_coverage_tier(card, job_skills)
        assert tier != CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS
        assert tier == CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE

        key = candidate_card_rank_key(card, job_skills)
        assert key[0] == CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE.value
        assert key[1] == 1  # non-current flag
        assert key[2] == -0.0  # effective match score zeroed
        assert key[3] == -0.0  # effective skill score zeroed
        assert key[4] == -0.0  # effective exp score zeroed
        assert key[5] == -0.0  # effective edu score zeroed
        assert key[6] == -0.0  # effective sem score zeroed


def test_candidate_match_results_api_enforces_freshness(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="api-fresh")
    app_id = UUID(setup["application_id"])
    job_id = UUID(setup["job"]["id"])
    c_headers = setup["candidate_headers"]

    # 1. Unchanged configuration -> returns completed with match score
    res1 = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["evaluation_status"] == "completed"
    assert isinstance(d1["overall_match_score"], (int, float))
    assert d1["overall_match_score"] > 0
    original_score = d1["overall_match_score"]

    original_run = db_session.query(EvaluationRun).filter_by(application_id=app_id).one()
    run_id = original_run.id

    # 2. Changed required skills: add new required skill to Job
    job_record = db_session.query(Job).filter_by(id=job_id).one()
    new_req_skill = JobSkill(job_id=job_id, name="Kubernetes", normalized_name="kubernetes", required=True)
    db_session.add(new_req_skill)
    db_session.commit()

    res_req_changed = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res_req_changed.status_code == 200
    d_req = res_req_changed.json()
    assert d_req["evaluation_status"] == "stale"
    assert d_req["overall_match_score"] is None
    assert d_req["skill_evidence"] == []

    # Historical run access with explicit ?run_id={run_id} preserves original results
    res_hist = client.get(f"/api/v1/applications/{app_id}/match-results?run_id={run_id}", headers=c_headers)
    assert res_hist.status_code == 200
    assert res_hist.json()["evaluation_status"] == "completed"
    assert res_hist.json()["overall_match_score"] == original_score

    # Remove the added skill
    db_session.delete(new_req_skill)
    db_session.commit()
    db_session.expire_all()

    # 3. Changed preferred skills: add new preferred skill to Job
    new_pref_skill = JobSkill(job_id=job_id, name="RedisCache", normalized_name="rediscache", required=False)
    db_session.add(new_pref_skill)
    db_session.commit()
    db_session.expire_all()

    res_pref_changed = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res_pref_changed.status_code == 200
    assert res_pref_changed.json()["evaluation_status"] == "stale"
    assert res_pref_changed.json()["overall_match_score"] is None

    db_session.delete(new_pref_skill)
    db_session.commit()
    db_session.expire_all()

    # 4. Changed scoring weights (must sum to 100)
    orig_sw = job_record.skills_weight
    orig_ew = job_record.experience_weight
    job_record.skills_weight = orig_sw + 10
    job_record.experience_weight = orig_ew - 10
    db_session.commit()
    db_session.expire_all()

    res_weights_changed = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res_weights_changed.status_code == 200
    assert res_weights_changed.json()["evaluation_status"] == "stale"
    assert res_weights_changed.json()["overall_match_score"] is None

    # Revert weights back to original
    job_record.skills_weight = orig_sw
    job_record.experience_weight = orig_ew
    db_session.commit()
    db_session.expire_all()

    res_reverted = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res_reverted.status_code == 200
    assert res_reverted.json()["evaluation_status"] == "completed"
    assert res_reverted.json()["overall_match_score"] == original_score


def test_evaluation_fingerprint_correctness():
    from app.services.evaluation import compute_evaluation_fingerprint
    from app.services.scoring import Weights
    from types import SimpleNamespace

    weights = Weights(skills=40, experience=30, education=15, semantic=15)
    cand = SimpleNamespace(
        name="Alice Engineer",
        headline="Full Stack Developer",
        total_experience_years=5.0,
        education={"degree": "Bachelor of Science", "skills": ["Python", "Docker"]},
    )
    resume = SimpleNamespace(extracted_text="Python and Docker developer with experience.")

    # Base job skills: Python required, Docker preferred
    skill_py = SimpleNamespace(name="Python", required=True, min_years=2.0)
    skill_dk = SimpleNamespace(name="Docker", required=False, min_years=None)
    job1 = SimpleNamespace(
        title="Software Engineer",
        description="Developing APIs.",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
        experience_min_years=3.0,
        education_required="Bachelor",
        skills=[skill_py, skill_dk],
    )

    fp1 = compute_evaluation_fingerprint(job=job1, candidate=cand, resume=resume, weights=weights)

    # 1. Flipping a skill from preferred to required changes the fingerprint
    skill_dk_req = SimpleNamespace(name="Docker", required=True, min_years=None)
    job_flipped = SimpleNamespace(
        title="Software Engineer",
        description="Developing APIs.",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
        experience_min_years=3.0,
        education_required="Bachelor",
        skills=[skill_py, skill_dk_req],
    )
    fp_flipped = compute_evaluation_fingerprint(job=job_flipped, candidate=cand, resume=resume, weights=weights)
    assert fp1 != fp_flipped

    # 2. Reordering skills does NOT change the fingerprint
    job_reordered = SimpleNamespace(
        title="Software Engineer",
        description="Developing APIs.",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
        experience_min_years=3.0,
        education_required="Bachelor",
        skills=[skill_dk, skill_py],  # Reordered
    )
    fp_reordered = compute_evaluation_fingerprint(job=job_reordered, candidate=cand, resume=resume, weights=weights)
    assert fp1 == fp_reordered

    # 3. Duplicate skill names are handled deterministically without silent collapse
    skill_py_dup1 = SimpleNamespace(name="Python", required=True, min_years=2.0)
    skill_py_dup2 = SimpleNamespace(name="Python", required=False, min_years=1.0)
    job_dup1 = SimpleNamespace(
        title="Software Engineer",
        description="Developing APIs.",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
        experience_min_years=3.0,
        education_required="Bachelor",
        skills=[skill_py_dup1, skill_py_dup2],
    )
    job_dup2 = SimpleNamespace(
        title="Software Engineer",
        description="Developing APIs.",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
        experience_min_years=3.0,
        education_required="Bachelor",
        skills=[skill_py_dup2, skill_py_dup1],  # Reverse input order
    )
    fp_dup1 = compute_evaluation_fingerprint(job=job_dup1, candidate=cand, resume=resume, weights=weights)
    fp_dup2 = compute_evaluation_fingerprint(job=job_dup2, candidate=cand, resume=resume, weights=weights)
    assert fp_dup1 == fp_dup2

    # 4. Relevant scoring configuration changes invalidate old evaluations
    diff_weights = Weights(skills=50, experience=20, education=15, semantic=15)
    fp_diff_weights = compute_evaluation_fingerprint(job=job1, candidate=cand, resume=resume, weights=diff_weights)
    assert fp1 != fp_diff_weights

    # 5. Identical normalized configuration produces identical fingerprints (e.g. whitespace and case)
    skill_py_casing = SimpleNamespace(name="  pYtHon  ", required=True, min_years=2.0)
    skill_dk_casing = SimpleNamespace(name="DOCKER", required=False, min_years=None)
    job_norm = SimpleNamespace(
        title="Software Engineer  ",
        description="Developing APIs.\n",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
        experience_min_years=3.0,
        education_required="  bachelor  ",
        skills=[skill_py_casing, skill_dk_casing],
    )
    fp_norm = compute_evaluation_fingerprint(job=job_norm, candidate=cand, resume=resume, weights=weights)
    assert fp1 == fp_norm


def test_persisted_uuid_equality_between_evaluated_skill_and_claim(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="uuid-eq")
    app_id = UUID(setup["application_id"])

    run = db_session.query(EvaluationRun).filter_by(application_id=app_id).one()
    mr = run.match_result
    assert mr is not None

    evaluated_skills = mr.evaluated_skills
    evidence_claims = {str(c.id): c for c in mr.evidence_claims}

    assert len(evaluated_skills) > 0
    for es in evaluated_skills:
        assert es.evidence_ref is not None
        # UUID must match an actual persisted EvidenceClaim id
        claim = evidence_claims.get(es.evidence_ref)
        assert claim is not None
        assert str(claim.id) == es.evidence_ref


def test_legacy_evidence_without_evidence_ref(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="legacy-ref")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    # Manually clear evidence_ref on all evaluated skills to simulate legacy database records
    run = db_session.query(EvaluationRun).filter_by(application_id=app_id).one()
    for es in run.match_result.evaluated_skills:
        es.evidence_ref = None
    db_session.commit()

    # Query match-results
    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    evidence = data["skill_evidence"]
    assert len(evidence) > 0

    # Verify that requirement names and required/preferred are still correctly mapped via canonical extraction
    py_ev = next(e for e in evidence if e["requirement"] == "Python")
    assert py_ev["required"] is True
    assert py_ev["type"] == "matched"
    assert py_ev["details"] == py_ev["sourceText"]

    docker_ev = next(e for e in evidence if e["requirement"] == "Docker")
    assert docker_ev["required"] is False
    assert docker_ev["type"] == "matched"


def test_multiple_claims_associated_with_one_skill(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="multi-claims")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]

    run = db_session.query(EvaluationRun).filter_by(application_id=app_id).one()
    mr = run.match_result

    # Add a second claim for Python
    extra_claim = EvidenceClaim(
        id=uuid4(),
        match_result_id=mr.id,
        claim_type="skill_match",
        claim_text="Directly matched skill from resume: Python",
        source_snippet="Implemented Python microservices at scale.",
        source_section="experience",
        character_start=50,
        character_end=95,
        confidence=EvidenceConfidence.HIGH,
        evidence_kind=EvidenceKind.DIRECT,
    )
    db_session.add(extra_claim)
    db_session.commit()

    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    data = res.json()

    py_evs = [e for e in data["skill_evidence"] if e["requirement"] == "Python"]
    assert len(py_evs) >= 2
    for ev in py_evs:
        assert ev["required"] is True
        assert ev["type"] == "matched"
        assert ev["details"] == ev["sourceText"]


def test_preferred_skill_gap_evidence_does_not_reduce_required_coverage_tier():
    from app.services.scoring import (
        CoverageTier,
        candidate_card_coverage_tier,
        candidate_card_rank_key,
    )
    from types import SimpleNamespace

    # Job: Python (Required=True), Redis (Preferred=False), Kubernetes (Preferred=False)
    job_skills = [
        SimpleNamespace(name="Python", required=True),
        SimpleNamespace(name="Redis", required=False),
        SimpleNamespace(name="Kubernetes", required=False),
    ]

    # Candidate 1: Matched Python (required). Has generic gap evidence for preferred Redis.
    card_preferred_gap = SimpleNamespace(
        id=uuid4(),
        evaluation_status="current",
        is_fresh=True,
        matchedSkills=["Python"],
        transferableSkills=[],
        missingSkills=["Redis"],
        evidence=[
            SimpleNamespace(requirement="Python", type="matched", required=True, claim="Strong Python experience"),
            SimpleNamespace(requirement="Redis", type="gap", required=False, claim="No Redis evidence found"),
        ],
        matchScore=85.0,
        skillScore=85.0,
        experienceScore=85.0,
        educationScore=85.0,
        semanticScore=85.0,
    )

    tier_pref = candidate_card_coverage_tier(card_preferred_gap, job_skills)
    # MUST be Tier 1 (NO_COMPUTABLE_REQUIRED_GAPS) because Python is covered and Redis is only preferred
    assert tier_pref == CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS

    # Candidate 2: Matched Python, but has an explicit experience tenure gap
    card_exp_gap = SimpleNamespace(
        id=uuid4(),
        evaluation_status="current",
        is_fresh=True,
        matchedSkills=["Python"],
        transferableSkills=[],
        missingSkills=[],
        evidence=[
            SimpleNamespace(requirement="Python", type="matched", required=True, claim="Strong Python experience"),
            SimpleNamespace(requirement="Minimum Experience Threshold", type="gap", required=True, claim="Tenure deficit: 2 yrs vs 5 yrs required"),
        ],
        matchScore=75.0,
        skillScore=90.0,
        experienceScore=40.0,
        educationScore=85.0,
        semanticScore=80.0,
    )
    tier_exp = candidate_card_coverage_tier(card_exp_gap, job_skills)
    # MUST be Tier 3 (REQUIRED_GAP) because experience is a hard requirement
    assert tier_exp == CoverageTier.REQUIRED_GAP

    # Candidate 3: Has a hard gap in required Python
    card_req_gap = SimpleNamespace(
        id=uuid4(),
        evaluation_status="current",
        is_fresh=True,
        matchedSkills=[],
        transferableSkills=[],
        missingSkills=["Python"],
        evidence=[
            SimpleNamespace(requirement="Python", type="gap", required=True, claim="Candidate lacks required Python"),
        ],
        matchScore=60.0,
        skillScore=40.0,
        experienceScore=80.0,
        educationScore=80.0,
        semanticScore=60.0,
    )
    tier_req = candidate_card_coverage_tier(card_req_gap, job_skills)
    assert tier_req == CoverageTier.REQUIRED_GAP

    # In ranking, Candidate 1 (Tier 1) MUST rank ahead of Candidate 2 (Tier 3) and Candidate 3 (Tier 3)
    key1 = candidate_card_rank_key(card_preferred_gap, job_skills)
    key2 = candidate_card_rank_key(card_exp_gap, job_skills)
    key3 = candidate_card_rank_key(card_req_gap, job_skills)
    assert key1 < key2
    assert key1 < key3


def test_evidence_offset_upper_bound_sanitization_against_resume_text(client, db_session):
    setup = _setup_candidate_and_job(client, db_session, suffix="offset-bound")
    app_id = UUID(setup["application_id"])
    c_headers = setup["candidate_headers"]
    r_headers = setup["recruiter_headers"]
    job_id = setup["job"]["id"]

    run = db_session.query(EvaluationRun).filter_by(application_id=app_id).one()
    mr = run.match_result
    app = db_session.query(Application).filter_by(id=app_id).one()
    resume_len = len(app.resume.extracted_text)
    assert resume_len > 0

    # 1. Evidence claim with character_end beyond extracted text length
    claim_out_of_bounds = EvidenceClaim(
        id=uuid4(),
        match_result_id=mr.id,
        claim_type="skill_match",
        claim_text="Directly matched skill from resume: Python",
        source_snippet="Python developer",
        source_section="experience",
        character_start=0,
        character_end=resume_len + 500,  # Far beyond resume text length!
        confidence=EvidenceConfidence.HIGH,
        evidence_kind=EvidenceKind.DIRECT,
    )
    # 2. Evidence claim with valid within-bounds offsets
    claim_valid = EvidenceClaim(
        id=uuid4(),
        match_result_id=mr.id,
        claim_type="skill_match",
        claim_text="Directly matched skill from resume: Python",
        source_snippet="Python developer",
        source_section="experience",
        character_start=2,
        character_end=15,  # Valid within resume text
        confidence=EvidenceConfidence.HIGH,
        evidence_kind=EvidenceKind.DIRECT,
    )
    db_session.add(claim_out_of_bounds)
    db_session.add(claim_valid)
    db_session.commit()

    # Query candidate match-results
    res = client.get(f"/api/v1/applications/{app_id}/match-results", headers=c_headers)
    assert res.status_code == 200
    evidence = res.json()["skill_evidence"]

    # Verify claim_out_of_bounds was sanitized to None for both offsets
    oob_ev = next((e for e in evidence if e["character_start"] is None and e["character_end"] is None and e.get("sourceText") == "Python developer"), None)
    assert oob_ev is not None

    # Verify claim_valid preserved valid offsets
    valid_ev = next((e for e in evidence if e["character_start"] == 2 and e["character_end"] == 15), None)
    assert valid_ev is not None

    # Also verify recruiter candidate-card path
    rec_res = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers)
    assert rec_res.status_code == 200
    card = next(c for c in rec_res.json() if c["application_id"] == str(app_id))
    rec_evidence = card["evidence"]

    rec_oob = next((e for e in rec_evidence if e["character_start"] is None and e["character_end"] is None and e.get("sourceText") == "Python developer"), None)
    assert rec_oob is not None
    rec_valid = next((e for e in rec_evidence if e["character_start"] == 2 and e["character_end"] == 15), None)
    assert rec_valid is not None


def test_historical_run_application_isolation_same_candidate_two_applications(client, db_session):
    # Setup candidate
    candidate_email = "two-apps-cand@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": candidate_email, "password": "Password123456!", "role": "candidate"},
    )
    c_token = client.post("/api/v1/auth/login", json={"email": candidate_email, "password": "Password123456!"}).json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # Recruiter
    recruiter_email = "two-apps-rec@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": recruiter_email, "password": "Password123456!", "role": "recruiter", "organization_name": "MultiApp Corp"},
    )
    r_token = client.post("/api/v1/auth/login", json={"email": recruiter_email, "password": "Password123456!"}).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    # Job 1
    job1 = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Backend Python Engineer",
            "description": "Python API services",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [{"name": "Python", "required": True}],
            "status": "open",
        },
    ).json()

    # Job 2
    job2 = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Frontend React Engineer",
            "description": "React web applications",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "skills": [{"name": "React", "required": True}],
            "status": "open",
        },
    ).json()

    # Candidate uploads resume
    resume_bytes = _docx_bytes("Senior Software Engineer with Python and React expertise.")
    upload = client.post(
        "/api/v1/profile/resumes",
        headers=c_headers,
        files={"file": ("resume.docx", resume_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    resume_id = upload.json()["id"]

    # Candidate applies to Job 1 (Application 1)
    app1 = client.post(f"/api/v1/jobs/{job1['id']}/applications", headers=c_headers, json={"resume_id": resume_id}).json()
    app1_id = app1["id"]

    # Candidate applies to Job 2 (Application 2)
    app2 = client.post(f"/api/v1/jobs/{job2['id']}/applications", headers=c_headers, json={"resume_id": resume_id}).json()
    app2_id = app2["id"]

    # Get evaluation runs for both applications
    run1 = db_session.query(EvaluationRun).filter_by(application_id=UUID(app1_id)).first()
    run2 = db_session.query(EvaluationRun).filter_by(application_id=UUID(app2_id)).first()
    assert run1 is not None
    assert run2 is not None
    assert run1.id != run2.id

    # 1. Candidate requests Application 1 match-results using Application 2's run ID
    # Expected result: HTTP 404 (Evaluation run not found for this application)
    res_cross = client.get(f"/api/v1/applications/{app1_id}/match-results?run_id={run2.id}", headers=c_headers)
    assert res_cross.status_code == 404
    error_msg = res_cross.json().get("detail") or res_cross.json().get("error", {}).get("message")
    assert error_msg == "Evaluation run not found."

    # 2. Candidate requests Application 2 match-results using Application 1's run ID
    # Expected result: HTTP 404
    res_cross2 = client.get(f"/api/v1/applications/{app2_id}/match-results?run_id={run1.id}", headers=c_headers)
    assert res_cross2.status_code == 404
    error_msg2 = res_cross2.json().get("detail") or res_cross2.json().get("error", {}).get("message")
    assert error_msg2 == "Evaluation run not found."

    # 3. Legitimate historical access within the correct applications is preserved
    res_valid1 = client.get(f"/api/v1/applications/{app1_id}/match-results?run_id={run1.id}", headers=c_headers)
    assert res_valid1.status_code == 200
    assert res_valid1.json()["application_id"] == app1_id

    res_valid2 = client.get(f"/api/v1/applications/{app2_id}/match-results?run_id={run2.id}", headers=c_headers)
    assert res_valid2.status_code == 200
    assert res_valid2.json()["application_id"] == app2_id


