import asyncio
import logging
import re
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_recruiter_profile
from app.core.config import get_settings
from app.core.logging import mask_email
from app.db.session import SessionLocal, get_db
from app.models.entities import Application, CandidateProfile, Job, RecruiterProfile, Resume, User
from app.models.enums import ApplicationStatus, AttentionReason, ProcessingStatus, UserRole
from app.schemas.resumes import ATSAnalysisSchema, AnalyzeTextPayload, ResumeResponse
from app.services.ats_analyzer import ats_analyzer
from app.services.audit import record_audit_event
from app.services.education_extractor import extract_education_from_text
from app.services.evaluation import EvaluationService
from app.services.experience_extractor import extract_experience_years_from_text
from app.services.jobs import JobService
from app.services.resumes import ResumeService
from app.services.text_extraction import DocumentSecurityError, extract_text_from_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs/{job_id}/resumes", tags=["resume-ingestion"])


def _extract_name_from_filename(filename: str) -> str:
    """Best-effort candidate name from the resume filename."""
    stem = Path(filename).stem
    name = re.sub(r"[_\-\.]+", " ", stem)
    name = re.sub(r"\b(resume|cv|curriculum|vitae|v\d+|final|new|updated)\b", "", name, flags=re.IGNORECASE)
    name = " ".join(w.capitalize() for w in name.split() if w)
    return name or "Applicant"


