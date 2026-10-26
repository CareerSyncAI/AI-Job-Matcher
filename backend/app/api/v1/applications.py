import asyncio
import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_recruiter_profile, require_roles
from app.core.config import get_settings
from app.db.session import SessionLocal, get_db
from app.models.entities import (
    Application,
    CandidateProfile,
    EvaluationRun,
    Job,
    RecruiterNote,
    RecruiterProfile,
    Resume,
    User,
)
from app.models.enums import (
    AttentionReason,
    EvaluationStatus,
    JobStatus,
    ProcessingStatus,
    UserRole,
)
from app.schemas.applications import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    RecruiterNoteCreate,
    RecruiterNoteResponse,
)
from app.schemas.evaluations import CandidateCardDTO, EvaluationRunSchema
from app.schemas.resumes import ResumeResponse
from app.services.audit import record_audit_event
from app.services.education_extractor import extract_education_from_text
from app.services.evaluation import EvaluationService
from app.services.experience_extractor import extract_experience_years_from_text
from app.services.jobs import JobService
from app.services.resumes import ResumeService
from app.services.scoring import CoverageTier
from app.services.taxonomy import taxonomy
from app.services.text_extraction import DocumentSecurityError, extract_text_from_file

logger = logging.getLogger(__name__)

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
    target_resume_id = payload.resume_id
    if not target_resume_id:
        latest_resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == candidate.id)
            .order_by(Resume.created_at.desc())
            .first()
        )
        if not latest_resume:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No resume on file. Please upload a resume before applying.",
            )
        target_resume_id = latest_resume.id

    resume = db.get(Resume, target_resume_id)
    if not resume or resume.candidate_id != candidate.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if resume.processing_status in (ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resume is still being processed. Please wait until processing completes before applying.",
        )
    if resume.processing_status is ProcessingStatus.NEEDS_ATTENTION:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Resume processing failed ({resume.needs_attention_reason.value if resume.needs_attention_reason else 'needs attention'}). Please re-upload a readable resume before applying.",
        )
    job = db.get(Job, job_id)
    if not job or job.status is not JobStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    existing = db.query(Application).filter(Application.job_id == job_id, Application.candidate_id == candidate.id).one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An application already exists for this job.")

    application = Application(job_id=job_id, candidate_id=candidate.id, resume_id=resume.id)
    db.add(application)
    db.flush()

    # Trigger evaluation immediately upon application creation with savepoint protection
    try:
        with db.begin_nested():
            evaluation_service = EvaluationService()
            evaluation_service.evaluate_application(
                db,
                application_id=application.id,
                recruiter_id=job.recruiter_id,
                commit=False,
            )
        db.commit()
    except Exception as eval_exc:
        logger.error("Application auto-evaluation failed for application %s: %s", application.id, eval_exc)
        now_dt = datetime.now(UTC)
        failed_run = EvaluationRun(
            application_id=application.id,
            status=EvaluationStatus.FAILED,
            scoring_version="deterministic-v2-taxonomy",
            weights_used={
                "skills": job.skills_weight,
                "experience": job.experience_weight,
                "education": job.education_weight,
                "semantic": job.semantic_weight,
            },
            created_at=now_dt,
            completed_at=now_dt,
        )
        db.add(failed_run)
        record_audit_event(
            db,
            action="application_evaluation_failed",
            resource_type="application",
            actor_user_id=current_user.id,
            resource_id=application.id,
            request_id=getattr(request.state, "request_id", None),
            metadata={"error": str(eval_exc)},
        )

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


