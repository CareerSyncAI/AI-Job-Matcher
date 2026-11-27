from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import and_, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.entities import Resume, ResumeAnalysisRun
from app.models.enums import ProcessingStatus, ResumeAnalysisStatus
from app.schemas.resumes import ATSAnalysisSchema, ATSIssueSchema, ResumeAnalysisStatusResponse
from app.services.ats_analyzer import ATSAnalysisResult, ats_analyzer
from app.services.storage import StoragePathError, resolve_safe_storage_path
from app.services.text_extraction import (
    DocumentSecurityError,
    ScannedDocumentError,
    extract_text_from_file,
)

logger = logging.getLogger(__name__)

STAGE_READY = "ready"
STAGE_QUEUED = "queued"
STAGE_EXTRACTING_TEXT = "extracting_text"
STAGE_ANALYZING_ATS = "analyzing_ats"
STAGE_PERSISTING_RESULTS = "persisting_results"
STAGE_COMPLETED = "completed"
STAGE_FAILED = "failed"

QUEUED_LEASE_SECONDS = 300
RUNNING_LEASE_SECONDS = 120
MAX_ANALYSIS_ATTEMPTS = 5

ACTIVE_ANALYSIS_STATUSES = (
    ResumeAnalysisStatus.QUEUED,
    ResumeAnalysisStatus.RUNNING,
)

TERMINAL_ANALYSIS_STATUSES = (
    ResumeAnalysisStatus.COMPLETED,
    ResumeAnalysisStatus.FAILED,
)

SANITIZED_FAILURE_DETAILS: dict[str, str] = {
    "resume_not_found": "Associated resume record no longer exists.",
    "file_missing": "Resume file could not be found in storage.",
    "storage_path_invalid": "Resume file reference failed storage containment validation.",
    "scanned_document": "The uploaded document appears to be a scanned image without selectable text.",
    "document_security_rejected": "The document failed security validation and could not be processed.",
    "parse_failed": "The resume file could not be parsed. Please ensure it is a valid PDF or DOCX document.",
    "empty_text": "No readable text could be extracted from the resume.",
    "analysis_error": "An internal error occurred while analyzing the resume. Please retry.",
    "worker_enqueue_failed": "The analysis worker is temporarily unavailable. Please retry shortly.",
    "worker_timeout": "Resume analysis exceeded the worker time limit.",
    "worker_lease_expired": "Previous analysis run timed out before completion and was marked failed.",
}


def get_sanitized_failure_detail(failure_code: str) -> str:
    return SANITIZED_FAILURE_DETAILS.get(
        failure_code,
        "Resume analysis failed due to an internal error. Please retry.",
    )


def build_ats_analysis_schema(result: ATSAnalysisResult) -> ATSAnalysisSchema:
    """Convert an ATSAnalysisResult dataclass into the public ATSAnalysisSchema."""
    return ATSAnalysisSchema(
        overall_ats_score=result.overall_ats_score,
        grade=result.grade,
        section_score=result.section_score,
        contact_score=result.contact_score,
        impact_score=result.impact_score,
        formatting_score=result.formatting_score,
        skills_score=result.skills_score,
        detected_sections=result.detected_sections,
        detected_skills=result.detected_skills,
        missing_critical_sections=result.missing_critical_sections,
        contact_details=result.contact_details,
        action_verbs_found=result.action_verbs_found,
        quantifiable_metrics_count=result.quantifiable_metrics_count,
        word_count=result.word_count,
        strengths=result.strengths,
        issues=[
            ATSIssueSchema(
                category=issue.category,
                severity=issue.severity,
                issue=issue.issue,
                recommendation=issue.recommendation,
            )
            for issue in result.issues
        ],
    )


def _to_status_response(resume_id: UUID, run: ResumeAnalysisRun | None) -> ResumeAnalysisStatusResponse:
    if run is None:
        return ResumeAnalysisStatusResponse(
            resume_id=resume_id,
            run_id=None,
            status=ResumeAnalysisStatus.READY,
            current_stage=STAGE_READY,
            failed_stage=None,
            attempt_number=0,
            retry_of_run_id=None,
            result_available=False,
        )

    parsed_result = (
        ATSAnalysisSchema.model_validate(run.result_payload)
        if run.status == ResumeAnalysisStatus.COMPLETED and run.result_payload is not None
        else None
    )
    return ResumeAnalysisStatusResponse(
        resume_id=run.resume_id,
        run_id=run.id,
        status=run.status,
        current_stage=run.current_stage,
        failed_stage=run.failed_stage,
        attempt_number=run.attempt_number,
        retry_of_run_id=run.retry_of_run_id,
        result_available=parsed_result is not None,
        failure_code=run.failure_code,
        failure_detail=run.failure_detail,
        result=parsed_result,
        created_at=run.created_at,
        started_at=run.started_at,
        completed_at=run.completed_at,
        failed_at=run.failed_at,
    )


