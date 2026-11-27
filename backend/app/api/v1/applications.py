import asyncio
import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_recruiter_profile, require_roles
from app.core.config import get_settings
from app.db.session import SessionLocal, get_db
from app.models.entities import (
    Application,
    CandidateProfile,
    EvaluationRun,
    Job,
    MatchResult,
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
from app.schemas.evaluations import (
    CandidateCardDTO,
    CandidateEvidenceItem,
    sanitize_character_offsets,
    CandidateMatchResultsDTO,
    EvaluationRunSchema,
)
from app.schemas.resumes import ResumeResponse
from app.services.application_status import (
    can_transition_application_status,
    record_application_status_change,
)
from app.services.audit import record_audit_event
from app.services.education_extractor import extract_education_from_text
from app.services.evaluation import (
    EvaluationService,
    compute_evaluation_fingerprint,
    extract_canonical_skill_from_claim_text,
)
from app.services.experience_extractor import extract_experience_years_from_text
from app.services.jobs import JobService
from app.services.resumes import ResumeService
from app.services.scoring import CoverageTier, Weights, candidate_card_rank_key
from app.services.taxonomy import taxonomy
from app.services.text_extraction import DocumentSecurityError, ScannedDocumentError, extract_text_from_file

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
        status_history=application.status_history,
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
    record_application_status_change(
        db,
        application,
        from_status=None,
        to_status=application.status,
        changed_by_user_id=current_user.id,
    )

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
        except ScannedDocumentError as scan_err:
            logger.warning("Profile resume %s rejected as scanned image document: %s", resume.id, scan_err)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.SCANNED_DOCUMENT
            resume.extracted_text = ""
            db.commit()
            return
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
        ResumeService.enqueue_worker(resume.id, db=db)
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


@router.get(
    "/applications/{application_id}/match-results",
    response_model=CandidateMatchResultsDTO,
)
def candidate_match_results(
    application_id: UUID,
    run_id: UUID | None = Query(default=None, description="Optional evaluation run ID to inspect historical results"),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)),
    db: Session = Depends(get_db),
) -> CandidateMatchResultsDTO:
    candidate = _candidate_for_user(db, current_user)
    application = (
        db.query(Application)
        .options(
            selectinload(Application.job).selectinload(Job.recruiter),
            selectinload(Application.job).selectinload(Job.skills),
            selectinload(Application.evaluation_runs)
            .selectinload(EvaluationRun.match_result)
            .selectinload(MatchResult.evaluated_skills),
            selectinload(Application.evaluation_runs)
            .selectinload(EvaluationRun.match_result)
            .selectinload(MatchResult.evidence_claims),
        )
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .one_or_none()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    all_runs = sorted(
        application.evaluation_runs,
        key=lambda r: (r.created_at or datetime.min, str(r.id)),
        reverse=True,
    )

    if run_id is not None:
        selected_run = next((r for r in all_runs if r.id == run_id), None)
        if not selected_run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation run not found.")
    else:
        selected_run = all_runs[0] if all_runs else None

    if not selected_run:
        evaluation_status = "unavailable"
        run = None
        result = None
    elif selected_run.status in (EvaluationStatus.QUEUED, EvaluationStatus.RUNNING):
        evaluation_status = "pending"
        run = None
        result = None
    elif selected_run.status == EvaluationStatus.FAILED:
        evaluation_status = "failed"
        run = selected_run
        result = None
    elif selected_run.status == EvaluationStatus.COMPLETED and selected_run.match_result:
        if run_id is None:
            # Compare stored configuration fingerprint against current job and candidate configuration
            current_config_hash: str | None = None
            try:
                job = application.job
                weights = Weights(
                    skills=float(job.skills_weight),
                    experience=float(job.experience_weight),
                    education=float(job.education_weight),
                    semantic=float(job.semantic_weight),
                )
                current_config_hash = compute_evaluation_fingerprint(
                    job=job,
                    candidate=application.candidate,
                    resume=application.resume,
                    weights=weights,
                )
            except Exception as exc:
                logger.warning(
                    "Fingerprint calculation failed in match results for application %s: %s",
                    application.id,
                    exc,
                )

            if (
                selected_run.configuration_hash is not None
                and current_config_hash is not None
                and selected_run.configuration_hash == current_config_hash
            ):
                evaluation_status = "completed"
                run = selected_run
                result = run.match_result
            else:
                # If candidate profile fields in DB were cleared/null, check if resume-extracted candidate matches
                is_fresh_match = False
                if (
                    selected_run.configuration_hash is not None
                    and application.candidate
                    and application.resume
                    and application.resume.extracted_text
                ):
                    try:
                        from types import SimpleNamespace
                        detected_skills = taxonomy.extract_skills_from_text(application.resume.extracted_text)
                        edu = dict(application.candidate.education) if isinstance(application.candidate.education, dict) else {}
                        if not edu.get("skills"):
                            edu["skills"] = [s["canonical_name"] for s in detected_skills]
                        cand_proxy = SimpleNamespace(
                            name=application.candidate.name,
                            headline=application.candidate.headline,
                            total_experience_years=application.candidate.total_experience_years,
                            education=edu,
                        )
                        proxy_hash = compute_evaluation_fingerprint(
                            job=job,
                            candidate=cand_proxy,  # type: ignore[arg-type]
                            resume=application.resume,
                            weights=weights,
                        )
                        if proxy_hash == selected_run.configuration_hash:
                            is_fresh_match = True
                    except Exception:
                        pass

                if is_fresh_match:
                    evaluation_status = "completed"
                    run = selected_run
                    result = run.match_result
                else:
                    # Configuration differs: return stale status and do not present old result as current
                    evaluation_status = "stale"
                    run = None
                    result = None
        else:
            # Explicit historical run access: preserve historical run results
            evaluation_status = "completed"
            run = selected_run
            result = run.match_result
    else:
        evaluation_status = "unavailable"
        run = None
        result = None

    attribution = (
        result.ranking_attribution
        if result and isinstance(result.ranking_attribution, dict)
        else {}
    )
    skills = result.evaluated_skills if result else []
    matched = [skill.name for skill in skills if skill.status.value == "matched"]
    missing = [skill.name for skill in skills if skill.status.value in {"not_detected", "gap"}]
    transferable = [skill.name for skill in skills if skill.status.value == "transferable"]
    if result and not skills:
        matched, missing, transferable = (
            attribution.get(key, [])
            for key in ("matched_skills", "missing_skills", "transferable_skills")
        )
    matched = matched if isinstance(matched, list) else []
    missing = missing if isinstance(missing, list) else []
    transferable = transferable if isinstance(transferable, list) else []

    claims = result.evidence_claims if result else []
    evidence_types = {
        "skill_match": "matched",
        "transferable_skill": "transferable",
        "not_detected": "not_detected",
    }
    evidence = []
    job_skills = application.job.skills if application.job else []
    job_skill_names = [js.name for js in job_skills]
    resume_len = (
        len(application.resume.extracted_text)
        if (application.resume and application.resume.extracted_text)
        else None
    )
    for claim in claims:
        if claim.claim_type not in evidence_types:
            continue
        ev_type = evidence_types[claim.claim_type]

        # Resolve specific skill requirement name and required vs preferred status unambiguously
        matched_skill_name = next(
            (s.name for s in skills if s.evidence_ref and s.evidence_ref == str(claim.id)),
            None,
        )
        if not matched_skill_name:
            matched_skill_name = extract_canonical_skill_from_claim_text(claim.claim_text, job_skill_names)

        matched_job_skill = next(
            (js for js in job_skills if js.name.casefold() == (matched_skill_name or "").casefold()),
            None,
        )

        if matched_job_skill:
            req_name = matched_job_skill.name
            is_req = matched_job_skill.required
        else:
            req_name = matched_skill_name or claim.claim_type.replace("_", " ").title()
            is_req = None

        # Source section attribution: do not claim "skills" if not verified
        sec = claim.source_section
        if not sec or sec.lower() in ("skills", "unknown"):
            sec = "unknown"

        c_start, c_end = sanitize_character_offsets(
            claim.character_start,
            claim.character_end,
            text_length=resume_len,
        )

        evidence.append(
            CandidateEvidenceItem(
                requirement=req_name,
                claim=claim.claim_text,
                sourceText=claim.source_snippet,
                type=ev_type,
                details=claim.source_snippet,
                required=is_req,
                source_section=sec,
                character_start=c_start,
                character_end=c_end,
            )
        )

    candidate_profile = application.candidate
    experience = education = None
    recommendations = []
    if result:
        experience = {
            "candidate_years": candidate_profile.total_experience_years,
            "required_years": application.job.experience_min_years,
            "alignment_score": result.experience_score,
            "tenure_delta_years": result.tenure_delta_years,
        }
        degree = (
            candidate_profile.education.get("degree")
            if isinstance(candidate_profile.education, dict)
            else None
        )
        education = {
            "candidate_degree": degree,
            "required_education": application.job.education_required,
            "alignment_score": result.education_score,
        }
        for skill in missing:
            if any(
                claim.claim_type == "not_detected"
                and (
                    next((s.name for s in skills if s.evidence_ref and s.evidence_ref == str(claim.id)), None) == skill
                    or extract_canonical_skill_from_claim_text(claim.claim_text, [skill]) == skill
                )
                for claim in claims
            ):
                recommendations.append(
                    f"Consider adding relevant {skill} experience or evidence to your resume if you have it."
                )

    evaluated_at = None
    if run:
        evaluated_at = run.completed_at or run.created_at

    return CandidateMatchResultsDTO(
        application_id=application.id,
        application_status=application.status.value,
        job_id=application.job.id,
        job_title=application.job.title,
        company_name=(
            application.job.recruiter.organization_name
            if application.job.recruiter
            else None
        ),
        overall_match_score=result.overall_score if result else None,
        evaluation_status=evaluation_status,
        evaluated_at=evaluated_at,
        matched_skills=matched,
        missing_skills=missing,
        transferable_skills=transferable,
        skill_evidence=evidence,
        experience=experience,
        education=education,
        recommendations=recommendations,
    )


@router.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: UUID,
    payload: ApplicationStatusUpdate,
    request: Request,
    recruiter: RecruiterProfile = Depends(get_recruiter_profile),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .with_for_update()
        .one_or_none()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    JobService.owned_job(db, job_id=application.job_id, recruiter_id=recruiter.id)
    if not can_transition_application_status(application.status, payload.status):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Application cannot move from '{application.status.value}' to '{payload.status.value}'.",
        )
    previous_status = application.status
    record_application_status_change(
        db,
        application,
        from_status=previous_status,
        to_status=payload.status,
        changed_by_user_id=recruiter.user_id,
    )
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
    job = JobService.owned_job(db, job_id=job_id, recruiter_id=recruiter.id)
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

    cards.sort(key=lambda card: candidate_card_rank_key(card, job.skills))
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
