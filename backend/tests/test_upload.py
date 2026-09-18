from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.storage import (
    PDF_MAGIC,
    safe_filename,
    store_upload,
    validate_file_type,
)


def test_safe_filename():
    assert safe_filename("resume.pdf") == "resume.pdf"
    assert safe_filename("../../etc/passwd.pdf") == "passwd.pdf"
    assert safe_filename("C:\\Users\\test\\my resume.pdf") == "my resume.pdf"
    with pytest.raises(HTTPException):
        safe_filename("")


def test_file_type_validation():
    # Valid PDF
    mime, ext = validate_file_type("resume.pdf", "application/pdf", PDF_MAGIC + b"content")
    assert mime == "application/pdf"
    assert ext == ".pdf"

    # Mismatched signature
    with pytest.raises(HTTPException):
        validate_file_type("resume.pdf", "application/pdf", b"NOT_A_PDF")

    # Mismatched extension and MIME
    with pytest.raises(HTTPException):
        validate_file_type("resume.docx", "application/pdf", PDF_MAGIC)


def test_store_upload_sha256(tmp_path, monkeypatch):
    from app.core.config import Settings

    monkeypatch.setattr("app.services.storage.get_settings", lambda: Settings(
        jwt_secret="a" * 32,
        upload_directory=tmp_path,
    ))

    stored = store_upload(b"Test resume content", ".pdf")
    assert stored.byte_size == len(b"Test resume content")
    assert len(stored.sha256) == 64
    assert (tmp_path / stored.storage_key).exists()
