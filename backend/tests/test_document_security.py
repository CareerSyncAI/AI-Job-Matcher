from __future__ import annotations

import io
import time
import zipfile
from pathlib import Path
from uuid import UUID

import pytest
from app.core.config import Settings, get_settings
from app.models.entities import Application, CandidateProfile, EvaluationRun, Resume
from app.models.enums import AttentionReason, ProcessingStatus
from app.services.text_extraction import (
    DOCXSecurityError,
    DocumentSecurityError,
    PDFPageLimitExceededError,
    _extract_docx,
    _extract_pdf,
    extract_text_from_file,
    validate_docx_archive,
)


def _create_synthetic_pdf(page_count: int, text: str = "") -> bytes:
    """Generate a valid, standards-compliant multi-page PDF in pure Python bytes."""
    objs = [b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"]
    kids = " ".join(f"{i + 3} 0 R" for i in range(page_count))
    objs.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {page_count} >>\nendobj\n".encode("ascii"))
    font_num = page_count + 3
    content_num = page_count + 4
    if text:
        content_stream = f"BT /F1 12 Tf 72 712 Td ({text}) Tj ET".encode("ascii")
        stream_len = len(content_stream)
        objs.append(
            f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_num} 0 R >> >> /Contents {content_num} 0 R >>\nendobj\n".encode("ascii")
        )
        for i in range(1, page_count):
            objs.append(f"{i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n".encode("ascii"))
        objs.append(f"{font_num} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n".encode("ascii"))
        objs.append(f"{content_num} 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("ascii") + content_stream + b"\nendstream\nendobj\n")
    else:
        for i in range(page_count):
            objs.append(f"{i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n".encode("ascii"))

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objs:
        offsets.append(out.tell())
        out.write(obj)
    xref_pos = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n".encode("ascii"))
    out.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.write(f"{off:010d} 00000 n \n".encode("ascii"))
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii"))
    return out.getvalue()


def _create_synthetic_docx(text: str = "Senior Engineer with Python and Docker") -> bytes:
    """Generate a minimal valid DOCX structure in memory."""
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


# ── PDF Page Count Tests ───────────────────────────────────────────────────


def test_pdf_within_limit_extracts_cleanly(tmp_path):
    """1. A valid PDF within the page limit (e.g. 3 pages <= 15 limit) extracts cleanly."""
    pdf_bytes = _create_synthetic_pdf(3)
    pdf_path = tmp_path / "valid.pdf"
    pdf_path.write_bytes(pdf_bytes)

    # Should not raise any security exceptions
    text = extract_text_from_file(pdf_path, "application/pdf", raise_security_exceptions=True)
    assert isinstance(text, str)


def test_pdf_exceeding_page_limit_raises_security_error(tmp_path):
    """2. A PDF exceeding the configured limit (e.g. 16 pages > 15) is rejected before full extraction."""
    pdf_bytes = _create_synthetic_pdf(16)
    pdf_path = tmp_path / "too_long.pdf"
    pdf_path.write_bytes(pdf_bytes)

    with pytest.raises(PDFPageLimitExceededError) as exc_info:
        _extract_pdf(pdf_path, max_pages=15)

    assert exc_info.value.page_count == 16
    assert exc_info.value.max_pages == 15
    assert "exceeds the maximum limit of 15 pages" in str(exc_info.value)


def test_pdf_custom_configurable_page_limit(tmp_path):
    """PDF parser respects custom limit parameter (e.g. 5 pages)."""
    pdf_bytes = _create_synthetic_pdf(6)
    pdf_path = tmp_path / "custom_limit.pdf"
    pdf_path.write_bytes(pdf_bytes)

    with pytest.raises(PDFPageLimitExceededError):
        _extract_pdf(pdf_path, max_pages=5)

    # But 5 pages should pass against max_pages=5
    pdf_5_bytes = _create_synthetic_pdf(5)
    pdf_5_path = tmp_path / "five_pages.pdf"
    pdf_5_path.write_bytes(pdf_5_bytes)
    _extract_pdf(pdf_5_path, max_pages=5)


def test_pdf_malformed_fails_safely_without_crash(tmp_path):
    """3. Malformed PDF returns empty string safely without leaking internal paths or crashing."""
    corrupt_pdf = tmp_path / "corrupt.pdf"
    corrupt_pdf.write_bytes(b"%PDF-1.4\ncorrupted_data_not_valid_pdf_structure\n%%EOF")

    text = extract_text_from_file(corrupt_pdf, "application/pdf", raise_security_exceptions=False)
    assert text == ""


# ── DOCX ZIP Archive Security Tests ─────────────────────────────────────────


def test_docx_valid_synthetic_archive_passes(tmp_path):
    """1. A valid synthetic DOCX passes archive validation and extracts text."""
    docx_bytes = _create_synthetic_docx("Jane Doe Cloud Architect")
    docx_path = tmp_path / "valid.docx"
    docx_path.write_bytes(docx_bytes)

    validate_docx_archive(docx_path)
    text = _extract_docx(docx_path)
    assert "Jane Doe Cloud Architect" in text


def test_docx_malformed_zip_archive(tmp_path):
    """2. Malformed ZIP archive is rejected with DOCXSecurityError."""
    corrupt = tmp_path / "bad.docx"
    corrupt.write_bytes(b"PK\x03\x04corrupt_garbage_header")

    with pytest.raises(DOCXSecurityError, match="Malformed or unreadable"):
        validate_docx_archive(corrupt)


def test_docx_excessive_entry_count(tmp_path):
    """3. Excessive ZIP-entry count (> 500 entries) is rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<doc/>")
        for i in range(505):
            zf.writestr(f"entry_{i}.xml", "content")

    with pytest.raises(DOCXSecurityError, match="entry count .* exceeds maximum limit"):
        validate_docx_archive(buf.getvalue(), max_zip_entries=500)


def test_docx_excessive_uncompressed_size(tmp_path):
    """4. Excessive uncompressed total size is rejected before reading contents."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "A" * 2000)

    # Set threshold lower for test verification
    with pytest.raises(DOCXSecurityError, match="total uncompressed size exceeds"):
        validate_docx_archive(buf.getvalue(), max_uncompressed_bytes=1000)


def test_docx_excessive_compression_ratio_zip_bomb(tmp_path):
    """5. High compression ratio (> 50:1) triggers zip-bomb protection."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<types/>")
        # 300KB of repeated zeroes compresses to ~300 bytes (ratio ~1000:1)
        zf.writestr("word/document.xml", b"\x00" * (300 * 1024))

    with pytest.raises(DOCXSecurityError, match="potential zip bomb"):
        validate_docx_archive(buf.getvalue(), max_compression_ratio=50.0)


def test_docx_oversized_individual_entry(tmp_path):
    """6. Oversized individual entry is rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "B" * 5000)

    with pytest.raises(DOCXSecurityError, match="uncompressed size .* exceeds limit"):
        validate_docx_archive(buf.getvalue(), max_entry_bytes=2000)


