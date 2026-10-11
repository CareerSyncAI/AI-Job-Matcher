from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

PDF_MAGIC = b"%PDF-"
ZIP_MAGIC = b"PK\x03\x04"
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


@dataclass(frozen=True)
class StoredUpload:
    storage_key: str
    original_filename: str
    mime_type: str
    byte_size: int
    sha256: str


def safe_filename(filename: str | None) -> str:
    if not filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A filename is required.")
    normalized = filename.replace("\\", "/")
    name = Path(normalized).name
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
    if not name or name in {".", ".."}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
    return name[:255]


def validate_file_type(filename: str, declared_mime: str | None, payload: bytes) -> tuple[str, str]:
    extension = Path(filename).suffix.lower()
    if extension not in {".pdf", ".docx"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF and DOCX files are supported.")
    if declared_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported MIME type.")
    if ALLOWED_MIME_TYPES[declared_mime] != extension:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="File extension and MIME type disagree.")
    if extension == ".pdf" and not payload.startswith(PDF_MAGIC):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Invalid PDF signature.")
    if extension == ".docx" and not payload.startswith(ZIP_MAGIC):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Invalid DOCX signature.")
    return declared_mime, extension


async def read_validated_upload(upload: UploadFile) -> tuple[str, str, bytes, str]:
    settings = get_settings()
    filename = safe_filename(upload.filename)
    payload = await upload.read(settings.max_upload_bytes + 1)
    await upload.close()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
    if len(payload) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds the 10 MB limit.")
    mime_type, extension = validate_file_type(filename, upload.content_type, payload)
    return filename, mime_type, payload, extension


def store_upload(payload: bytes, extension: str, upload_id: UUID | None = None) -> StoredUpload:
    settings = get_settings()
    storage_root = settings.upload_directory.expanduser().resolve()
    storage_root.mkdir(parents=True, exist_ok=True)
    storage_id = upload_id or uuid4()
    storage_key = f"{storage_id}{extension}"
    destination = storage_root / storage_key
    # storage_key contains only a generated UUID and validated extension.
    destination.write_bytes(payload)
    return StoredUpload(
        storage_key=storage_key,
        original_filename="",
        mime_type="",
        byte_size=len(payload),
        sha256=hashlib.sha256(payload).hexdigest(),
    )