def _process_profile_resume_inline(resume_id: UUID, candidate_id: UUID) -> None:
    """Synchronously extract and process a candidate-uploaded profile resume in a dedicated worker-thread DB session."""
    settings = get_settings()
    db = SessionLocal()
    try:
        resume = db.get(Resume, resume_id)
        candidate = db.get(CandidateProfile, candidate_id)
        if not resume or not candidate:
            logger.error("Resume %s or Candidate %s missing for profile processing", resume_id, candidate_id)
            return

        if resume.processing_status == ProcessingStatus.NEEDS_ATTENTION:
            logger.warning(
                "Profile resume %s is already marked %s; aborting inline processing.",
                resume_id,
                resume.processing_status,
            )
            return

        resume.processing_status = ProcessingStatus.PROCESSING
        db.commit()

        root = settings.upload_directory.expanduser().resolve()
        file_path = (root / resume.storage_key).resolve()

        if not file_path.exists():
            logger.error("Profile resume file missing on disk for resume %s (storage_key: %s)", resume.id, resume.storage_key)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.FILE_CORRUPTED
            db.commit()
            return

        try:
            extracted_text = extract_text_from_file(file_path, resume.mime_type, raise_security_exceptions=True)
        except DocumentSecurityError as sec_err:
            logger.warning("Profile resume %s rejected by document security policy: %s", resume.id, sec_err)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.PARSE_FAILED
            resume.extracted_text = ""
            db.commit()
            return

        if not extracted_text or not extracted_text.strip():
            logger.warning("No text extracted from profile resume %s", resume.id)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.PARSE_FAILED
            resume.extracted_text = ""
            db.commit()
            return

        resume.extracted_text = extracted_text
        resume.parser_method = "inline-profile-sync"

        edu_records = extract_education_from_text(extracted_text)
        exp_years = extract_experience_years_from_text(extracted_text)
        detected_skills = taxonomy.extract_skills_from_text(extracted_text)

        edu = dict(candidate.education) if isinstance(candidate.education, dict) else {}
        current_skills = set(edu.get("skills", []))
        for s in detected_skills:
            current_skills.add(s["canonical_name"])
        edu["skills"] = list(current_skills)
        if not edu.get("degree") and edu_records:
            edu["degree"] = edu_records[0].get("degree_level")
        candidate.education = dict(edu)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(candidate, "education")

        if exp_years is not None and (candidate.total_experience_years is None or candidate.total_experience_years == 0):
            candidate.total_experience_years = exp_years

        db.flush()
        # Re-check status in case timeout handler or external cancellation marked it
        current_db_status = db.query(Resume.processing_status).filter(Resume.id == resume.id).scalar()
        if current_db_status == ProcessingStatus.NEEDS_ATTENTION:
            logger.warning(
                "Profile resume %s was already marked %s; aborting completion commit.",
                resume.id,
                current_db_status,
            )
            db.rollback()
            return

        resume.processing_status = ProcessingStatus.COMPLETED
        resume.needs_attention_reason = None
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Profile resume inline processing error for %s: %s", resume_id, exc)
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


@router.post("/profile/resumes", response_model=ResumeResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_profile_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    """Ingest an applicant-owned resume before it is attached to any application."""
    settings = get_settings()
    candidate = _candidate_for_user(db, current_user)
    resume = None
    try:
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
        db.refresh(resume)
    except Exception:
        db.rollback()
        if resume and getattr(resume, "storage_key", None):
            ResumeService.delete_storage_key(resume.storage_key, db=db)
        raise

    assert resume is not None

    if settings.enable_worker:
        ResumeService.enqueue_worker(resume.id)
    else:
        timeout_sec = settings.resume_extraction_timeout_seconds
        try:
            await asyncio.wait_for(
                asyncio.to_thread(_process_profile_resume_inline, resume.id, candidate.id),
                timeout=timeout_sec,
            )
        except TimeoutError:
            logger.warning(
                "Profile resume processing reached request timeout of %ss for resume %s",
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


@router.get("/profile/resumes", response_model=list[ResumeResponse])
def list_my_resumes(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)), db: Session = Depends(get_db)
) -> list[ResumeResponse]:
    """Retrieve all resumes uploaded by the authenticated candidate."""
    candidate = _candidate_for_user(db, current_user)
    resumes = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate.id)
        .order_by(Resume.created_at.desc())
        .all()
    )
    return [
        ResumeResponse(
            id=r.id,
            mime_type=r.mime_type,
            byte_size=r.byte_size,
            processing_status=r.processing_status,
            needs_attention_reason=r.needs_attention_reason,
            uploaded_at=r.created_at,
        )
        for r in resumes
    ]


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
    """Get candidate application cards for a job, ranked by deterministic score and coverage tier."""
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

    def card_rank_key(card: CandidateCardDTO):
        has_gap = any(ev.type == "gap" for ev in card.evidence)
        has_insufficient = (
            any(ev.type in ("not_detected", "not_provided") for ev in card.evidence)
            or len(card.missingSkills) > 0
        )
        if has_gap:
            tier_val = CoverageTier.REQUIRED_GAP.value  # 3
        elif has_insufficient:
            tier_val = CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE.value  # 2
        else:
            tier_val = CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS.value  # 1

        return (
            tier_val,
            -card.matchScore,
            -card.skillScore,
            -card.experienceScore,
            -card.educationScore,
            -card.semanticScore,
            str(card.id),
        )

    cards.sort(key=card_rank_key)
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
