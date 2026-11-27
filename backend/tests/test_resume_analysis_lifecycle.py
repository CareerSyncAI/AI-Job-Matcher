from __future__ import annotations

import sys
from types import SimpleNamespace
from uuid import uuid4

from app.core.config import Settings
from app.models.entities import (
    Application,
    CandidateProfile,
    Job,
    RecruiterProfile,
    Resume,
    ResumeAnalysisRun,
    User,
)
from app.models.enums import (
    ApplicationStatus,
    ProcessingStatus,
    ResumeAnalysisStatus,
    UserRole,
)
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from app.services import resume_analysis as resume_analysis_module


def _auth_headers(user: User) -> dict[str, str]:
    token, _ = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def _seed_candidate_with_resume(db_session, *, extracted_text: str | None = None, storage_key: str = "missing.pdf"):
    user = User(
        email=f"cand_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("StrongPass123!"),
        role=UserRole.CANDIDATE,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    candidate = CandidateProfile(
        user_id=user.id,
        email=user.email,
        name="Jane Doe",
        headline="Backend Engineer",
    )
    db_session.add(candidate)
    db_session.flush()

    resume = Resume(
        candidate_id=candidate.id,
        original_filename="jane_doe.pdf",
        storage_key=storage_key,
        mime_type="application/pdf",
        byte_size=1024,
        sha256=uuid4().hex + uuid4().hex,
        processing_status=ProcessingStatus.COMPLETED if extracted_text else ProcessingStatus.QUEUED,
        extracted_text=extracted_text,
    )
    db_session.add(resume)
    db_session.commit()
    return user, candidate, resume


def test_analysis_lifecycle_ready_start_poll_and_refresh(client, db_session):
    sample_text = """
    Jane Doe
    jane.doe@example.com | +1 (555) 123-4567 | San Francisco, CA
    https://www.linkedin.com/in/janedoe

    Professional Summary
    Backend engineer with 5+ years of Python and PostgreSQL experience.

    Experience
    - Built FastAPI microservices serving 100k requests per day.
    - Reduced latency by 40% and saved $25,000 annually.
    - Led 3 engineers, deployed Docker containers, automated CI pipelines.

    Skills
    Python, FastAPI, PostgreSQL, Docker, Redis

    Education
    B.S. Computer Science
    """
    user, _, resume = _seed_candidate_with_resume(db_session, extracted_text=sample_text)
    headers = _auth_headers(user)

    # 1. Before starting: status is ready
    ready_resp = client.get(f"/api/v1/resumes/{resume.id}/analysis", headers=headers)
    assert ready_resp.status_code == 200
    ready_data = ready_resp.json()
    assert ready_data["status"] == "ready"
    assert ready_data["run_id"] is None
    assert ready_data["current_stage"] == "ready"
    assert ready_data["result_available"] is False
    assert ready_data["result"] is None

    # 2. Start analysis explicitly
    start_resp = client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=headers)
    assert start_resp.status_code == 202
    start_data = start_resp.json()
    run_id = start_data["run_id"]
    assert run_id is not None
    assert start_data["attempt_number"] == 1

    # 3. Poll specific run and latest endpoint (refresh recovery)
    poll_resp = client.get(f"/api/v1/resumes/{resume.id}/analysis/{run_id}", headers=headers)
    assert poll_resp.status_code == 200
    poll_data = poll_resp.json()
    assert poll_data["status"] == "completed"
    assert poll_data["current_stage"] == "completed"
    assert poll_data["result_available"] is True
    assert poll_data["result"]["overall_ats_score"] > 0
    assert poll_data["result"]["detected_sections"]["experience"] is True

    refresh_resp = client.get(f"/api/v1/resumes/{resume.id}/analysis", headers=headers)
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["run_id"] == run_id
    assert refresh_resp.json()["status"] == "completed"

    # 4. Existing ATS endpoint remains compatible
    legacy_ats = client.get(f"/api/v1/resumes/{resume.id}/ats", headers=headers)
    assert legacy_ats.status_code == 200
    assert legacy_ats.json()["overall_ats_score"] == poll_data["result"]["overall_ats_score"]


