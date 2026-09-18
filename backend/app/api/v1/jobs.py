from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_recruiter_profile
from app.db.session import get_db
from app.models.entities import Job, RecruiterProfile, User
from app.models.enums import JobStatus
from app.schemas.jobs import JobCreate, JobResponse, JobUpdate
from app.services.audit import record_audit_event
from app.services.jobs import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
def list_jobs(
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> list[JobResponse]:
    jobs = (
        db.query(Job)
        .options(selectinload(Job.skills))
        .filter(Job.recruiter_id == recruiter.id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [JobService.response(job) for job in jobs]


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
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requirement not found.")
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
    return [JobService.response(job) for job in jobs]
