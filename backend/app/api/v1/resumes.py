from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_recruiter_profile
from app.db.session import get_db
from app.models.entities import RecruiterProfile, Resume, User
from app.models.enums import UserRole
from app.schemas.resumes import ResumeResponse
from app.services.audit import record_audit_event
from app.services.jobs import JobService
from app.services.resumes import ResumeService

router = APIRouter(prefix="/jobs/{job_id}/resumes", tags=["resume-ingestion"])



@router.post("", response_model=ResumeResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    job_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)
    resume = await ResumeService.ingest_for_job(db, job_id=job_id, upload=file)
    record_audit_event(
        db,
        action="resume_uploaded",
        resource_type="resume",
        actor_user_id=recruiter.user_id,
        resource_id=resume.id,
        request_id=getattr(request.state, "request_id", None),
        metadata={"job_id": str(job_id), "sha256": resume.sha256},
    )
    db.commit()
    db.refresh(resume)
    return ResumeResponse(
        id=resume.id,
        mime_type=resume.mime_type,
        byte_size=resume.byte_size,
        processing_status=resume.processing_status,
        needs_attention_reason=resume.needs_attention_reason,
        uploaded_at=resume.created_at,
    )


download_router = APIRouter(prefix="/resumes", tags=["resumes"])


@download_router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    resume = db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    if current_user.role == UserRole.CANDIDATE:
        if not current_user.candidate_profile or resume.candidate_id != current_user.candidate_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this resume.")
    elif current_user.role == UserRole.RECRUITER:
        if not current_user.recruiter_profile or resume.ingestion_job.recruiter_id != current_user.recruiter_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own the job associated with this resume.")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return ResumeResponse(
        id=resume.id,
        mime_type=resume.mime_type,
        byte_size=resume.byte_size,
        processing_status=resume.processing_status,
        needs_attention_reason=resume.needs_attention_reason,
        uploaded_at=resume.created_at,
    )

