import logging
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.entities import CandidateProfile, Resume
from app.models.enums import AttentionReason, ProcessingStatus
try:
    from celery.exceptions import SoftTimeLimitExceeded
except ImportError:
    class SoftTimeLimitExceeded(Exception):
        pass

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="careersync.resume.process",
    bind=True,
    max_retries=2,
    time_limit=45,
    soft_time_limit=30,
)
def process_resume(self, resume_id: str, db=None) -> None:
    """Consumes AI service parsing & entity extraction according to docs/ai-service-contract.md v1.0.0.

    Resiliently isolates AI service outages from breaking recruitment workflows.
    """
    resume_uuid = UUID(resume_id)
    settings = get_settings()

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        resume = db.get(Resume, resume_uuid)
        if not resume:
            logger.warning("Resume %s not found in database, scheduling retry.", resume_id)
            if hasattr(self, "retry"):
                raise self.retry(countdown=2, exc=Exception(f"Resume {resume_id} not visible yet"))
            return

        resume.processing_status = ProcessingStatus.PROCESSING
        db.commit()

        # Build absolute path to stored file
        root = settings.upload_directory.expanduser().resolve()
        file_path = (root / resume.storage_key).resolve()

        if not file_path.exists():
            logger.error("Resume file %s missing on disk.", file_path)
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            resume.needs_attention_reason = AttentionReason.FILE_CORRUPTED
            db.commit()
            return

        # 1. Call AI microservice parse endpoint
        ai_url = f"{settings.ai_service_url.rstrip('/')}/api/v1/ai/parse-resume"
        parsed_text = ""
        sections = {}

        headers = {"X-AI-Service-Key": settings.ai_service_api_key}

        try:
            with open(file_path, "rb") as f:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(
                        ai_url,
                        files={"file": (resume.original_filename, f, resume.mime_type)},
                        data={"resume_id": str(resume.id)},
                        headers=headers,
                    )

            if resp.status_code == 200:
                data = resp.json()
                sections = data.get("sections", {})
                parsed_text = "\n\n".join(s for s in sections.values() if s.strip()) if sections else ""
                resume.extracted_text = parsed_text
                resume.parser_method = data.get("parser_version", "ai-parser-v1")
            else:
                logger.warning("AI parse service returned HTTP %s: %s", resp.status_code, resp.text)
                resume.needs_attention_reason = AttentionReason.PARSE_FAILED

        except Exception as exc:
            logger.warning("AI parse service unavailable or timed out: %s", exc)
            resume.needs_attention_reason = AttentionReason.PARSE_FAILED

        # 2. Call AI entity extraction if text was retrieved
        if parsed_text:
            extract_url = f"{settings.ai_service_url.rstrip('/')}/api/v1/ai/extract-entities"
            try:
                with httpx.Client(timeout=15.0) as client:
                    extract_resp = client.post(
                        extract_url,
                        json={
                            "resume_id": str(resume.id),
                            "text": parsed_text,
                            "sections": sections,
                        },
                        headers=headers,
                    )
                if extract_resp.status_code == 200:
                    ext_data = extract_resp.json()
                    entities = ext_data.get("entities", {})
                    skills = [s.get("canonical_name") for s in entities.get("skills", []) if s.get("canonical_name")]

                    # Enrich candidate profile only if not a registered user account (prevents profile hijacking)
                    if resume.candidate_id:
                        candidate = db.get(CandidateProfile, resume.candidate_id)
                        if candidate and candidate.user_id is None:
                            edu = candidate.education or {}
                            if isinstance(edu, dict):
                                existing_skills = set(edu.get("skills", []))
                                existing_skills.update(skills)
                                edu["skills"] = list(existing_skills)

                                # Enrich education degree if available and not set
                                ai_edu = entities.get("education", [])
                                if ai_edu and isinstance(ai_edu, list) and not edu.get("degree"):
                                    highest_deg = ai_edu[0].get("degree_level") or ai_edu[0].get("degree_name")
                                    if highest_deg:
                                        edu["degree"] = highest_deg
                                candidate.education = edu

                            # Enrich total experience years if not explicitly set
                            total_exp = entities.get("total_experience_years")
                            if total_exp is not None and (candidate.total_experience_years is None or candidate.total_experience_years == 0):
                                candidate.total_experience_years = float(total_exp)
            except Exception as exc:
                logger.warning("AI entity extraction call failed: %s", exc)

        # 3. Create or find Application and evaluate if attached to an ingestion job
        if resume.ingestion_job_id and resume.candidate_id and parsed_text:
            from app.models.entities import Application, Job
            from app.models.enums import ApplicationStatus
            from app.services.evaluation import EvaluationService

            job = db.get(Job, resume.ingestion_job_id)
            if job:
                existing_app = (
                    db.query(Application)
                    .filter(
                        Application.job_id == job.id,
                        Application.candidate_id == resume.candidate_id,
                    )
                    .one_or_none()
                )
                if not existing_app:
                    app_record = Application(
                        job_id=job.id,
                        candidate_id=resume.candidate_id,
                        resume_id=resume.id,
                        status=ApplicationStatus.NEW,
                    )
                    db.add(app_record)
                    db.flush()
                else:
                    app_record = existing_app
                    app_record.resume_id = resume.id
                    db.flush()

                try:
                    eval_svc = EvaluationService()
                    eval_svc.evaluate_application(
                        db,
                        application_id=app_record.id,
                        recruiter_id=job.recruiter_id,
                    )
                except Exception as eval_err:
                    logger.warning("Worker evaluation failed for application %s: %s", app_record.id, eval_err)

        # Mark completed or needs attention based on worker extraction outcome
        if parsed_text:
            resume.processing_status = ProcessingStatus.COMPLETED
            resume.needs_attention_reason = None
        else:
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
            if not resume.needs_attention_reason:
                resume.needs_attention_reason = AttentionReason.PARSE_FAILED

        db.commit()


    except SoftTimeLimitExceeded:
        logger.warning("Task soft time limit exceeded while processing resume %s", resume_id)
        db.rollback()
        try:
            resume = db.get(Resume, resume_uuid)
            if resume:
                resume.processing_status = ProcessingStatus.NEEDS_ATTENTION
                resume.needs_attention_reason = AttentionReason.PARSE_FAILED
                db.commit()
        except Exception:
            pass
    except Exception as err:
        logger.exception("Unexpected error in resume processing worker: %s", err)
        db.rollback()
    finally:
        if close_db:
            db.close()