def _find_or_create_candidate(
    db: Session,
    *,
    filename: str,
    extracted_text: str,
    job_recruiter_id: UUID | None = None,
) -> CandidateProfile:
    """
    Find existing or create a new CandidateProfile for an uploaded resume.
    Uses email extracted from text if available, guarding against hijacking
    registered user accounts or candidate profiles owned by other recruiters.
    """
    email_match = re.search(
        r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b", extracted_text
    )
    email = email_match.group(0).lower() if email_match else None
    email_for_new_candidate = email

    if email:
        existing = db.query(CandidateProfile).filter(CandidateProfile.email == email).one_or_none()
        if existing:
            # 1. Prevent candidate hijack: do NOT attach to or mutate registered user accounts
            if existing.user_id is not None:
                logger.warning(
                    "Resume email %s belongs to a registered user account (%s); creating dedicated unlinked candidate profile.",
                    mask_email(email),
                    existing.user_id,
                )
                email_for_new_candidate = None  # Don't violate unique constraint
            # 2. Check if candidate belongs to another recruiter
            elif job_recruiter_id is not None:
                other_recruiter_app = (
                    db.query(Application)
                    .join(Job, Application.job_id == Job.id)
                    .filter(Application.candidate_id == existing.id, Job.recruiter_id != job_recruiter_id)
                    .first()
                )
                if other_recruiter_app is not None:
                    logger.warning(
                        "Candidate profile %s belongs to another recruiter; creating dedicated profile for recruiter %s.",
                        existing.id,
                        job_recruiter_id,
                    )
                    email_for_new_candidate = None
                else:
                    return existing
            else:
                return existing

    display_name = _extract_name_from_filename(filename)
    edu_records = extract_education_from_text(extracted_text) if extracted_text else []
    highest_degree = edu_records[0].get("degree_level") if edu_records else None
    exp_years = extract_experience_years_from_text(extracted_text) if extracted_text else None

    candidate = CandidateProfile(
        email=email_for_new_candidate,
        name=display_name,
        headline="Candidate",
        education={"degree": highest_degree, "skills": []} if highest_degree else {"skills": []},
        total_experience_years=exp_years,
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

    Full pipeline:
    1. Validate + store file
    2. Extract text (PDF/DOCX)
    3. Find or create CandidateProfile (anti-hijack guarded)
    4. Create Application (deduplicated)
    5. Run DeterministicEvaluationEngine → MatchResult
    6. Return ResumeResponse
    """
    settings = get_settings()
    job = JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)

    # Step 1: Validate, deduplicate, and store the file
    try:
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
    except Exception:
        db.rollback()
        if "resume" in locals() and resume and getattr(resume, "storage_key", None):
            ResumeService.delete_storage_key(resume.storage_key, db=db)
        raise

    # Step 2: Dispatch processing after successful transaction commit
    if settings.enable_worker:
        ResumeService.enqueue_worker(resume.id)
    else:
        timeout_sec = settings.resume_extraction_timeout_seconds
        try:
            await asyncio.wait_for(
                asyncio.to_thread(_process_resume_inline, resume.id, job_id),
                timeout=timeout_sec,
            )
        except TimeoutError:
            logger.warning(
                "Inline resume processing reached request timeout of %ss for resume %s",
                timeout_sec,
                resume.id,
            )
            db.refresh(resume)
            if resume.processing_status != ProcessingStatus.COMPLETED:
                resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
                resume.needs_attention_reason = AttentionReason.PARSE_FAILED
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


def _process_resume_inline(resume_id: UUID, job_id: UUID) -> None:
    """
    Synchronously run the full pipeline for a resume in a dedicated worker-thread DB session:
    parse → candidate → application → evaluation.
    Fails loudly without faking defaults or completing failed parses.
    """
    settings = get_settings()
    db = SessionLocal()
    try:
        resume = db.get(Resume, resume_id)
        if not resume:
            logger.error("Resume %s not found for inline processing", resume_id)
            return

        if resume.processing_status == ProcessingStatus.NEEDS_ATTENTION:
            logger.warning(
                "Resume %s is already marked %s; aborting inline processing.",
                resume_id,
                resume.processing_status,
            )
            return

        resume.processing_status = ProcessingStatus.PROCESSING
        db.commit()

        root = settings.upload_directory.expanduser().resolve()
        file_path = (root / resume.storage_key).resolve()

        if not file_path.exists():
            logger.error("Resume file missing on disk for resume %s (storage_key: %s)", resume.id, resume.storage_key)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.FILE_CORRUPTED
            db.commit()
            return

        try:
            extracted_text = extract_text_from_file(file_path, resume.mime_type, raise_security_exceptions=True)
        except DocumentSecurityError as sec_err:
            logger.warning("Resume %s rejected by document security policy: %s", resume.id, sec_err)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.PARSE_FAILED
            resume.extracted_text = ""
            db.commit()
            return

        if not extracted_text or not extracted_text.strip():
            logger.warning("No text extracted from resume %s - failing loudly.", resume.id)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.PARSE_FAILED
            resume.extracted_text = ""
            db.commit()
            return

        resume.extracted_text = extracted_text
        resume.parser_method = "inline-sync-v2-taxonomy"

        job = db.get(Job, job_id)
        if not job:
            logger.error("Job %s not found for resume %s", job_id, resume.id)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.ANALYSIS_FAILED
            db.commit()
            return

        # Find or create CandidateProfile (scoped to recruiter)
        candidate = _find_or_create_candidate(
            db,
            filename=resume.original_filename,
            extracted_text=extracted_text,
            job_recruiter_id=job.recruiter_id,
        )
        resume.candidate_id = candidate.id

        # Create or find Application
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
            application.resume_id = resume.id
            db.flush()

        # Run evaluation engine
        try:
            evaluation_service = EvaluationService()
            evaluation_service.evaluate_application(
                db,
                application_id=application.id,
                recruiter_id=job.recruiter_id,
            )
            # Re-check status in case timeout handler or external cancellation marked it
            db.refresh(resume)
            if resume.processing_status == ProcessingStatus.NEEDS_ATTENTION:
                logger.warning(
                    "Resume %s was already marked %s; aborting completion commit.",
                    resume.id,
                    resume.processing_status,
                )
                db.rollback()
                return
            resume.processing_status = ProcessingStatus.COMPLETED
            resume.needs_attention_reason = None
        except Exception as eval_exc:
            logger.error("Evaluation failed for application %s: %s", application.id, eval_exc)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.ANALYSIS_FAILED

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Inline resume processing error for %s: %s", resume_id, exc)
        try:
            resume = db.get(Resume, resume_id)
            if resume and resume.processing_status != ProcessingStatus.NEEDS_ATTENTION:
                resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
                resume.needs_attention_reason = AttentionReason.ANALYSIS_FAILED
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ── Download / ATS Analyzer endpoints ───────────────────────────────────────

download_router = APIRouter(prefix="/resumes", tags=["resumes"])


def verify_resume_access(resume: Resume, current_user: User, db: Session) -> None:
    """Enforces strict candidate and recruiter ownership boundaries on resume resources."""
    if current_user.role == UserRole.ADMIN:
        return

    if current_user.role == UserRole.CANDIDATE:
        cand_profile = current_user.candidate_profile
        if not cand_profile or resume.candidate_id != cand_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this resume.")
        return

    if current_user.role == UserRole.RECRUITER:
        recruiter_profile = current_user.recruiter_profile
        if not recruiter_profile:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter profile required.")

        # Check if resume was uploaded directly to a job owned by this recruiter
        if resume.ingestion_job_id is not None:
            job = resume.ingestion_job or db.get(Job, resume.ingestion_job_id)
            if job and job.recruiter_id == recruiter_profile.id:
                return

        # Or check if resume is attached to an application for a job owned by this recruiter
        from app.models.entities import Application, Job
        app_exists = (
            db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(Application.resume_id == resume.id, Job.recruiter_id == recruiter_profile.id)
            .first()
        )
        if app_exists is not None:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own the job or application associated with this resume.",
        )

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@download_router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    resume = db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    verify_resume_access(resume, current_user, db)

    return ResumeResponse(
        id=resume.id,
        mime_type=resume.mime_type,
        byte_size=resume.byte_size,
        processing_status=resume.processing_status,
        needs_attention_reason=resume.needs_attention_reason,
        uploaded_at=resume.created_at,
    )


@download_router.get("/{resume_id}/ats", response_model=ATSAnalysisSchema)
def analyze_stored_resume_ats(
    resume_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ATSAnalysisSchema:
    """Run standalone ATS quality analysis on an authorized stored resume."""
    resume = db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    verify_resume_access(resume, current_user, db)

    text = resume.extracted_text or ""
    if not text.strip() and resume.storage_key:
        try:
            from app.services.text_extraction import extract_text_from_file
            from app.core.config import get_settings
            settings = get_settings()
            root = settings.upload_directory.expanduser().resolve()
            file_path = (root / resume.storage_key).resolve()
            if file_path.exists():
                extracted = extract_text_from_file(file_path, resume.mime_type)
                if extracted and extracted.strip():
                    text = extracted
                    resume.extracted_text = extracted
                    db.commit()
        except Exception:
            pass

    res = ats_analyzer.analyze(text)
    return ATSAnalysisSchema(
        overall_ats_score=res.overall_ats_score,
        grade=res.grade,
        section_score=res.section_score,
        contact_score=res.contact_score,
        impact_score=res.impact_score,
        formatting_score=res.formatting_score,
        skills_score=res.skills_score,
        detected_sections=res.detected_sections,
        detected_skills=res.detected_skills,
        missing_critical_sections=res.missing_critical_sections,
        contact_details=res.contact_details,
        action_verbs_found=res.action_verbs_found,
        quantifiable_metrics_count=res.quantifiable_metrics_count,
        word_count=res.word_count,
        strengths=res.strengths,
        issues=[
            {
                "category": i.category,
                "severity": i.severity,
                "issue": i.issue,
                "recommendation": i.recommendation,
            }
            for i in res.issues
        ],
    )


@download_router.post("/analyze-text-ats", response_model=ATSAnalysisSchema)
def analyze_text_ats(
    payload: AnalyzeTextPayload,
    current_user: User = Depends(get_current_user),
) -> ATSAnalysisSchema:
    """Instant ATS quality inspection for raw resume text in Resume Studio."""
    res = ats_analyzer.analyze(payload.text)
    return ATSAnalysisSchema(
        overall_ats_score=res.overall_ats_score,
        grade=res.grade,
        section_score=res.section_score,
        contact_score=res.contact_score,
        impact_score=res.impact_score,
        formatting_score=res.formatting_score,
        skills_score=res.skills_score,
        detected_sections=res.detected_sections,
        detected_skills=res.detected_skills,
        missing_critical_sections=res.missing_critical_sections,
        contact_details=res.contact_details,
        action_verbs_found=res.action_verbs_found,
        quantifiable_metrics_count=res.quantifiable_metrics_count,
        word_count=res.word_count,
        strengths=res.strengths,
        issues=[
            {
                "category": i.category,
                "severity": i.severity,
                "issue": i.issue,
                "recommendation": i.recommendation,
            }
            for i in res.issues
        ],
    )
