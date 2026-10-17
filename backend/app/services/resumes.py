from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
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
            ResumeService.delete_storage_key(stored.storage_key, db=db)
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate resume upload.") from error
        except Exception:
            db.rollback()
            ResumeService.delete_storage_key(stored.storage_key, db=db)
            raise

        return resume

    @staticmethod
    def enqueue_worker(resume_id: UUID) -> None:
        """Dispatch Celery task strictly after database transaction commit."""
        from app.core.config import get_settings
        if get_settings().enable_worker:
            from app.workers.tasks import process_resume
            try:
                process_resume.delay(str(resume_id))
            except Exception as exc:
                import logging
                logging.getLogger(__name__).error(
                    "Failed to enqueue resume %s for worker execution: %s", resume_id, exc
                )

    @staticmethod
    async def ingest_for_job(db: Session, *, job_id, upload: UploadFile) -> Resume:
        return await ResumeService.ingest(db, job_id=job_id, upload=upload)

    @staticmethod
    def delete_storage_key(storage_key: str, db: Session | None = None) -> bool:
        """Safely delete an uncommitted or orphaned stored file.

        Guarantees that a file currently referenced by a committed database record is not deleted.
        If a database session is provided, it verifies against the database; if the session is in
        an unrolled-back error state, it rolls back and verifies safely. If verification cannot
        succeed due to a database exception, deletion is refused.
        """
        if not storage_key:
            return False

        if db is not None:
            try:
                referenced = db.query(Resume).filter(Resume.storage_key == storage_key).first()
                if referenced is not None:
                    return False
            except Exception:
                try:
                    db.rollback()
                    referenced = db.query(Resume).filter(Resume.storage_key == storage_key).first()
                    if referenced is not None:
                        return False
                except Exception:
                    return False

        from app.services.storage import delete_file

        return delete_file(storage_key)
