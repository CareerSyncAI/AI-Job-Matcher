from __future__ import annotations

import io
import zipfile
from uuid import UUID

import pytest

from app.api.v1.resumes import _extract_name_from_filename, _extract_name_from_resume_text
from app.core.config import get_settings
from app.models.entities import Application, EvaluationRun, Resume
from app.models.enums import AttentionReason, ProcessingStatus
from app.services.text_extraction import (
    DOCXSecurityError,
    PDFPageLimitExceededError,
    ScannedDocumentError,
    _extract_docx,
    _extract_pdf,
    _normalize,
    extract_text_from_file,
    is_scanned_pdf,
    validate_docx_archive,
)


def _create_synthetic_pdf(page_count: int, text: str = "", has_image: bool = False) -> bytes:
    """Generate a valid, standards-compliant multi-page PDF in pure Python bytes."""
    objs = [b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"]
    kids = " ".join(f"{i + 3} 0 R" for i in range(page_count))
    objs.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {page_count} >>\nendobj\n".encode("ascii"))
    font_num = page_count + 3
    content_num = page_count + 4
    image_num = page_count + 5

    image_stream = b"\xff\x00\x00\x00\xff\x00\x00\x00\xff\xff\xff\xff"
    image_obj = (
        f"{image_num} 0 obj\n"
        f"<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length {len(image_stream)} >>\n"
        f"stream\n"
    ).encode("ascii") + image_stream + b"\nendstream\nendobj\n"

    res_parts = [f"/Font << /F1 {font_num} 0 R >>"]
    if has_image:
        res_parts.append(f"/XObject << /Im1 {image_num} 0 R >>")
    resources = f"<< {' '.join(res_parts)} >>"

    contents_lines = []
    if has_image:
        contents_lines.append("q 50 0 0 50 100 100 cm /Im1 Do Q")
    if text:
        contents_lines.append(f"BT /F1 12 Tf 72 712 Td ({text}) Tj ET")

    if contents_lines:
        content_stream = "\n".join(contents_lines).encode("ascii")
        stream_len = len(content_stream)
        objs.append(
            f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources {resources} /Contents {content_num} 0 R >>\nendobj\n".encode("ascii")
        )
        for i in range(1, page_count):
            objs.append(f"{i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n".encode("ascii"))
        objs.append(f"{font_num} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n".encode("ascii"))
        objs.append(f"{content_num} 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("ascii") + content_stream + b"\nendstream\nendobj\n")
        if has_image:
            objs.append(image_obj)
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


def test_docx_duplicate_entry_rejected():
    """Archive with duplicate entries is rejected to prevent parser confusion."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<doc>First</doc>")
        zf.writestr("word/document.xml", "<doc>Second</doc>")

    with pytest.raises(DOCXSecurityError, match="Duplicate entry in DOCX archive"):
        validate_docx_archive(buf.getvalue())


def test_docx_windows_drive_letter_path_rejected():
    """Archive member with Windows drive prefix is rejected as suspicious path."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<doc/>")
        zf.writestr("C:evil.xml", "<evil/>")

    with pytest.raises(DOCXSecurityError, match="Suspicious path"):
        validate_docx_archive(buf.getvalue())


def test_docx_missing_document_xml_rejected_even_with_content_types():
    """Archive with [Content_Types].xml but missing word/document.xml is rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("[Content_Types].xml", "<types/>")

    with pytest.raises(DOCXSecurityError, match="missing required document structure"):
        validate_docx_archive(buf.getvalue())


def test_late_thread_cannot_overwrite_timed_out_status(client, db_session):
    """A thread finishing after a request timed out cannot overwrite NEEDS_ATTENTION to COMPLETED."""
    from app.api.v1.resumes import _process_resume_inline

    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.race@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "RaceOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.race@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "Race Test Job", "description": "Race Test", "status": "open"},
    )
    job_id = UUID(job_res.json()["id"])

    # Create a resume and mark it as timed-out (NEEDS_ATTENTION)
    import hashlib
    valid_docx = _create_synthetic_docx("Fast Candidate")
    settings = get_settings()
    root = settings.upload_directory.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    storage_key = f"race_test_{job_id}.docx"
    (root / storage_key).write_bytes(valid_docx)

    resume = Resume(
        original_filename="fast.docx",
        storage_key=storage_key,
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        byte_size=len(valid_docx),
        sha256=hashlib.sha256(valid_docx).hexdigest(),
        processing_status=ProcessingStatus.NEEDS_ATTENTION,
        needs_attention_reason=AttentionReason.PARSE_FAILED,
    )
    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)

    # Now simulate a late invocation of _process_resume_inline running on that same resume
    _process_resume_inline(resume.id, job_id)

    # The resume must STILL remain NEEDS_ATTENTION, not overwritten to COMPLETED
    db_session.refresh(resume)
    assert resume.processing_status == ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason == AttentionReason.PARSE_FAILED


# ── Text Normalization Regression Tests ────────────────────────────────────


def test_normalize_repairs_split_words_across_linebreaks():
    """Repair words split across line breaks by hyphens."""
    raw = (
        "Demonstrated experi-\nence as a senior deve-\n"
        "loper, leading the imple-\nmentation of modern software sys-\ntems."
    )
    normalized = _normalize(raw)
    assert "experience" in normalized
    assert "developer" in normalized
    assert "implementation" in normalized
    assert "systems" in normalized
    assert "experi-" not in normalized
    assert "deve-" not in normalized


def test_normalize_preserves_legitimate_hyphenated_compounds():
    """Preserve legitimate compound words across line breaks without dropping hyphens."""
    raw = (
        "Engineered cross-\nfunctional solutions with built-\nin security.\n"
        "Delivered full-\nstack and front-\nend architecture with end-to-\nend testing.\n"
        "Built client-\nside and server-\nside services with real-\ntime capabilities.\n"
        "Architected cloud-\nnative, multi-\ntenant systems that are user-\nfriendly."
    )
    normalized = _normalize(raw)
    assert "cross-functional" in normalized
    assert "built-in" in normalized
    assert "full-stack" in normalized
    assert "front-end" in normalized
    assert "end-to-end" in normalized
    assert "client-side" in normalized
    assert "server-side" in normalized
    assert "real-time" in normalized
    assert "cloud-native" in normalized
    assert "multi-tenant" in normalized
    assert "user-friendly" in normalized


def test_normalize_preserves_single_words_with_prefixes():
    """Rejoin split single words that have recognized prefixes."""
    raw = (
        "Designed micro-\nservices and managed cloud infra-\nstructure.\n"
        "Optimized relational data-\nbase performance and CI/CD pipe-\nlines."
    )
    normalized = _normalize(raw)
    assert "microservices" in normalized
    assert "infrastructure" in normalized
    assert "database" in normalized
    assert "pipelines" in normalized


def test_normalize_preserves_urls_dates_and_technical_terms():
    """Preserve URLs, dates, and technical punctuation intact."""
    raw = (
        "Portfolio: https://github.com/alex-dev/cloud-native-tools\n"
        "Experience: 2020-\n2023 at Example Corp.\n"
        "Tenure: Jan 2021 -\n Present.\n"
        "Proficient in C++, C#, .NET, Node.js, Vue.js, CI/CD, and TCP/IP."
    )
    normalized = _normalize(raw)
    assert "https://github.com/alex-dev/cloud-native-tools" in normalized
    assert "2020 - 2023" in normalized
    assert "Jan 2021 - Present" in normalized
    assert "C++" in normalized
    assert "C#" in normalized
    assert ".NET" in normalized
    assert "Node.js" in normalized
    assert "Vue.js" in normalized
    assert "CI/CD" in normalized
    assert "TCP/IP" in normalized


def test_normalize_does_not_join_unrelated_words():
    """Avoid joining unrelated words separated by dashes or line breaks."""
    raw = (
        "Acme Corp - \nSenior Engineer\n"
        "Key Deliverable - \nReduced operational latency by 30%.\n"
        "John Doe\nSoftware Engineer"
    )
    normalized = _normalize(raw)
    assert "Acme Corp - Senior Engineer" in normalized
    assert "Key Deliverable - Reduced operational latency" in normalized
    assert "John Doe\nSoftware Engineer" in normalized


def test_normalize_collapses_excessive_whitespace_and_broken_lines():
    """Collapse excessive horizontal spacing, excessive newlines, and repair sentence line wraps."""
    raw = (
        "Experienced software engineer with 5+ years of\n"
        "experience building distributed backend systems.\n\n\n\n\n"
        "Core Skills:    Python          FastAPI         PostgreSQL"
    )
    normalized = _normalize(raw)
    assert "with 5+ years of experience building distributed backend systems." in normalized
    assert "Core Skills: Python FastAPI PostgreSQL" in normalized
    assert "\n\n\n" not in normalized


# ── Candidate Name Extraction Regression Tests ─────────────────────────────


def test_extract_name_from_resume_text_header_success():
    """Prefer plausible names located in the header of resume text."""
    text1 = "Alex Rivera\nalex.rivera@example.com | (555) 123-4567\nSenior Software Engineer"
    assert _extract_name_from_resume_text(text1, "resume.pdf") == "Alex Rivera"

    text2 = "JANE DOE\nFull Stack Developer\njane.doe@example.com"
    assert _extract_name_from_resume_text(text2, "cv.docx") == "Jane Doe"

    text3 = "Curriculum Vitae\nMaria Garcia\nmaria@example.com"
    assert _extract_name_from_resume_text(text3, "resume.pdf") == "Maria Garcia"

    text4 = "Name: Robert Chen\nEmail: robert@example.com"
    assert _extract_name_from_resume_text(text4, "document.pdf") == "Robert Chen"

    text5 = "Applicant Name - Sarah O'Connor\nPhone: 555-9876"
    assert _extract_name_from_resume_text(text5, "upload.pdf") == "Sarah O'Connor"


def test_extract_name_from_resume_text_skips_job_titles_and_sections():
    """Never extract section headers, document titles, or job titles as candidate names."""
    # Case 1: Header starts with a job title
    title_text = (
        "SOFTWARE ENGINEER\n"
        "SUMMARY\n"
        "Experienced software developer with Python expertise.\n"
        "SKILLS\nPython, Docker"
    )
    # Must NOT extract "Software Engineer" or "Summary"; falls back to filename if valid
    assert _extract_name_from_resume_text(title_text, "alex_smith_resume.pdf") == "Alex Smith"
    # If filename is also a job title, fallback conservatively to Applicant
    assert _extract_name_from_resume_text(title_text, "software_engineer.pdf") == "Applicant"

    # Case 2: Header starts with sections
    sections_text = (
        "RESUME\n"
        "PROFESSIONAL EXPERIENCE\n"
        "Developer at Acme\n"
        "EDUCATION\n"
        "B.S. Computer Science"
    )
    assert _extract_name_from_resume_text(sections_text, "devops_engineer.docx") == "Applicant"


def test_extract_name_from_filename_conservative():
    """Conservative name extraction from filename, rejecting titles and versions."""
    # Genuine candidate names in filename
    assert _extract_name_from_filename("alex_rivera_resume.pdf") == "Alex Rivera"
    assert _extract_name_from_filename("john_doe_v2_final.docx") == "John Doe"
    assert _extract_name_from_filename("sarah_jane_smith_cv.pdf") == "Sarah Jane Smith"

    # Generic or role-based filenames must be rejected
    assert _extract_name_from_filename("software_engineer_resume.pdf") == "Applicant"
    assert _extract_name_from_filename("devops_final.pdf") == "Applicant"
    assert _extract_name_from_filename("resume.pdf") == "Applicant"
    assert _extract_name_from_filename("cv_2024.docx") == "Applicant"
    assert _extract_name_from_filename("full_stack_developer.pdf") == "Applicant"
    assert _extract_name_from_filename("scan_001.pdf") == "Applicant"
    assert _extract_name_from_filename("") == "Applicant"


# ── Scanned PDF Classification Tests ───────────────────────────────────────


def test_scanned_pdf_with_image_and_no_text_raises_scanned_document_error(tmp_path):
    """Detect image-only PDF with no text layer as a scanned document."""
    pdf_bytes = _create_synthetic_pdf(1, text="", has_image=True)
    pdf_path = tmp_path / "scanned_image_only.pdf"
    pdf_path.write_bytes(pdf_bytes)

    assert is_scanned_pdf(pdf_path) is True

    with pytest.raises(ScannedDocumentError) as exc_info:
        _extract_pdf(pdf_path)
    assert "scanned document" in str(exc_info.value).lower()
    assert "ocr" not in str(exc_info.value).lower()


def test_scanned_pdf_with_near_empty_text_raises_scanned_document_error(tmp_path):
    """Detect PDF with images and only stray characters (e.g. page number) as scanned."""
    pdf_bytes = _create_synthetic_pdf(1, text="1", has_image=True)
    pdf_path = tmp_path / "scanned_page_num_only.pdf"
    pdf_path.write_bytes(pdf_bytes)

    assert is_scanned_pdf(pdf_path) is True

    with pytest.raises(ScannedDocumentError):
        _extract_pdf(pdf_path)


def test_pdf_with_image_and_substantial_text_does_not_raise_scanned_error(tmp_path):
    """A valid text PDF with a logo or decorative image is NOT classified as scanned."""
    full_text = (
        "Alex Rivera is a Senior Backend Engineer with extensive experience in "
        "Python, Docker, FastAPI, PostgreSQL, and distributed cloud microservices architecture."
    )
    pdf_bytes = _create_synthetic_pdf(1, text=full_text, has_image=True)
    pdf_path = tmp_path / "text_with_logo.pdf"
    pdf_path.write_bytes(pdf_bytes)

    assert is_scanned_pdf(pdf_path) is False

    extracted = _extract_pdf(pdf_path)
    assert "Alex Rivera" in extracted
    assert "Python" in extracted


def test_blank_pdf_without_images_returns_empty_string_not_scanned_error(tmp_path):
    """A blank PDF without images is treated as empty text (PARSE_FAILED), not scanned."""
    pdf_bytes = _create_synthetic_pdf(1, text="", has_image=False)
    pdf_path = tmp_path / "blank.pdf"
    pdf_path.write_bytes(pdf_bytes)

    assert is_scanned_pdf(pdf_path) is False
    extracted = _extract_pdf(pdf_path)
    assert extracted == ""


def test_upload_scanned_pdf_sets_needs_attention_scanned_document(client, db_session):
    """Integration: Uploading a scanned PDF sets needs_attention_reason to SCANNED_DOCUMENT."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "rec.scan@example.com", "password": "Password123456!", "role": "recruiter", "organization_name": "ScanOrg"},
    )
    rec_tok = client.post("/api/v1/auth/login", json={"email": "rec.scan@example.com", "password": "Password123456!"}).json()["access_token"]
    rec_h = {"Authorization": f"Bearer {rec_tok}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=rec_h,
        json={"title": "Cloud Architect", "description": "Cloud job", "status": "open"},
    )
    job_id = job_res.json()["id"]

    scanned_bytes = _create_synthetic_pdf(1, text="", has_image=True)
    upload_res = client.post(
        f"/api/v1/jobs/{job_id}/resumes",
        headers=rec_h,
        files={"file": ("scanned_resume.pdf", scanned_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 202
    data = upload_res.json()
    assert data["processing_status"] == "needs_attention"
    assert data["needs_attention_reason"] == "scanned_document"

    resume = db_session.query(Resume).filter(Resume.id == UUID(data["id"])).one()
    assert resume.processing_status == ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason == AttentionReason.SCANNED_DOCUMENT
    assert resume.extracted_text == ""


def test_upload_profile_scanned_pdf_sets_needs_attention_scanned_document(client, db_session):
    """Integration: Candidate uploading a scanned profile resume sets SCANNED_DOCUMENT."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "cand.scan@example.com", "password": "Password123456!", "role": "candidate"},
    )
    cand_tok = client.post("/api/v1/auth/login", json={"email": "cand.scan@example.com", "password": "Password123456!"}).json()["access_token"]
    cand_h = {"Authorization": f"Bearer {cand_tok}"}

    scanned_bytes = _create_synthetic_pdf(1, text="", has_image=True)
    upload_res = client.post(
        "/api/v1/profile/resumes",
        headers=cand_h,
        files={"file": ("profile_scanned.pdf", scanned_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 202
    data = upload_res.json()
    assert data["processing_status"] == "needs_attention"
    assert data["needs_attention_reason"] == "scanned_document"

    resume = db_session.query(Resume).filter(Resume.id == UUID(data["id"])).one()
    assert resume.processing_status == ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason == AttentionReason.SCANNED_DOCUMENT
