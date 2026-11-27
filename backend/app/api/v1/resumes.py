import asyncio
import logging
import re
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_recruiter_profile
from app.core.config import get_settings
from app.core.logging import mask_email
from app.db.session import SessionLocal, get_db
from app.models.entities import Application, CandidateProfile, Job, RecruiterProfile, Resume, User
from app.models.enums import ApplicationStatus, AttentionReason, ProcessingStatus, UserRole
from app.schemas.resumes import (
    AnalyzeTextPayload,
    ATSAnalysisSchema,
    ResumeAnalysisStatusResponse,
    ResumeResponse,
)
from app.services.application_status import record_application_status_change
from app.services.ats_analyzer import ats_analyzer
from app.services.audit import record_audit_event
from app.services.education_extractor import extract_education_from_text
from app.services.evaluation import EvaluationService
from app.services.experience_extractor import extract_experience_years_from_text
from app.services.jobs import JobService
from app.services.resume_analysis import ResumeAnalysisService, build_ats_analysis_schema
from app.services.resumes import ResumeService
from app.services.text_extraction import (
    DocumentSecurityError,
    ScannedDocumentError,
    extract_text_from_file,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs/{job_id}/resumes", tags=["resume-ingestion"])

DISALLOWED_NAME_WORDS: frozenset[str] = frozenset({
    # Section headers and document labels
    "resume", "cv", "curriculum", "vitae", "contact", "info", "information",
    "summary", "profile", "overview", "objective", "career", "professional",
    "executive", "experience", "employment", "history", "work", "education",
    "academic", "skills", "technical", "competencies", "qualifications",
    "projects", "certifications", "certificates", "awards", "honors",
    "achievements", "publications", "patents", "languages", "interests",
    "activities", "volunteer", "references", "page", "confidential",
    "portfolio", "github", "linkedin", "website", "email", "phone",
    "address", "location", "city", "state", "country", "street",
    # Roles & Job Titles
    "software", "engineer", "engineering", "developer", "development",
    "programmer", "coder", "architect", "architecture", "designer",
    "design", "manager", "management", "director", "lead", "leader",
    "leadership", "specialist", "consultant", "analyst", "analytics",
    "scientist", "science", "administrator", "admin", "coordinator",
    "officer", "associate", "intern", "internship",
    "student", "fresher", "graduate", "undergraduate", "candidate",
    "applicant", "frontend", "front-end", "backend", "back-end",
    "fullstack", "full-stack", "full", "stack", "devops", "cloud",
    "data", "mobile", "ios", "android", "web", "qa", "quality",
    "assurance", "tester", "testing", "security", "infosec",
    "system", "systems", "network", "database", "scrum", "master",
    "product", "project", "program", "solutions", "operations",
    "support", "technician", "representative",
    # Modifiers & generic terms
    "senior", "junior", "principal", "staff", "chief", "head",
    "entry", "level", "mid", "experienced", "certified", "licensed",
    "department", "division", "team", "group", "company", "corporation",
    "inc", "llc", "ltd", "university", "college", "school", "institute",
})


def _format_name_word(w: str) -> str:
    """Format an individual name component preserving casing like O'Connor or Jean-Luc."""
    if "-" in w:
        return "-".join(_format_name_word(p) for p in w.split("-"))
    if "'" in w:
        return "'".join(_format_name_word(p) for p in w.split("'"))
    if w.isupper():
        return w.capitalize()
    return w[:1].upper() + w[1:]


def _extract_name_from_filename(filename: str) -> str:
    """Extract a plausible candidate name from filename, falling back to 'Applicant' conservatively."""
    if not filename:
        return "Applicant"
    stem = Path(filename).stem
    cleaned = re.sub(r"[_\-\.]+", " ", stem)
    cleaned = re.sub(
        r"\b(v\d+|\d+|resume|cv|curriculum|vitae|final|new|updated|latest|draft|copy|scan|doc|docx|pdf|upload|file)\b",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    words = [w for w in cleaned.split() if w]

    # Filter out disallowed tokens, numbers, and short noise
    filtered = [
        w for w in words
        if w.lower() not in DISALLOWED_NAME_WORDS
        and re.match(r"^[A-Za-z']+$", w)
        and len(w) >= 2
    ]

    # Require 2 to 3 valid name parts for a plausible filename-derived identity
    if 2 <= len(filtered) <= 3:
        candidate_name = " ".join(_format_name_word(w) for w in filtered)
        if 3 <= len(candidate_name) <= 35:
            return candidate_name

    return "Applicant"


def _extract_name_from_resume_text(text: str, fallback_filename: str) -> str:
    """Extract candidate name from header of resume text, falling back to filename conservatively."""
    if text:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        for line in lines[:8]:
            # Skip contact and reference metadata lines
            if "@" in line or "http" in line or "www." in line or re.search(r"\+?\d[\d\s\-()]{7,}", line):
                continue

            cleaned_line = line
            # Handle explicit label markers like "Name: Jane Doe" or "Applicant Name: John Smith"
            labeled_match = re.match(
                r"^(?:name|candidate(?:\s+name)?|applicant(?:\s+name)?)\s*[:\-]\s*(.+)$",
                line,
                re.IGNORECASE,
            )
            if labeled_match:
                cleaned_line = labeled_match.group(1).strip()
            else:
                resume_of_match = re.match(
                    r"^(?:resume|curriculum\s+vitae|cv)\s+(?:of\s+)?(.+)$",
                    line,
                    re.IGNORECASE,
                )
                if resume_of_match:
                    cleaned_line = resume_of_match.group(1).strip()

            line_lower = cleaned_line.lower().strip(" :-\t")
            if any(line_lower.startswith(h) for h in [
                "resume", "curriculum vitae", "cv", "contact", "summary", "profile",
                "experience", "education", "skills", "objective", "projects", "certifications",
                "professional summary", "technical skills", "work experience",
            ]):
                continue

            words = cleaned_line.split()
            # Plausible candidate name: 2 to 4 words
            if 2 <= len(words) <= 4:
                if all(re.match(r"^[A-Za-z.\-']+$", w) for w in words):
                    # Verify no component matches a disallowed section or title word
                    clean_words = [re.sub(r"[.\-']", "", w).lower() for w in words]
                    if any(w in DISALLOWED_NAME_WORDS for w in clean_words):
                        continue
                    candidate_name = " ".join(_format_name_word(w) for w in words)
                    if 3 <= len(candidate_name) <= 40:
                        return candidate_name

    return _extract_name_from_filename(fallback_filename)


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

    display_name = _extract_name_from_resume_text(extracted_text, filename)
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
    JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)

    # Step 1: Validate, deduplicate, and store the file
    resume = None
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
        if resume and getattr(resume, "storage_key", None):
            ResumeService.delete_storage_key(resume.storage_key, db=db)
        raise

    assert resume is not None

    # Step 2: Dispatch processing after successful transaction commit
    if settings.enable_worker:
        ResumeService.enqueue_worker(resume.id, db=db)
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

        from app.services.storage import StoragePathError, resolve_safe_storage_path

        try:
            file_path = resolve_safe_storage_path(
                resume.storage_key,
                upload_directory=settings.upload_directory,
                require_file=True,
            )
        except (StoragePathError, FileNotFoundError) as path_err:
            logger.error(
                "Resume file invalid/missing on disk for resume %s (storage_key: %s): %s",
                resume.id,
                resume.storage_key,
                path_err,
            )
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.FILE_CORRUPTED
            db.commit()
            return

        try:
            extracted_text = extract_text_from_file(file_path, resume.mime_type, raise_security_exceptions=True)
        except ScannedDocumentError as scan_err:
            logger.warning("Resume %s rejected as scanned image document: %s", resume.id, scan_err)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.SCANNED_DOCUMENT
            resume.extracted_text = ""
            db.commit()
            return
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
            record_application_status_change(
                db,
                application,
                from_status=None,
                to_status=application.status,
                changed_by_user_id=None,
            )
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
            from app.core.config import get_settings
            from app.services.storage import resolve_safe_storage_path
            from app.services.text_extraction import extract_text_from_file

            settings = get_settings()
            file_path = resolve_safe_storage_path(
                resume.storage_key,
                upload_directory=settings.upload_directory,
                require_file=True,
            )
            extracted = extract_text_from_file(file_path, resume.mime_type)
            if extracted and extracted.strip():
                text = extracted
                resume.extracted_text = extracted
                db.commit()
        except Exception:
            pass

    res = ats_analyzer.analyze(text)
    return build_ats_analysis_schema(res)


@download_router.post("/analyze-text-ats", response_model=ATSAnalysisSchema)
def analyze_text_ats(
    payload: AnalyzeTextPayload,
    current_user: User = Depends(get_current_user),
) -> ATSAnalysisSchema:
    """Instant ATS quality inspection for raw resume text in Resume Studio."""
    res = ats_analyzer.analyze(payload.text)
    return build_ats_analysis_schema(res)


def _get_authorized_resume(resume_id: UUID, current_user: User, db: Session) -> Resume:
    resume = db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    verify_resume_access(resume, current_user, db)
    return resume


@download_router.post(
    "/{resume_id}/analysis",
    response_model=ResumeAnalysisStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def start_resume_analysis(
    resume_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeAnalysisStatusResponse:
    """Explicitly start an asynchronous resume analysis run."""
    resume = _get_authorized_resume(resume_id, current_user, db)
    run = ResumeAnalysisService.start_run(
        db,
        resume=resume,
        initiated_by_user_id=current_user.id,
    )
    record_audit_event(
        db,
        action="resume_analysis_started",
        resource_type="resume_analysis_run",
        actor_user_id=current_user.id,
        resource_id=run.id,
        request_id=getattr(request.state, "request_id", None),
        metadata={"resume_id": str(resume_id), "attempt_number": run.attempt_number},
    )
    db.commit()
    return ResumeAnalysisService.dispatch(run, db=db, background_tasks=background_tasks)


@download_router.get("/{resume_id}/analysis", response_model=ResumeAnalysisStatusResponse)
def get_latest_resume_analysis(
    resume_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeAnalysisStatusResponse:
    """Get the latest resume analysis run status (or 'ready' if none started yet)."""
    _get_authorized_resume(resume_id, current_user, db)
    return ResumeAnalysisService.get_latest_status(db, resume_id=resume_id)


@download_router.get("/{resume_id}/analysis/{run_id}", response_model=ResumeAnalysisStatusResponse)
def get_resume_analysis_run(
    resume_id: UUID,
    run_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeAnalysisStatusResponse:
    """Poll a specific resume analysis run by ID."""
    _get_authorized_resume(resume_id, current_user, db)
    return ResumeAnalysisService.get_run_status(db, resume_id=resume_id, run_id=run_id)


@download_router.post(
    "/{resume_id}/analysis/{run_id}/retry",
    response_model=ResumeAnalysisStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_resume_analysis_run(
    resume_id: UUID,
    run_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeAnalysisStatusResponse:
    """Retry a failed resume analysis run."""
    resume = _get_authorized_resume(resume_id, current_user, db)
    run = ResumeAnalysisService.retry_run(
        db,
        resume=resume,
        run_id=run_id,
        initiated_by_user_id=current_user.id,
    )
    record_audit_event(
        db,
        action="resume_analysis_retried",
        resource_type="resume_analysis_run",
        actor_user_id=current_user.id,
        resource_id=run.id,
        request_id=getattr(request.state, "request_id", None),
        metadata={
            "resume_id": str(resume_id),
            "retry_of_run_id": str(run_id),
            "attempt_number": run.attempt_number,
        },
    )
    db.commit()
    return ResumeAnalysisService.dispatch(run, db=db, background_tasks=background_tasks)