def mark_run_failed_atomic(
    db: Session,
    run_id: UUID,
    *,
    failure_code: str,
    failure_detail: str | None = None,
) -> bool:
    """Atomically transition an active (queued/running) run to failed without overwriting terminal states."""
    now = datetime.now(UTC)
    sanitized_detail = failure_detail or get_sanitized_failure_detail(failure_code)
    result = db.execute(
        update(ResumeAnalysisRun)
        .where(
            ResumeAnalysisRun.id == run_id,
            ResumeAnalysisRun.status.in_(ACTIVE_ANALYSIS_STATUSES),
        )
        .values(
            status=ResumeAnalysisStatus.FAILED,
            failed_stage=ResumeAnalysisRun.current_stage,
            current_stage=STAGE_FAILED,
            failure_code=failure_code,
            failure_detail=sanitized_detail,
            lease_expires_at=None,
            failed_at=now,
            updated_at=now,
        )
        .execution_options(synchronize_session=False)
    )
    db.commit()
    db.expire_all()
    return (result.rowcount or 0) == 1


def _advance_running_stage(db: Session, run_id: UUID, stage: str) -> bool:
    """Advance stage and renew lease only if the run is still owned in RUNNING state."""
    now = datetime.now(UTC)
    result = db.execute(
        update(ResumeAnalysisRun)
        .where(
            ResumeAnalysisRun.id == run_id,
            ResumeAnalysisRun.status == ResumeAnalysisStatus.RUNNING,
        )
        .values(
            current_stage=stage,
            lease_expires_at=now + timedelta(seconds=RUNNING_LEASE_SECONDS),
            updated_at=now,
        )
        .execution_options(synchronize_session=False)
    )
    db.commit()
    return (result.rowcount or 0) == 1


def _recover_expired_runs(db: Session, *, resume_id: UUID) -> int:
    """Mark stranded active runs whose lease has expired as failed so recovery is bounded."""
    now = datetime.now(UTC)
    legacy_cutoff = now - timedelta(seconds=QUEUED_LEASE_SECONDS)
    expired_filter = or_(
        and_(
            ResumeAnalysisRun.lease_expires_at.is_not(None),
            ResumeAnalysisRun.lease_expires_at <= now,
        ),
        and_(
            ResumeAnalysisRun.lease_expires_at.is_(None),
            ResumeAnalysisRun.updated_at <= legacy_cutoff,
        ),
    )
    result = db.execute(
        update(ResumeAnalysisRun)
        .where(
            ResumeAnalysisRun.resume_id == resume_id,
            ResumeAnalysisRun.status.in_(ACTIVE_ANALYSIS_STATUSES),
            expired_filter,
        )
        .values(
            status=ResumeAnalysisStatus.FAILED,
            failed_stage=ResumeAnalysisRun.current_stage,
            current_stage=STAGE_FAILED,
            failure_code="worker_lease_expired",
            failure_detail=get_sanitized_failure_detail("worker_lease_expired"),
            lease_expires_at=None,
            failed_at=now,
            updated_at=now,
        )
        .execution_options(synchronize_session=False)
    )
    if result.rowcount:
        db.commit()
        db.expire_all()
        logger.warning(
            "Recovered %s expired analysis run(s) for resume %s.",
            result.rowcount,
            resume_id,
        )
    return int(result.rowcount or 0)