def test_analysis_ownership_and_duplicate_prevention(client, db_session):
    owner, _, resume = _seed_candidate_with_resume(db_session, extracted_text="Python Developer")
    other_user = User(
        email=f"other_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("StrongPass123!"),
        role=UserRole.CANDIDATE,
        is_active=True,
    )
    db_session.add(other_user)
    db_session.flush()
    db_session.add(CandidateProfile(user_id=other_user.id, email=other_user.email, name="Other"))
    db_session.commit()

    # Unauthenticated
    assert client.get(f"/api/v1/resumes/{resume.id}/analysis").status_code == 401
    # Non-owner forbidden
    assert client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=_auth_headers(other_user)).status_code == 403
    # Unknown resume
    assert client.get(f"/api/v1/resumes/{uuid4()}/analysis", headers=_auth_headers(owner)).status_code == 404

    # Active queued/running run blocks duplicate start with 409
    active_run = ResumeAnalysisRun(
        resume_id=resume.id,
        initiated_by_user_id=owner.id,
        status=ResumeAnalysisStatus.RUNNING,
        current_stage="analyzing_ats",
        attempt_number=1,
    )
    db_session.add(active_run)
    db_session.commit()

    dup_resp = client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=_auth_headers(owner))
    assert dup_resp.status_code == 409


def test_analysis_failure_retry_and_recruiter_workflow_isolation(client, db_session, tmp_path, monkeypatch):
    monkeypatch.setattr(
        resume_analysis_module,
        "get_settings",
        lambda: Settings(jwt_secret="a" * 32, upload_directory=tmp_path, enable_worker=False),
    )

    owner, candidate, resume = _seed_candidate_with_resume(
        db_session,
        extracted_text=None,
        storage_key="nonexistent_file.pdf",
    )

    # Create a recruiter, job, and application in NEW status to ensure analysis never mutates it
    recruiter_user = User(
        email=f"rec_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("StrongPass123!"),
        role=UserRole.RECRUITER,
        is_active=True,
    )
    db_session.add(recruiter_user)
    db_session.flush()
    recruiter = RecruiterProfile(user_id=recruiter_user.id, organization_name="Acme")
    db_session.add(recruiter)
    db_session.flush()
    job = Job(
        recruiter_id=recruiter.id,
        title="Backend Engineer",
        employment_type="full_time",
        work_arrangement="remote",
        description="Build APIs",
    )
    db_session.add(job)
    db_session.flush()
    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=resume.id,
        status=ApplicationStatus.NEW,
    )
    db_session.add(application)
    db_session.commit()

    headers = _auth_headers(owner)

    # Start fails because file is missing
    start_resp = client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=headers)
    assert start_resp.status_code == 202
    failed_run_id = start_resp.json()["run_id"]

    status_resp = client.get(f"/api/v1/resumes/{resume.id}/analysis/{failed_run_id}", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "failed"
    assert status_data["current_stage"] == "failed"
    assert status_data["failure_code"] == "file_missing"
    assert status_data["failure_detail"] is not None
    assert status_data["result_available"] is False

    # Provide extracted text and retry
    resume.extracted_text = "Experience\n- Built Python APIs.\nSkills\nPython\nEducation\nB.S. CS"
    db_session.commit()

    retry_resp = client.post(
        f"/api/v1/resumes/{resume.id}/analysis/{failed_run_id}/retry",
        headers=headers,
    )
    assert retry_resp.status_code == 202
    retry_data = retry_resp.json()
    assert retry_data["run_id"] != failed_run_id
    assert retry_data["retry_of_run_id"] == failed_run_id
    assert retry_data["attempt_number"] == 2

    final_resp = client.get(f"/api/v1/resumes/{resume.id}/analysis/{retry_data['run_id']}", headers=headers)
    assert final_resp.status_code == 200
    assert final_resp.json()["status"] == "completed"
    assert final_resp.json()["result_available"] is True

    # Completed run cannot be retried
    bad_retry = client.post(
        f"/api/v1/resumes/{resume.id}/analysis/{retry_data['run_id']}/retry",
        headers=headers,
    )
    assert bad_retry.status_code == 409

    # Recruiter workflow status must remain NEW
    db_session.refresh(application)
    assert application.status == ApplicationStatus.NEW


def test_analysis_worker_enqueue_failure_marks_failed(client, db_session, monkeypatch):
    owner, _, resume = _seed_candidate_with_resume(db_session, extracted_text="Python Skills")

    def fail_delay(_run_id):
        raise RuntimeError("redis unreachable")

    monkeypatch.setattr(
        resume_analysis_module,
        "get_settings",
        lambda: SimpleNamespace(enable_worker=True),
    )
    monkeypatch.setitem(
        sys.modules,
        "app.workers.tasks",
        SimpleNamespace(analyze_resume_task=SimpleNamespace(delay=fail_delay)),
    )

    resp = client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=_auth_headers(owner))
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "failed"
    assert data["current_stage"] == "failed"
    assert data["failed_stage"] == "queued"
    assert data["failure_code"] == "worker_enqueue_failed"
    assert "redis unreachable" not in (data["failure_detail"] or "")


