from __future__ import annotations

import threading
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_recruiter_profile
from app.db.session import get_db
from app.models.entities import Job, RecruiterProfile, User
from app.models.enums import JobStatus, UserRole
from app.schemas.jobs import BatchReevaluationResponse, JobCreate, JobResponse, JobUpdate
from app.services.audit import record_audit_event
from app.services.jobs import JobService

_ACTIVE_JOB_REEVALUATIONS: set[UUID] = set()
_REEVALUATION_LOCK = threading.Lock()

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
def list_jobs(
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> list[JobResponse]:
    from sqlalchemy import func
    from app.models.entities import Application

    jobs = (
        db.query(Job)
        .options(selectinload(Job.skills))
        .filter(Job.recruiter_id == recruiter.id)
        .order_by(Job.created_at.desc())
        .all()
    )

    # Batch-fetch application counts for all jobs in a single query
    if jobs:
        job_ids = [j.id for j in jobs]
        counts_q = (
            db.query(Application.job_id, func.count(Application.id).label("cnt"))
            .filter(Application.job_id.in_(job_ids))
            .group_by(Application.job_id)
            .all()
        )
        count_map = {row.job_id: row.cnt for row in counts_q}
    else:
        count_map = {}

    return [JobService.response(job, applicant_count=count_map.get(job.id, 0)) for job in jobs]


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    request: Request,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = JobService.create(db, recruiter, payload)
    db.flush()
    record_audit_event(
        db,
        action="job_created",
        resource_type="job",
        actor_user_id=recruiter.user_id,
        resource_id=job.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    db.refresh(job)
    return JobService.response(job)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = (
        db.query(Job)
        .options(selectinload(Job.skills))
        .filter(Job.id == job_id)
        .one_or_none()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requirement not found.")

    if current_user.role == UserRole.RECRUITER:
        recruiter = current_user.recruiter_profile
        is_owner = recruiter is not None and job.recruiter_id == recruiter.id
        if not is_owner:
            # Another recruiter cannot inspect other recruiters' drafts or internal evaluation weights
            if job.status != JobStatus.OPEN:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requirement not found.")
            return JobService.response(job, hide_internal_weights=True)
        return JobService.response(job)
    elif current_user.role == UserRole.CANDIDATE:
        # Candidates can only access published/OPEN jobs, with internal weights hidden
        if job.status != JobStatus.OPEN:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requirement not found.")
        return JobService.response(job, hide_internal_weights=True)

    return JobService.response(job)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    payload: JobUpdate,
    request: Request,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)
    JobService.update(job, payload)
    record_audit_event(
        db,
        action="job_updated",
        resource_type="job",
        actor_user_id=recruiter.user_id,
        resource_id=job.id,
        request_id=getattr(request.state, "request_id", None),
    )
    # A later evaluation service will enqueue a new immutable evaluation run
    # whenever this mutation affects requirements or scoring configuration.
    db.commit()
    db.refresh(job)
    return JobService.response(job)


@router.get("/public/open", response_model=list[JobResponse])
def list_public_open_jobs(db: Session = Depends(get_db)) -> list[JobResponse]:
    """Public/candidate directory of currently open jobs."""
    jobs = (
        db.query(Job)
        .options(selectinload(Job.skills))
        .filter(Job.status == JobStatus.OPEN)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [JobService.response(job, hide_internal_weights=True) for job in jobs]


@router.post("/{job_id}/re-evaluate", response_model=BatchReevaluationResponse)
def reevaluate_job_applications(
    job_id: UUID,
    request: Request,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> BatchReevaluationResponse:
    """
    Safely re-evaluate all eligible applications for a recruiter's job:
    1. Verifies recruiter ownership.
    2. Atomically selects applications (up to bounded limit 100).
    3. Handles each candidate in an isolated savepoint so one failure does not abort the batch.
    4. Persists failure records independently if an evaluation fails.
    5. Returns accurate counts and per-application outcomes without leaking internal exception traces.
    """
    from datetime import UTC, datetime
    from app.models.entities import Application, EvaluationRun, Resume
    from app.models.enums import EvaluationStatus, ProcessingStatus
    from app.schemas.jobs import ApplicationReevaluationItem, BatchReevaluationResponse
    from app.services.evaluation import EvaluationService, compute_evaluation_fingerprint
    from app.services.scoring import Weights

    with _REEVALUATION_LOCK:
        if job_id in _ACTIVE_JOB_REEVALUATIONS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A batch re-evaluation for this job is already in progress.",
            )
        _ACTIVE_JOB_REEVALUATIONS.add(job_id)

    try:
        try:
            job = (
                db.query(Job)
                .options(selectinload(Job.skills))
                .filter(Job.id == job_id, Job.recruiter_id == recruiter.id)
                .with_for_update(nowait=True)
                .one_or_none()
            )
        except OperationalError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A batch re-evaluation for this job is already in progress.",
            )

        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

        applications = (
            db.query(Application)
            .options(
                selectinload(Application.candidate),
                selectinload(Application.resume),
            )
            .filter(Application.job_id == job_id)
            .order_by(Application.created_at.asc())
            .limit(100)
            .all()
        )

        if not applications:
            return BatchReevaluationResponse(
                job_id=job_id,
                total_applications=0,
                evaluated_count=0,
                skipped_count=0,
                failed_count=0,
                already_fresh_count=0,
                results=[],
            )

        weights = Weights(
            skills=float(job.skills_weight),
            experience=float(job.experience_weight),
            education=float(job.education_weight),
            semantic=float(job.semantic_weight),
        )

        evaluation_service = EvaluationService()
        results: list[ApplicationReevaluationItem] = []
        evaluated_count = 0
        skipped_count = 0
        failed_count = 0
        already_fresh_count = 0

        for app in applications:
            resume = app.resume
            candidate = app.candidate
            if resume is not None:
                db.refresh(resume)
            if candidate is not None:
                db.refresh(candidate)

            # 1. Eligibility Check: Resume must be present and completed
            if not resume or resume.processing_status != ProcessingStatus.COMPLETED or not resume.extracted_text:
                skipped_count += 1
                results.append(
                    ApplicationReevaluationItem(
                        application_id=app.id,
                        candidate_id=candidate.id if candidate else app.candidate_id,
                        status="skipped",
                        reason="Resume missing, not processed, or no text extracted",
                    )
                )
                continue

            # 2. Check if currently active evaluation is already fresh
            current_fingerprint = compute_evaluation_fingerprint(
                job=job,
                candidate=candidate,
                resume=resume,
                weights=weights,
                semantic_matcher=evaluation_service.engine.semantic_matcher if hasattr(evaluation_service.engine, "semantic_matcher") else None,
            )

            latest_run = (
                db.query(EvaluationRun)
                .options(selectinload(EvaluationRun.match_result))
                .filter(EvaluationRun.application_id == app.id)
                .order_by(
                    EvaluationRun.created_at.desc(),
                    EvaluationRun.completed_at.desc(),
                    EvaluationRun.id.desc(),
                )
                .first()
            )

            # Concurrency guard: if an evaluation is currently pending/running, skip to prevent double-execution
            if latest_run and latest_run.status in (EvaluationStatus.QUEUED, EvaluationStatus.RUNNING):
                skipped_count += 1
                results.append(
                    ApplicationReevaluationItem(
                        application_id=app.id,
                        candidate_id=candidate.id,
                        status="skipped",
                        reason="Evaluation already pending or in progress",
                    )
                )
                continue

            is_match = (
                latest_run is not None
                and latest_run.status == EvaluationStatus.COMPLETED
                and latest_run.configuration_hash == current_fingerprint
            )

            if is_match:
                already_fresh_count += 1
                score = latest_run.match_result.overall_score if latest_run.match_result else None
                results.append(
                    ApplicationReevaluationItem(
                        application_id=app.id,
                        candidate_id=candidate.id,
                        status="already_fresh",
                        score=score,
                        reason="Evaluation already matches current configuration",
                    )
                )
                continue

            # 3. Isolated Evaluation Execution
            try:
                with db.begin_nested():
                    run = evaluation_service.evaluate_application(
                        db,
                        application_id=app.id,
                        recruiter_id=recruiter.id,
                        commit=False,
                    )
                db.flush()
                score = run.match_result.overall_score if run.match_result else None
                evaluated_count += 1
                results.append(
                    ApplicationReevaluationItem(
                        application_id=app.id,
                        candidate_id=candidate.id,
                        status="evaluated",
                        score=score,
                    )
                )
            except Exception:
                # Per-candidate failure isolation: rollback inner savepoint and record failure run
                failed_count += 1
                try:
                    now_dt = datetime.now(UTC)
                    failed_run = EvaluationRun(
                        application_id=app.id,
                        status=EvaluationStatus.FAILED,
                        scoring_version="deterministic-v2-taxonomy",
                        weights_used={
                            "skills": job.skills_weight,
                            "experience": job.experience_weight,
                            "education": job.education_weight,
                            "semantic": job.semantic_weight,
                        },
                        configuration_hash=None,
                        created_at=now_dt,
                        completed_at=now_dt,
                    )
                    db.add(failed_run)
                    db.flush()
                except Exception:
                    pass

                results.append(
                    ApplicationReevaluationItem(
                        application_id=app.id,
                        candidate_id=candidate.id,
                        status="failed",
                        reason="Evaluation failed during processing",
                    )
                )

        record_audit_event(
            db,
            action="job_applications_reevaluated",
            resource_type="job",
            actor_user_id=recruiter.user_id,
            resource_id=job.id,
            request_id=getattr(request.state, "request_id", None),
            metadata={
                "total": len(applications),
                "evaluated": evaluated_count,
                "failed": failed_count,
                "skipped": skipped_count,
                "already_fresh": already_fresh_count,
            },
        )
        db.commit()

        return BatchReevaluationResponse(
            job_id=job_id,
            total_applications=len(applications),
            evaluated_count=evaluated_count,
            skipped_count=skipped_count,
            failed_count=failed_count,
            already_fresh_count=already_fresh_count,
            results=results,
        )
    finally:
        with _REEVALUATION_LOCK:
            _ACTIVE_JOB_REEVALUATIONS.discard(job_id)


