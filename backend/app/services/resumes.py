from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.entities import Resume
from app.models.enums import ProcessingStatus
from app.services.storage import read_validated_upload, store_upload


class ResumeService:
    @staticmethod
    async def ingest(db: Session, *, upload: UploadFile, job_id=None, candidate_id=None) -> Resume:
        filename, mime_type, payload, extension = await read_validated_upload(upload)
        import hashlib

        digest = hashlib.sha256(payload).hexdigest()
        duplicate = None
        if job_id is not None:
            duplicate = (
                db.query(Resume)
                .filter(Resume.ingestion_job_id == job_id, Resume.sha256 == digest)
                .one_or_none()
            )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An identical file was already uploaded to this job.",
            )
        upload_id = uuid4()
        stored = store_upload(payload, extension, upload_id)
        resume = Resume(
            id=upload_id,
            ingestion_job_id=job_id,
            candidate_id=candidate_id,
            original_filename=filename,
            storage_key=stored.storage_key,
            mime_type=mime_type,
            byte_size=len(payload),
            sha256=digest,
            processing_status=ProcessingStatus.QUEUED,
        )
        db.add(resume)
        try:
            db.flush()
        except IntegrityError as error:
            db.rollback()
            ResumeService.delete_storage_key(stored.storage_key)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate resume upload.") from error
        return resume

    @staticmethod
    async def ingest_for_job(db: Session, *, job_id, upload: UploadFile) -> Resume:
        return await ResumeService.ingest(db, job_id=job_id, upload=upload)

    @staticmethod
    def delete_storage_key(storage_key: str) -> None:
        from app.core.config import get_settings

        root = get_settings().upload_directory.expanduser().resolve()
        candidate = (root / storage_key).resolve()
        if candidate.parent == root and candidate.exists():
            candidate.unlink()