def test_docx_path_traversal_entry_rejected(tmp_path):
    """Suspicious archive paths with path traversal are rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<doc/>")
        zf.writestr("../../etc/passwd", "root:x:0:0")

    with pytest.raises(DOCXSecurityError, match="Suspicious path"):
        validate_docx_archive(buf.getvalue())


def test_docx_missing_required_structure(tmp_path):
    """A ZIP file lacking word/document.xml is rejected as invalid DOCX."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("random.txt", "just a text file")

    with pytest.raises(DOCXSecurityError, match="missing required document structure"):
        validate_docx_archive(buf.getvalue())


# ── Integration Tests ────────────────────────────────────────────────────────


def test_upload_excessive_pdf_does_not_rank_candidate(client, db_session):
    """Integration: An excessive PDF (> 15 pages) is rejected without ranking or partial extraction."""
    # 1. Register Recruiter and create open job
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.sec@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "SecOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.sec@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={
            "title": "Security Analyst",
            "department": "InfoSec",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 2.0,
            "education_required": "Bachelor",
            "description": "Analyze security threats and document safety.",
            "skills": [{"name": "Python", "required": True}],
            "evaluation_weights": {"skills": 100, "experience": 0, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    job_id = job_res.json()["id"]

    # 2. Upload a 20-page PDF
    excessive_pdf = _create_synthetic_pdf(20)
    upload_res = client.post(
        f"/api/v1/jobs/{job_id}/resumes",
        headers=rec_h,
        files={"file": ("excessive_resume.pdf", excessive_pdf, "application/pdf")},
    )
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    # 3. Verify Resume processing status transitioned to NEEDS_ATTENTION with PARSE_FAILED
    resume = db_session.query(Resume).filter(Resume.id == UUID(resume_id)).one()
    assert resume.processing_status == ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason == AttentionReason.PARSE_FAILED
    assert resume.extracted_text == ""

    # 4. Verify no MatchResult or completed EvaluationRun was generated
    eval_runs = (
        db_session.query(EvaluationRun)
        .join(Application, EvaluationRun.application_id == Application.id)
        .filter(Application.resume_id == UUID(resume_id))
        .all()
    )
    assert len(eval_runs) == 0


def test_upload_zip_bomb_docx_fails_safely(client, db_session):
    """Integration: A DOCX with excessive compression ratio is flagged as NEEDS_ATTENTION without server 500."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.docxsec@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "SecOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.docxsec@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "DevOps", "description": "DevOps Job", "status": "open"},
    )
    job_id = job_res.json()["id"]

    # Create high-compression ratio DOCX (zip bomb signature)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<types/>")
        zf.writestr("word/document.xml", b"\x00" * (250 * 1024))
    bomb_bytes = buf.getvalue()

    upload_res = client.post(
        f"/api/v1/jobs/{job_id}/resumes",
        headers=rec_h,
        files={"file": ("bomb.docx", bomb_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    resume = db_session.query(Resume).filter(Resume.id == UUID(resume_id)).one()
    assert resume.processing_status == ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason == AttentionReason.PARSE_FAILED
    assert resume.extracted_text == ""


def test_normal_resume_within_limits_succeeds(client, db_session):
    """Integration: Normal resumes within limits continue to process successfully end-to-end."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.normal@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "NormalOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.normal@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={
            "title": "Backend Python Engineer",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 2.0,
            "education_required": "Bachelor",
            "description": "Seeking Python specialist.",
            "skills": [{"name": "Python", "required": True}],
            "evaluation_weights": {"skills": 100, "experience": 0, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    job_id = job_res.json()["id"]

    valid_docx = _create_synthetic_docx("Alex Rivera\nSenior Software Engineer with Python expertise.")
    upload_res = client.post(
        f"/api/v1/jobs/{job_id}/resumes",
        headers=rec_h,
        files={"file": ("alex_rivera.docx", valid_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert upload_res.status_code == 202
    resume_id = upload_res.json()["id"]

    resume = db_session.query(Resume).filter(Resume.id == UUID(resume_id)).one()
    assert resume.processing_status == ProcessingStatus.COMPLETED
    assert resume.needs_attention_reason is None
    assert "Alex Rivera" in resume.extracted_text