def test_storage_path_escape_and_symlink_rejection(client, db_session, tmp_path, monkeypatch):
    monkeypatch.setattr(
        resume_analysis_module,
        "get_settings",
        lambda: Settings(jwt_secret="a" * 32, upload_directory=tmp_path, enable_worker=False),
    )

    owner, _, resume = _seed_candidate_with_resume(
        db_session,
        extracted_text=None,
        storage_key="../../etc/passwd",
    )
    resp = client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=_auth_headers(owner))
    assert resp.status_code == 202
    run_id = resp.json()["run_id"]
    poll = client.get(f"/api/v1/resumes/{resume.id}/analysis/{run_id}", headers=_auth_headers(owner))
    assert poll.status_code == 200
    data = poll.json()
    assert data["status"] == "failed"
    assert data["failed_stage"] == "extracting_text"
    assert data["failure_code"] == "storage_path_invalid"
    assert "etc/passwd" not in (data["failure_detail"] or "")

    # Symlink escape check (best-effort on platforms that permit symlinks)
    outside = tmp_path.parent / f"outside_{uuid4().hex}.pdf"
    outside.write_bytes(b"%PDF-1.4\nhello")
    symlink_path = tmp_path / f"link_{uuid4().hex}.pdf"
    try:
        symlink_path.symlink_to(outside)
    except OSError:
        outside.unlink(missing_ok=True)
        return

    try:
        sym_owner, _, sym_resume = _seed_candidate_with_resume(
            db_session,
            extracted_text=None,
            storage_key=symlink_path.name,
        )
        sym_resp = client.post(f"/api/v1/resumes/{sym_resume.id}/analysis", headers=_auth_headers(sym_owner))
        assert sym_resp.status_code == 202
        sym_poll = client.get(
            f"/api/v1/resumes/{sym_resume.id}/analysis/{sym_resp.json()['run_id']}",
            headers=_auth_headers(sym_owner),
        )
        assert sym_poll.status_code == 200
        assert sym_poll.json()["failure_code"] == "storage_path_invalid"
    finally:
        symlink_path.unlink(missing_ok=True)
        outside.unlink(missing_ok=True)


def test_atomic_worker_claim_and_terminal_immutability(db_session):
    _, _, resume = _seed_candidate_with_resume(db_session, extracted_text="Experience\nPython\nSkills\nPython\nEducation\nBS")
    run = ResumeAnalysisRun(
        resume_id=resume.id,
        status=ResumeAnalysisStatus.QUEUED,
        current_stage="queued",
        attempt_number=1,
    )
    db_session.add(run)
    db_session.commit()

    # First execution claims and completes
    resume_analysis_module.execute_analysis_run(run.id, db=db_session)
    db_session.refresh(run)
    assert run.status == ResumeAnalysisStatus.COMPLETED
    completed_at = run.completed_at

    # Duplicate delivery cannot re-execute or alter completed run
    resume_analysis_module.execute_analysis_run(run.id, db=db_session)
    db_session.refresh(run)
    assert run.status == ResumeAnalysisStatus.COMPLETED
    assert run.completed_at == completed_at

    # Terminal state cannot be overwritten by late failure marker
    assert resume_analysis_module.mark_run_failed_atomic(db_session, run.id, failure_code="worker_timeout") is False
    db_session.refresh(run)
    assert run.status == ResumeAnalysisStatus.COMPLETED