def execute_analysis_run(run_id: UUID, db: Session | None = None) -> None:
    """Atomically claim and execute a queued ResumeAnalysisRun through observable stages."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        now = datetime.now(UTC)
        claimed = db.execute(
            update(ResumeAnalysisRun)
            .where(
                ResumeAnalysisRun.id == run_id,
                ResumeAnalysisRun.status == ResumeAnalysisStatus.QUEUED,
            )
            .values(
                status=ResumeAnalysisStatus.RUNNING,
                current_stage=STAGE_EXTRACTING_TEXT,
                started_at=now,
                lease_expires_at=now + timedelta(seconds=RUNNING_LEASE_SECONDS),
                updated_at=now,
            )
            .execution_options(synchronize_session=False)
        )
        db.commit()
        if (claimed.rowcount or 0) != 1:
            logger.info("ResumeAnalysisRun %s already claimed or terminal; skipping.", run_id)
            return

        run = db.get(ResumeAnalysisRun, run_id)
        if not run:
            logger.warning("ResumeAnalysisRun %s disappeared after claim; skipping.", run_id)
            return

        resume = db.get(Resume, run.resume_id)
        if not resume:
            mark_run_failed_atomic(db, run_id, failure_code="resume_not_found")
            return

        # Stage 1: extracting_text
        text = (resume.extracted_text or "").strip()
        if not text:
            if not resume.storage_key:
                mark_run_failed_atomic(db, run_id, failure_code="file_missing")
                return

            settings = get_settings()
            try:
                file_path = resolve_safe_storage_path(
                    resume.storage_key,
                    upload_directory=settings.upload_directory,
                    require_file=True,
                )
            except StoragePathError as exc:
                logger.warning(
                    "Rejected unsafe storage_key for resume %s (run %s): %s",
                    resume.id,
                    run_id,
                    exc,
                )
                mark_run_failed_atomic(db, run_id, failure_code="storage_path_invalid")
                return
            except FileNotFoundError:
                logger.warning("Resume file missing on disk for resume %s (run %s)", resume.id, run_id)
                mark_run_failed_atomic(db, run_id, failure_code="file_missing")
                return

            try:
                extracted = extract_text_from_file(
                    file_path,
                    resume.mime_type,
                    raise_security_exceptions=True,
                )
            except ScannedDocumentError as exc:
                logger.warning("Resume %s rejected as scanned document (run %s): %s", resume.id, run_id, exc)
                mark_run_failed_atomic(db, run_id, failure_code="scanned_document")
                return
            except DocumentSecurityError as exc:
                logger.warning("Resume %s rejected by document security policy (run %s): %s", resume.id, run_id, exc)
                mark_run_failed_atomic(db, run_id, failure_code="document_security_rejected")
                return
            except Exception as exc:
                logger.warning("Text extraction failed for resume %s (run %s): %s", resume.id, run_id, exc)
                mark_run_failed_atomic(db, run_id, failure_code="parse_failed")
                return

            if not extracted or not extracted.strip():
                mark_run_failed_atomic(db, run_id, failure_code="empty_text")
                return

            text = extracted.strip()
            resume.extracted_text = extracted
            db.commit()

        # Stage 2: analyzing_ats
        if not _advance_running_stage(db, run_id, STAGE_ANALYZING_ATS):
            logger.warning("ResumeAnalysisRun %s lost ownership before analyzing_ats; aborting.", run_id)
            return

        analysis_result = ats_analyzer.analyze(text)
        schema = build_ats_analysis_schema(analysis_result)

        # Stage 3: persisting_results
        if not _advance_running_stage(db, run_id, STAGE_PERSISTING_RESULTS):
            logger.warning("ResumeAnalysisRun %s lost ownership before persisting_results; aborting.", run_id)
            return

        completed_at = datetime.now(UTC)
        completed = db.execute(
            update(ResumeAnalysisRun)
            .where(
                ResumeAnalysisRun.id == run_id,
                ResumeAnalysisRun.status == ResumeAnalysisStatus.RUNNING,
            )
            .values(
                result_payload=schema.model_dump(mode="json"),
                status=ResumeAnalysisStatus.COMPLETED,
                current_stage=STAGE_COMPLETED,
                failed_stage=None,
                failure_code=None,
                failure_detail=None,
                lease_expires_at=None,
                completed_at=completed_at,
                updated_at=completed_at,
            )
            .execution_options(synchronize_session=False)
        )
        db.commit()
        db.expire_all()
        if (completed.rowcount or 0) != 1:
            logger.warning("ResumeAnalysisRun %s lost ownership before completion commit; skipping.", run_id)
    except Exception as exc:
        logger.exception("Unexpected failure executing ResumeAnalysisRun %s: %s", run_id, exc)
        db.rollback()
        try:
            mark_run_failed_atomic(db, run_id, failure_code="analysis_error")
        except Exception:
            db.rollback()
            logger.exception("Could not persist failed state for ResumeAnalysisRun %s", run_id)
    finally:
        if close_db:
            db.close()


class ResumeAnalysisService:
    @staticmethod
    def get_active_run(db: Session, *, resume_id: UUID) -> ResumeAnalysisRun | None:
        return (
            db.query(ResumeAnalysisRun)
            .filter(
                ResumeAnalysisRun.resume_id == resume_id,
                ResumeAnalysisRun.status.in_(ACTIVE_ANALYSIS_STATUSES),
            )
            .order_by(ResumeAnalysisRun.created_at.desc())
            .first()
        )

    @staticmethod
    def get_latest_status(db: Session, *, resume_id: UUID) -> ResumeAnalysisStatusResponse:
        latest = (
            db.query(ResumeAnalysisRun)
            .filter(ResumeAnalysisRun.resume_id == resume_id)
            .order_by(ResumeAnalysisRun.created_at.desc(), ResumeAnalysisRun.attempt_number.desc())
            .first()
        )
        return _to_status_response(resume_id, latest)

    @staticmethod
    def get_run_status(
        db: Session,
        *,
        resume_id: UUID,
        run_id: UUID,
    ) -> ResumeAnalysisStatusResponse:
        run = (
            db.query(ResumeAnalysisRun)
            .filter(ResumeAnalysisRun.id == run_id, ResumeAnalysisRun.resume_id == resume_id)
            .one_or_none()
        )
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis run not found for this resume.",
            )
        return _to_status_response(resume_id, run)

    @staticmethod
    def _raise_active_conflict(db: Session, *, resume_id: UUID) -> None:
        active = ResumeAnalysisService.get_active_run(db, resume_id=resume_id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An analysis run ({active.id}) is already {active.status.value} for this resume.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active analysis run already exists for this resume.",
        )

    @staticmethod
    def start_run(
        db: Session,
        *,
        resume: Resume,
        initiated_by_user_id: UUID,
    ) -> ResumeAnalysisRun:
        if (
            resume.processing_status in (ProcessingStatus.UPLOADING, ProcessingStatus.PROCESSING)
            and not (resume.extracted_text or "").strip()
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Resume ingestion is currently in progress. Wait for upload processing to finish before starting analysis.",
            )

        _recover_expired_runs(db, resume_id=resume.id)

        active = ResumeAnalysisService.get_active_run(db, resume_id=resume.id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An analysis run ({active.id}) is already {active.status.value} for this resume.",
            )

        now = datetime.now(UTC)
        run = ResumeAnalysisRun(
            resume_id=resume.id,
            initiated_by_user_id=initiated_by_user_id,
            status=ResumeAnalysisStatus.QUEUED,
            current_stage=STAGE_QUEUED,
            attempt_number=1,
            lease_expires_at=now + timedelta(seconds=QUEUED_LEASE_SECONDS),
        )
        db.add(run)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            ResumeAnalysisService._raise_active_conflict(db, resume_id=resume.id)
        db.refresh(run)
        return run

    @staticmethod
    def retry_run(
        db: Session,
        *,
        resume: Resume,
        run_id: UUID,
        initiated_by_user_id: UUID,
    ) -> ResumeAnalysisRun:
        _recover_expired_runs(db, resume_id=resume.id)

        previous = (
            db.query(ResumeAnalysisRun)
            .filter(ResumeAnalysisRun.id == run_id, ResumeAnalysisRun.resume_id == resume.id)
            .one_or_none()
        )
        if not previous:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis run not found for this resume.",
            )

        if previous.status != ResumeAnalysisStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only failed analysis runs can be retried (current status: {previous.status.value}).",
            )

        already_retried = (
            db.query(ResumeAnalysisRun.id)
            .filter(ResumeAnalysisRun.retry_of_run_id == previous.id)
            .first()
        )
        if already_retried is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This failed analysis run has already been retried.",
            )

        if previous.attempt_number >= MAX_ANALYSIS_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Maximum analysis retry limit ({MAX_ANALYSIS_ATTEMPTS}) reached for this run chain.",
            )

        active = ResumeAnalysisService.get_active_run(db, resume_id=resume.id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An analysis run ({active.id}) is already {active.status.value} for this resume.",
            )

        now = datetime.now(UTC)
        run = ResumeAnalysisRun(
            resume_id=resume.id,
            initiated_by_user_id=initiated_by_user_id,
            retry_of_run_id=previous.id,
            status=ResumeAnalysisStatus.QUEUED,
            current_stage=STAGE_QUEUED,
            attempt_number=previous.attempt_number + 1,
            lease_expires_at=now + timedelta(seconds=QUEUED_LEASE_SECONDS),
        )
        db.add(run)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            ResumeAnalysisService._raise_active_conflict(db, resume_id=resume.id)
        db.refresh(run)
        return run

    @staticmethod
    def dispatch(
        run: ResumeAnalysisRun,
        *,
        db: Session,
        background_tasks: BackgroundTasks | None = None,
    ) -> ResumeAnalysisStatusResponse:
        settings = get_settings()
        if settings.enable_worker:
            from app.workers.tasks import analyze_resume_task

            try:
                analyze_resume_task.delay(str(run.id))  # pyright: ignore[reportFunctionMemberAccess]
            except Exception as exc:
                logger.error("Failed to enqueue analysis run %s: %s", run.id, exc)
                mark_run_failed_atomic(db, run.id, failure_code="worker_enqueue_failed")
        elif background_tasks is not None:
            background_tasks.add_task(execute_analysis_run, run.id)
        else:
            execute_analysis_run(run.id, db=db)

        db.refresh(run)
        return _to_status_response(run.resume_id, run)
