from __future__ import annotations

import io
import zipfile
import pytest
from fastapi.testclient import TestClient

from src.api.app import app, DEFAULT_DEV_KEY
from src.parsers.pdf_parser import PDFParser, PDFPageLimitExceeded
from src.parsers.docx_parser import DOCXParser, DOCXSecurityError


@pytest.fixture
def client():
    return TestClient(app, headers={"X-AI-Service-Key": DEFAULT_DEV_KEY})


def _make_pdf(pages: int, text: str = "") -> bytes:
    """Generate pure Python multi-page PDF."""
    objs = [b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"]
    kids = " ".join(f"{i + 3} 0 R" for i in range(pages))
    objs.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {pages} >>\nendobj\n".encode("ascii"))
    font_num = pages + 3
    content_num = pages + 4
    if text:
        content_stream = f"BT /F1 12 Tf 72 712 Td ({text}) Tj ET".encode("ascii")
        stream_len = len(content_stream)
        objs.append(
            f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_num} 0 R >> >> /Contents {content_num} 0 R >>\nendobj\n".encode("ascii")
        )
        for i in range(1, pages):
            objs.append(f"{i + 3} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n".encode("ascii"))
        objs.append(f"{font_num} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n".encode("ascii"))
        objs.append(f"{content_num} 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("ascii") + content_stream + b"\nendstream\nendobj\n")
    else:
        for i in range(pages):
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


def _make_docx(text: str = "Candidate Experience") -> bytes:
    """Generate valid DOCX bytes using python-docx."""
    import docx
    doc = docx.Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_ai_pdf_parser_within_limit():
    """PDFParser processes 3-page PDF without error."""
    parser = PDFParser(max_pages=15)
    pdf_bytes = _make_pdf(3, "Test Candidate")
    res = parser.parse_stream(io.BytesIO(pdf_bytes))
    assert res["page_count"] == 3
    assert "Test Candidate" in res["text"]


def test_ai_pdf_parser_exceeding_limit_raises():
    """PDFParser rejects 16-page PDF with PDFPageLimitExceeded."""
    parser = PDFParser(max_pages=15)
    pdf_bytes = _make_pdf(16)
    with pytest.raises(PDFPageLimitExceeded) as exc_info:
        parser.parse_stream(io.BytesIO(pdf_bytes))
    assert exc_info.value.page_count == 16
    assert exc_info.value.max_pages == 15


def test_ai_docx_parser_valid():
    """DOCXParser extracts clean text from valid DOCX archive."""
    parser = DOCXParser()
    docx_bytes = _make_docx("Staff Infrastructure Engineer")
    res = parser.parse_stream(io.BytesIO(docx_bytes))
    assert "Staff Infrastructure Engineer" in res["text"]


def test_ai_docx_parser_zip_bomb():
    """DOCXParser rejects high-compression zip-bomb archive."""
    parser = DOCXParser(max_compression_ratio=50.0)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<types/>")
        zf.writestr("word/document.xml", b"\x00" * (250 * 1024))
    with pytest.raises(DOCXSecurityError, match="potential zip bomb"):
        parser.parse_stream(buf)


def test_ai_parse_resume_endpoint_page_limit_exceeded(client):
    """POST /api/v1/ai/parse-resume returns HTTP 422 with PAGE_LIMIT_EXCEEDED."""
    pdf_bytes = _make_pdf(20)
    files = {"file": ("long_resume.pdf", pdf_bytes, "application/pdf")}
    resp = client.post("/api/v1/ai/parse-resume", files=files)
    assert resp.status_code == 422
    data = resp.json()
    assert data["error"]["code"] == "PAGE_LIMIT_EXCEEDED"
    assert "20 pages" in data["error"]["message"]


def test_ai_parse_resume_endpoint_zip_bomb(client):
    """POST /api/v1/ai/parse-resume returns HTTP 422 with INVALID_DOCUMENT_ARCHIVE."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "<types/>")
        zf.writestr("word/document.xml", b"\x00" * (250 * 1024))
    bomb_bytes = buf.getvalue()

    files = {"file": ("bomb.docx", bomb_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    resp = client.post("/api/v1/ai/parse-resume", files=files)
    assert resp.status_code == 422
    data = resp.json()
    assert data["error"]["code"] == "INVALID_DOCUMENT_ARCHIVE"


def test_ai_docx_duplicate_entry_rejected():
    """DOCXParser rejects archives containing duplicate entries."""
    parser = DOCXParser()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<doc>A</doc>")
        zf.writestr("word/document.xml", "<doc>B</doc>")

    with pytest.raises(DOCXSecurityError, match="Duplicate entry in DOCX archive"):
        parser.parse_stream(buf)


def test_ai_docx_windows_drive_letter_rejected():
    """DOCXParser rejects archives containing Windows drive path prefixes."""
    parser = DOCXParser()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<doc/>")
        zf.writestr("C:evil.xml", "<evil/>")

    with pytest.raises(DOCXSecurityError, match="Suspicious path"):
        parser.parse_stream(buf)


def test_ai_docx_missing_document_xml_rejected():
    """DOCXParser rejects archives missing word/document.xml even if [Content_Types].xml is present."""
    parser = DOCXParser()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("[Content_Types].xml", "<types/>")

    with pytest.raises(DOCXSecurityError, match="missing required document structure"):
        parser.parse_stream(buf)


def test_ai_docx_malformed_xml_structure_rejected():
    """DOCXParser converts unparseable XML in docx into DOCXSecurityError."""
    parser = DOCXParser()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", "<<<bad_xml>>>")

    with pytest.raises(DOCXSecurityError, match="Malformed DOCX XML"):
        parser.parse_stream(buf)


def test_ai_pdf_parser_env_var_override(monkeypatch):
    """PDFParser respects MAX_PDF_PAGES environment variable override."""
    monkeypatch.setenv("MAX_PDF_PAGES", "7")
    parser = PDFParser()
    assert parser.max_pages == 7

    pdf_8_bytes = _make_pdf(8)
    with pytest.raises(PDFPageLimitExceeded) as exc_info:
        parser.parse_stream(io.BytesIO(pdf_8_bytes))
    assert exc_info.value.max_pages == 7


def test_ai_docx_parser_env_var_override(monkeypatch):
    """DOCXParser respects DOCX_MAX_ZIP_ENTRIES environment variable override."""
    monkeypatch.setenv("DOCX_MAX_ZIP_ENTRIES", "10")
    parser = DOCXParser()
    assert parser.max_zip_entries == 10
