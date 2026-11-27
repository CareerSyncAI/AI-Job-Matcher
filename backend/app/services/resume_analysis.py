from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.entities import Resume, ResumeAnalysisRun
from app.models.enums import ResumeAnalysisStatus
from app.schemas.resumes import ATSAnalysisSchema, ATSIssueSchema, ResumeAnalysisStatusResponse
from app.services.ats_analyzer import ATSAnalysisResult, ats_analyzer
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

ACTIVE_ANALYSIS_STATUSES = (
    ResumeAnalysisStatus.QUEUED,
    ResumeAnalysisStatus.RUNNING,
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


def _mark_run_failed(
    db: Session,
    run: ResumeAnalysisRun,
    *,
    failure_code: str,
    failure_detail: str,
) -> None:
    run.status = ResumeAnalysisStatus.FAILED
    run.current_stage = STAGE_FAILED
    run.failure_code = failure_code
    run.failure_detail = failure_detail
    run.failed_at = datetime.now(UTC)
    db.commit()


def execute_analysis_run(run_id: UUID, db: Session | None = None) -> None:
    """Execute a queued ResumeAnalysisRun through real observable stages."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        run = db.get(ResumeAnalysisRun, run_id)
        if not run:
            logger.warning("ResumeAnalysisRun %s not found; skipping execution.", run_id)
            return

        if run.status in (ResumeAnalysisStatus.COMPLETED, ResumeAnalysisStatus.FAILED):
            logger.info("ResumeAnalysisRun %s already terminal (%s); skipping.", run_id, run.status)
            return

        resume = db.get(Resume, run.resume_id)
        if not resume:
            _mark_run_failed(
                db,
                run,
                failure_code="resume_not_found",
                failure_detail="Associated resume record no longer exists.",
            )
            return

        # Stage 1: extracting_text
        run.status = ResumeAnalysisStatus.RUNNING
        run.started_at = run.started_at or datetime.now(UTC)
        run.current_stage = STAGE_EXTRACTING_TEXT
        db.commit()

        text = (resume.extracted_text or "").strip()
        if not text:
            if not resume.storage_key:
                _mark_run_failed(
                    db,
                    run,
                    failure_code="file_missing",
                    failure_detail="Resume file is missing from storage.",
                )
                return

            settings = get_settings()
            root = settings.upload_directory.expanduser().resolve()
            file_path = (root / resume.storage_key).resolve()
            if not file_path.exists():
                _mark_run_failed(
                    db,
                    run,
                    failure_code="file_missing",
                    failure_detail="Resume file could not be found in storage.",
                )
                return

            try:
                extracted = extract_text_from_file(
                    file_path,
                    resume.mime_type,
                    raise_security_exceptions=True,
                )
            except ScannedDocumentError as exc:
                _mark_run_failed(
                    db,
                    run,
                    failure_code="scanned_document",
                    failure_detail=str(exc),
                )
                return
            except DocumentSecurityError as exc:
                _mark_run_failed(
                    db,
                    run,
                    failure_code="document_security_rejected",
                    failure_detail=str(exc),
                )
                return
            except Exception as exc:
                _mark_run_failed(
                    db,
                    run,
                    failure_code="parse_failed",
                    failure_detail=f"Text extraction failed: {exc}",
                )
                return

            if not extracted or not extracted.strip():
                _mark_run_failed(
                    db,
                    run,
                    failure_code="empty_text",
                    failure_detail="No readable text could be extracted from the resume.",
                )
                return

            text = extracted.strip()
            resume.extracted_text = extracted
            db.commit()

        # Stage 2: analyzing_ats
        run.current_stage = STAGE_ANALYZING_ATS
        db.commit()

        analysis_result = ats_analyzer.analyze(text)
        schema = build_ats_analysis_schema(analysis_result)

        # Stage 3: persisting_results
        run.current_stage = STAGE_PERSISTING_RESULTS
        db.commit()

        run.result_payload = schema.model_dump(mode="json")
        run.status = ResumeAnalysisStatus.COMPLETED
        run.current_stage = STAGE_COMPLETED
        run.failure_code = None
        run.failure_detail = None
        run.completed_at = datetime.now(UTC)
        db.commit()
    except Exception as exc:
        logger.exception("Unexpected failure executing ResumeAnalysisRun %s: %s", run_id, exc)
        db.rollback()
        try:
            run = db.get(ResumeAnalysisRun, run_id)
            if run and run.status != ResumeAnalysisStatus.COMPLETED:
                _mark_run_failed(
                    db,
                    run,
                    failure_code="analysis_error",
                    failure_detail=str(exc),
                )
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
    def start_run(
        db: Session,
        *,
        resume: Resume,
        initiated_by_user_id: UUID,
    ) -> ResumeAnalysisRun:
        active = ResumeAnalysisService.get_active_run(db, resume_id=resume.id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An analysis run ({active.id}) is already {active.status.value} for this resume.",
            )

        run = ResumeAnalysisRun(
            resume_id=resume.id,
            initiated_by_user_id=initiated_by_user_id,
            status=ResumeAnalysisStatus.QUEUED,
            current_stage=STAGE_QUEUED,
            attempt_number=1,
        )
        db.add(run)
        db.commit()
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

        active = ResumeAnalysisService.get_active_run(db, resume_id=resume.id)
        if active is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An analysis run ({active.id}) is already {active.status.value} for this resume.",
            )

        run = ResumeAnalysisRun(
            resume_id=resume.id,
            initiated_by_user_id=initiated_by_user_id,
            retry_of_run_id=previous.id,
            status=ResumeAnalysisStatus.QUEUED,
            current_stage=STAGE_QUEUED,
            attempt_number=previous.attempt_number + 1,
        )
        db.add(run)
        db.commit()
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
                _mark_run_failed(
                    db,
                    run,
                    failure_code="worker_enqueue_failed",
                    failure_detail=f"Failed to enqueue analysis worker: {exc}",
                )
        elif background_tasks is not None:
            background_tasks.add_task(execute_analysis_run, run.id)
        else:
            execute_analysis_run(run.id, db=db)

        db.refresh(run)
        return _to_status_response(run.resume_id, run)
