from __future__ import annotations

import logging
import re
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_recruiter_profile
from app.core.config import get_settings
from app.db.session import get_db
from app.models.entities import Application, CandidateProfile, RecruiterProfile, Resume, User
from app.models.enums import ApplicationStatus, AttentionReason, ProcessingStatus, UserRole
from app.schemas.resumes import ResumeResponse
from app.services.audit import record_audit_event
from app.services.evaluation import EvaluationService
from app.services.jobs import JobService
from app.services.resumes import ResumeService
from app.services.text_extraction import extract_text_from_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs/{job_id}/resumes", tags=["resume-ingestion"])


def _extract_name_from_filename(filename: str) -> str:
    """Best-effort candidate name from the resume filename."""
    stem = Path(filename).stem
    # Replace common separators with spaces, strip version markers
    name = re.sub(r"[_\-\.]+", " ", stem)
    name = re.sub(r"\b(resume|cv|curriculum|vitae|v\d+|final|new|updated)\b", "", name, flags=re.IGNORECASE)
    name = " ".join(w.capitalize() for w in name.split() if w)
    return name or "Applicant"


def _find_or_create_candidate(db: Session, *, filename: str, extracted_text: str) -> CandidateProfile:
    """
    Find existing or create a new CandidateProfile for an uploaded resume.
    Uses email extracted from text if available, otherwise creates a placeholder.
    """
    # Simple email extraction from resume text
    email_match = re.search(
        r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b", extracted_text
    )
    email = email_match.group(0).lower() if email_match else None

    # Deduplicate by email if found
    if email:
        existing = db.query(CandidateProfile).filter(CandidateProfile.email == email).one_or_none()
        if existing:
            return existing

    # Build display name from filename
    display_name = _extract_name_from_filename(filename)

    candidate = CandidateProfile(
        email=email,
        name=display_name,
        headline="Candidate",
        education={"degree": "Bachelor", "skills": []},
        total_experience_years=0.0,
    )
    db.add(candidate)
    db.flush()
    return candidate


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_resume(
    job_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    """
    Upload and synchronously process a resume for a job.

    Full pipeline (synchronous when ENABLE_WORKER=false):
    1. Validate + store file
    2. Extract text (PDF/DOCX)
    3. Find or create CandidateProfile
    4. Create Application (deduplicated)
    5. Run DeterministicEvaluationEngine → MatchResult
    6. Return ResumeResponse
    """
    settings = get_settings()
    job = JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)

    # Step 1: Validate, deduplicate, and store the file
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

    # Step 2: Synchronous processing (only when Celery worker is disabled)
    if not settings.enable_worker:
        _process_resume_inline(db, resume=resume, job_id=job_id, settings=settings)

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


def _process_resume_inline(db: Session, *, resume: Resume, job_id: UUID, settings) -> None:
    """
    Synchronously run the full pipeline for a resume:
    parse → candidate → application → evaluation.
    Updates resume status in-place.
    """
    try:
        resume.processing_status = ProcessingStatus.PROCESSING

        # --- Step 2a: Extract text ---
        root = settings.upload_directory.expanduser().resolve()
        file_path = (root / resume.storage_key).resolve()

        if not file_path.exists():
            logger.error("Resume file missing on disk: %s", file_path)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.FILE_CORRUPTED
            return

        extracted_text = extract_text_from_file(file_path, resume.mime_type)

        if not extracted_text.strip():
            logger.warning("No text extracted from resume %s", resume.id)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.PARSE_FAILED
            # Still continue to create candidate + application with empty text
            extracted_text = ""

        resume.extracted_text = extracted_text
        resume.parser_method = "inline-sync-v1"

        # --- Step 2b: Find or create CandidateProfile ---
        candidate = _find_or_create_candidate(
            db,
            filename=resume.original_filename,
            extracted_text=extracted_text,
        )
        resume.candidate_id = candidate.id

        # --- Step 2c: Create or find Application ---
        existing_app = (
            db.query(Application)
            .filter(
                Application.job_id == job_id,
                Application.candidate_id == candidate.id,
            )
            .one_or_none()
        )

        if existing_app is None:
            application = Application(
                job_id=job_id,
                candidate_id=candidate.id,
                resume_id=resume.id,
                status=ApplicationStatus.NEW,
            )
            db.add(application)
            db.flush()
        else:
            application = existing_app
            # Update resume reference to the latest
            application.resume_id = resume.id
            db.flush()

        # --- Step 2d: Run evaluation engine ---
        try:
            from app.models.entities import Job
            from app.services.scoring import Weights
            from app.services.evaluation import DeterministicEvaluationEngine, EvaluationService

            evaluation_service = EvaluationService()
            evaluation_service.evaluate_application(
                db,
                application_id=application.id,
                recruiter_id=_get_job_recruiter_id(db, job_id),
            )
        except Exception as eval_exc:
            logger.warning("Evaluation failed for application %s: %s", application.id, eval_exc)
            # Non-fatal: resume still ingested successfully

        # --- Mark complete ---
        if extracted_text.strip():
            resume.processing_status = ProcessingStatus.COMPLETED
            resume.needs_attention_reason = None
        else:
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.PARTIAL_EXTRACTION

    except Exception as exc:
        logger.exception("Inline resume processing error for %s: %s", resume.id, exc)
        resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
        resume.needs_attention_reason = AttentionReason.ANALYSIS_FAILED


def _get_job_recruiter_id(db: Session, job_id: UUID) -> UUID:
    """Helper to fetch the recruiter_id for a job."""
    from app.models.entities import Job
    job = db.get(Job, job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")
    return job.recruiter_id


# ── Download / metadata endpoint ────────────────────────────────────────────

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
