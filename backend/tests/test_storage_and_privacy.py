from __future__ import annotations

import io
import time
import zipfile
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from app.core.config import get_settings
from app.core.logging import mask_email
from app.models.entities import CandidateProfile, Job, Resume, User
from app.models.enums import AttentionReason, ProcessingStatus, UserRole
from app.services.resumes import ResumeService
from app.services.storage import delete_file


def _create_minimal_docx(text: str = "Test Content") -> bytes:
    """Create minimal valid DOCX binary in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            "</Types>",
        )
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            "</Relationships>",
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f"<w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>",
        )
    return buf.getvalue()


# ── Storage Lifecycle Tests ──────────────────────────────────────────────────


def test_successful_upload_retains_stored_file(client, db_session):
    """1. A successful upload retains the stored file in the storage directory."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.retain@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "RetainOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.retain@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "Retain Test Job", "description": "Test", "status": "open"},
    )
    job_id = job_res.json()["id"]

    valid_docx = _create_minimal_docx("Retained Resume Content")
    upload_res = client.post(
        f"/api/v1/jobs/{job_id}/resumes",
        headers=rec_h,
        files={"file": ("retain.docx", valid_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    resume = db_session.query(Resume).filter(Resume.id == UUID(resume_id)).one()
    settings = get_settings()
    root = settings.upload_directory.expanduser().resolve()
    stored_path = root / resume.storage_key

    # The file must exist on disk
    assert stored_path.exists()
    assert stored_path.read_bytes() == valid_docx


def test_failed_database_operation_removes_newly_created_file(client, db_session, monkeypatch):
    """2. A failed database operation removes the newly created file before a durable reference is committed."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.fail@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "FailOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.fail@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "Fail Test Job", "description": "Test", "status": "open"},
    )
    job_id = job_res.json()["id"]

    valid_docx = _create_minimal_docx("Failed Resume Content")

    settings = get_settings()
    root = settings.upload_directory.expanduser().resolve()
    before_files = set(root.glob("*"))

    # Force db.commit to raise an exception during upload_resume
    orig_commit = db_session.commit

    def faulty_commit():
        raise RuntimeError("Simulated database failure during upload commit")

    monkeypatch.setattr(db_session, "commit", faulty_commit)

    with pytest.raises(RuntimeError, match="Simulated database failure"):
        client.post(
            f"/api/v1/jobs/{job_id}/resumes",
            headers=rec_h,
            files={"file": ("fail.docx", valid_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )

    # Verify no orphaned files were added to storage directory
    after_files = set(root.glob("*"))
    assert after_files == before_files


def test_failed_replacement_does_not_delete_previously_committed_file(client, db_session, monkeypatch):
    """3. A failed replacement does not delete the previously committed file."""
    # Register candidate
    client.post(
        "/api/v1/auth/register",
        json={"email": "cand.replace@example.com", "password": "Password123456!", "role": "candidate"},
    )
    cand_tok = client.post("/api/v1/auth/login", json={"email": "cand.replace@example.com", "password": "Password123456!"}).json()["access_token"]
    cand_h = {"Authorization": f"Bearer {cand_tok}"}

    # 1. Upload original resume (succeeds)
    orig_docx = _create_minimal_docx("Original Committed Resume")
    res1 = client.post(
        "/api/v1/profile/resumes",
        headers=cand_h,
        files={"file": ("orig.docx", orig_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert res1.status_code == 202
    resume1_id = res1.json()["id"]

    resume1 = db_session.query(Resume).filter(Resume.id == UUID(resume1_id)).one()
    settings = get_settings()
    root = settings.upload_directory.expanduser().resolve()
    orig_path = root / resume1.storage_key
    assert orig_path.exists()

    # 2. Attempt replacement upload, but simulate commit failure on replacement
    def faulty_commit():
        raise RuntimeError("Simulated replacement failure")

    monkeypatch.setattr(db_session, "commit", faulty_commit)

    replace_docx = _create_minimal_docx("Replacement Resume That Fails")
    with pytest.raises(RuntimeError, match="Simulated replacement failure"):
        client.post(
            "/api/v1/profile/resumes",
            headers=cand_h,
            files={"file": ("replace.docx", replace_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )

    # 3. Assert original committed file is STILL on disk and intact
    assert orig_path.exists()
    assert orig_path.read_bytes() == orig_docx


def test_failed_cleanup_does_not_conceal_original_processing_exception(client, db_session, monkeypatch):
    """4. A failed cleanup does not conceal the original processing exception."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.mask@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "MaskOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.mask@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "Mask Test Job", "description": "Test", "status": "open"},
    )
    job_id = job_res.json()["id"]

    valid_docx = _create_minimal_docx("Content")

    # Simulate commit failure
    def faulty_commit():
        raise ValueError("Original root cause error")

    # Simulate unlink error in delete_file
    def faulty_unlink(self):
        raise OSError("Permission denied on unlink")

    monkeypatch.setattr(db_session, "commit", faulty_commit)
    monkeypatch.setattr(Path, "unlink", faulty_unlink)

    # The exception seen by caller MUST be ValueError("Original root cause error"), not OSError
    with pytest.raises(ValueError, match="Original root cause error"):
        client.post(
            f"/api/v1/jobs/{job_id}/resumes",
            headers=rec_h,
            files={"file": ("test.docx", valid_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )


def test_cleanup_cannot_delete_file_outside_configured_storage_directory(tmp_path):
    """5. A cleanup operation cannot delete a file outside the configured storage directory."""
    # Create an outside file in a separate directory
    outside_file = tmp_path / "important_system_file.txt"
    outside_file.write_text("critical data")

    # Attempt path traversal deletion
    assert delete_file("../../important_system_file.txt") is False
    assert delete_file(f"../{outside_file.name}") is False
    assert delete_file(str(outside_file)) is False
    assert delete_file("/etc/passwd") is False
    assert delete_file("C:\\boot.ini") is False

    # The outside file must remain intact
    assert outside_file.exists()
    assert outside_file.read_text() == "critical data"


def test_repeated_cleanup_is_safe_and_idempotent():
    """6. Repeated cleanup is safe, idempotent, and does not raise errors."""
    settings = get_settings()
    root = settings.upload_directory.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)

    dummy_key = f"dummy_{uuid4()}.docx"
    dummy_file = root / dummy_key
    dummy_file.write_bytes(b"dummy")

    assert dummy_file.exists()

    # First deletion should return True
    assert delete_file(dummy_key) is True
    assert not dummy_file.exists()

    # Repeated deletion should return False without error
    assert delete_file(dummy_key) is False
    assert delete_file(dummy_key) is False


def test_committed_file_referenced_by_another_record_is_not_deleted(db_session):
    """7. A committed file referenced by a database record is not deleted."""
    settings = get_settings()
    root = settings.upload_directory.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)

    key = f"committed_{uuid4()}.docx"
    file_on_disk = root / key
    file_on_disk.write_bytes(b"Committed Content")

    import hashlib
    resume = Resume(
        original_filename="committed.docx",
        storage_key=key,
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        byte_size=17,
        sha256=hashlib.sha256(b"Committed Content").hexdigest(),
        processing_status=ProcessingStatus.COMPLETED,
    )
    db_session.add(resume)
    db_session.commit()

    # Calling delete_storage_key with db session provided must refuse to delete committed record
    assert ResumeService.delete_storage_key(key, db=db_session) is False

    # File must still be on disk
    assert file_on_disk.exists()


# ── Logging Privacy Tests ────────────────────────────────────────────────────


def test_privacy_email_masking_helper():
    """Verify mask_email handles standard, short, and edge-case email formats safely."""
    assert mask_email("alex.smith@company.com") == "a***h@company.com"
    assert mask_email("al@example.org") == "a*@example.org"
    assert mask_email("a@b.com") == "*@b.com"
    assert mask_email("") == "***"
    assert mask_email(None) == "***"
    assert mask_email("no_at_symbol") == "***"


def test_privacy_candidate_email_masked_in_logs(client, db_session, caplog):
    """Verify candidate email addresses are masked and not exposed in plaintext logs."""
    import logging

    # 1. Register a user with a specific email
    user_email = "registered.candidate@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": user_email, "password": "Password123456!", "role": "candidate"},
    )
    # 2. Register recruiter
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.hijack@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "HijackOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.hijack@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "Hijack Test Job", "description": "Test", "status": "open"},
    )
    job_id = job_res.json()["id"]

    # 3. Upload a resume containing the registered user's email to trigger the hijack protection warning
    resume_with_email = _create_minimal_docx(f"Applicant Contact: {user_email}\nSkills: Python, Go")

    with caplog.at_level(logging.WARNING):
        client.post(
            f"/api/v1/jobs/{job_id}/resumes",
            headers=rec_h,
            files={"file": ("applicant.docx", resume_with_email, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )

    # The plaintext email MUST NOT appear in the log output
    assert user_email not in caplog.text
    # The masked version MUST appear
    expected_masked = mask_email(user_email)
    assert expected_masked in caplog.text


def test_privacy_missing_file_logs_storage_key_not_absolute_path(db_session, caplog):
    """Verify missing file error logs use storage_key and resume_id, not full local filesystem path."""
    import logging
    from app.api.v1.resumes import _process_resume_inline

    settings = get_settings()
    dummy_resume_id = uuid4()
    dummy_job_id = uuid4()
    try:
        import hashlib
        resume = Resume(
            id=dummy_resume_id,
            original_filename="missing.docx",
            storage_key=f"missing_{dummy_resume_id}.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            byte_size=100,
            sha256=hashlib.sha256(b"missing").hexdigest(),
            processing_status=ProcessingStatus.QUEUED,
        )
        db_session.add(resume)
        db_session.commit()

        with caplog.at_level(logging.ERROR):
            _process_resume_inline(dummy_resume_id, dummy_job_id)

        # The log must contain the resume_id and storage_key
        assert str(dummy_resume_id) in caplog.text
        assert resume.storage_key in caplog.text

        # The log MUST NOT contain the absolute upload directory path prefix
        root_str = str(settings.upload_directory.expanduser().resolve())
        assert root_str not in caplog.text
    finally:
        pass