def test_concurrent_start_and_retry_enforced_by_db_constraint(client, db_session):
    from datetime import UTC, datetime, timedelta

    import pytest
    from fastapi import HTTPException

    owner, cand, resume = _seed_candidate_with_resume(
        db_session,
        extracted_text="Python Skills",
        storage_key=f"{uuid4().hex}.pdf",
    )
    other_resume = Resume(
        candidate_id=cand.id,
        original_filename="other.pdf",
        storage_key=f"{uuid4().hex}.pdf",
        mime_type="application/pdf",
        byte_size=1024,
        sha256=uuid4().hex + uuid4().hex,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python Skills",
    )
    db_session.add(other_resume)
    db_session.commit()

    # Insert an active run directly and verify DB partial unique index rejects second active run
    run1 = ResumeAnalysisRun(
        resume_id=resume.id,
        initiated_by_user_id=owner.id,
        status=ResumeAnalysisStatus.QUEUED,
        current_stage="queued",
        attempt_number=1,
        lease_expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    db_session.add(run1)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        resume_analysis_module.ResumeAnalysisService.start_run(
            db_session,
            resume=resume,
            initiated_by_user_id=owner.id,
        )
    assert exc_info.value.status_code == 409

    # Mismatched run_id across resumes returns 404
    mismatch = client.get(f"/api/v1/resumes/{other_resume.id}/analysis/{run1.id}", headers=_auth_headers(owner))
    assert mismatch.status_code == 404

    # Expired lease allows bounded recovery and new start
    run1.lease_expires_at = datetime.now(UTC) - timedelta(seconds=10)
    db_session.commit()

    recovered_next = resume_analysis_module.ResumeAnalysisService.start_run(
        db_session,
        resume=resume,
        initiated_by_user_id=owner.id,
    )
    db_session.refresh(run1)
    assert run1.status == ResumeAnalysisStatus.FAILED
    assert run1.failure_code == "worker_lease_expired"
    assert run1.failed_stage == "queued"
    assert recovered_next.status == ResumeAnalysisStatus.QUEUED

    # Retry chain integrity: mark recovered_next failed, retry once, second retry of same run fails with 409
    resume_analysis_module.mark_run_failed_atomic(db_session, recovered_next.id, failure_code="parse_failed")
    retry_1 = resume_analysis_module.ResumeAnalysisService.retry_run(
        db_session,
        resume=resume,
        run_id=recovered_next.id,
        initiated_by_user_id=owner.id,
    )
    assert retry_1.retry_of_run_id == recovered_next.id
    assert retry_1.attempt_number == 2

    resume_analysis_module.mark_run_failed_atomic(db_session, retry_1.id, failure_code="parse_failed")
    with pytest.raises(HTTPException) as dup_retry_exc:
        resume_analysis_module.ResumeAnalysisService.retry_run(
            db_session,
            resume=resume,
            run_id=recovered_next.id,
            initiated_by_user_id=owner.id,
        )
    assert dup_retry_exc.value.status_code == 409


def test_ingestion_in_progress_blocks_explicit_analysis_start(client, db_session):
    owner, _, resume = _seed_candidate_with_resume(db_session, extracted_text=None)
    resume.processing_status = ProcessingStatus.PROCESSING
    db_session.commit()

    resp = client.post(f"/api/v1/resumes/{resume.id}/analysis", headers=_auth_headers(owner))
    assert resp.status_code == 409
