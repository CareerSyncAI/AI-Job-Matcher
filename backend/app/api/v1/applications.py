from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_recruiter_profile, require_roles
from app.db.session import get_db
from app.models.entities import Application, CandidateProfile, Job, RecruiterNote, RecruiterProfile, Resume, User
from app.models.enums import JobStatus, UserRole
from app.schemas.applications import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    RecruiterNoteCreate,
    RecruiterNoteResponse,
)
from app.schemas.resumes import ResumeResponse
from app.services.audit import record_audit_event
from app.services.jobs import JobService
from app.services.resumes import ResumeService

router = APIRouter(tags=["applications"])


def _candidate_for_user(db: Session, user: User) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate profile is unavailable.")
    return profile


def _application_response(application: Application) -> ApplicationResponse:
    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        candidate_id=application.candidate_id,
        resume_id=application.resume_id,
        status=application.status,
        applied_at=application.applied_at,
    )


@router.post("/jobs/{job_id}/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: UUID,
    payload: ApplicationCreate,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    candidate = _candidate_for_user(db, current_user)
    resume = db.get(Resume, payload.resume_id)
    if not resume or resume.candidate_id != candidate.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    job = db.get(Job, job_id)
    if not job or job.status is not JobStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    existing = db.query(Application).filter(Application.job_id == job_id, Application.candidate_id == candidate.id).one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An application already exists for this job.")
    application = Application(job_id=job_id, candidate_id=candidate.id, resume_id=resume.id)
    db.add(application)
    db.flush()
    record_audit_event(
        db,
        action="application_created",
        resource_type="application",
        actor_user_id=current_user.id,
        resource_id=application.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    db.refresh(application)
    return _application_response(application)


@router.post("/profile/resumes", response_model=ResumeResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_profile_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    """Ingest an applicant-owned resume before it is attached to any application."""

    candidate = _candidate_for_user(db, current_user)
    resume = await ResumeService.ingest(db, candidate_id=candidate.id, upload=file)
    record_audit_event(
        db,
        action="candidate_resume_uploaded",
        resource_type="resume",
        actor_user_id=current_user.id,
        resource_id=resume.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    return ResumeResponse(
        id=resume.id,
        mime_type=resume.mime_type,
        byte_size=resume.byte_size,
        processing_status=resume.processing_status,
        needs_attention_reason=resume.needs_attention_reason,
        uploaded_at=resume.created_at,
    )


@router.get("/applications", response_model=list[ApplicationResponse])
def list_my_applications(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)), db: Session = Depends(get_db)
) -> list[ApplicationResponse]:
    candidate = _candidate_for_user(db, current_user)
    applications = (
        db.query(Application).filter(Application.candidate_id == candidate.id).order_by(Application.applied_at.desc()).all()
    )
    return [_application_response(application) for application in applications]


@router.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: UUID,
    payload: ApplicationStatusUpdate,
    request: Request,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    JobService.owned_job(db, job_id=application.job_id, recruiter_id=recruiter.id)
    application.status = payload.status
    record_audit_event(
        db,
        action="application_status_changed",
        resource_type="application",
        actor_user_id=recruiter.user_id,
        resource_id=application.id,
        request_id=getattr(request.state, "request_id", None),
        metadata={"status": payload.status.value},
    )
    db.commit()
    db.refresh(application)
    return _application_response(application)


@router.post("/applications/{application_id}/notes", response_model=RecruiterNoteResponse, status_code=status.HTTP_201_CREATED)
def add_recruiter_note(
    application_id: UUID,
    payload: RecruiterNoteCreate,
    request: Request,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> RecruiterNoteResponse:
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    JobService.owned_job(db, job_id=application.job_id, recruiter_id=recruiter.id)
    note = RecruiterNote(application_id=application.id, recruiter_id=recruiter.id, body=payload.body)
    db.add(note)
    db.flush()
    record_audit_event(
        db,
        action="recruiter_note_created",
        resource_type="application",
        actor_user_id=recruiter.user_id,
        resource_id=application.id,
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    db.refresh(note)
    return RecruiterNoteResponse(id=note.id, application_id=note.application_id, body=note.body, created_at=note.created_at)
