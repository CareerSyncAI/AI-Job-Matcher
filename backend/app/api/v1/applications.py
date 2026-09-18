from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_recruiter_profile, require_roles
from app.db.session import get_db
from app.models.entities import (
    Application,
    CandidateProfile,
    Job,
    RecruiterNote,
    RecruiterProfile,
    Resume,
    User,
)
from app.models.enums import JobStatus, UserRole
from app.schemas.applications import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    RecruiterNoteCreate,
    RecruiterNoteResponse,
)
from app.schemas.resumes import ResumeResponse
from app.schemas.evaluations import CandidateCardDTO, EvaluationRunSchema
from app.services.audit import record_audit_event
from app.services.evaluation import EvaluationService
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
@router.get("/applications/me", response_model=list[ApplicationResponse])
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


@router.get("/jobs/{job_id}/candidates", response_model=list[CandidateCardDTO])
def list_job_candidates(
    job_id: UUID,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> list[CandidateCardDTO]:
    """Get candidate application cards for a job, ranked by deterministic score."""
    JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)
    applications = (
        db.query(Application)
        .options(
            selectinload(Application.job).selectinload(Job.skills),
            selectinload(Application.candidate),
            selectinload(Application.resume),
        )
        .filter(Application.job_id == job_id)
        .all()
    )
    cards = [
        EvaluationService.get_candidate_card(db, application=app, recruiter_id=recruiter.id)
        for app in applications
    ]
    # Sort by match score descending
    cards.sort(key=lambda c: c.matchScore, reverse=True)
    return cards


@router.get("/jobs/{job_id}/candidates/{candidate_id}", response_model=CandidateCardDTO)
def get_job_candidate_detail(
    job_id: UUID,
    candidate_id: UUID,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> CandidateCardDTO:
    """Get single candidate evaluation details and evidence for a job."""
    JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)
    application = (
        db.query(Application)
        .options(
            selectinload(Application.job).selectinload(Job.skills),
            selectinload(Application.candidate),
            selectinload(Application.resume),
        )
        .filter(Application.job_id == job_id, Application.candidate_id == candidate_id)
        .one_or_none()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate application not found.")
    return EvaluationService.get_candidate_card(db, application=application, recruiter_id=recruiter.id)


@router.post("/applications/{application_id}/evaluate", response_model=EvaluationRunSchema)
def evaluate_candidate_application(
    application_id: UUID,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> EvaluationRun:
    """Run deterministic evaluation engine on application, producing EvaluationRun and MatchResult."""
    service = EvaluationService()
    run = service.evaluate_application(db, application_id=application_id, recruiter_id=recruiter.id)
    return run
