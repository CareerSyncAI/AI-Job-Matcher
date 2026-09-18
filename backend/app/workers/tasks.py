import logging
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.entities import CandidateProfile, Resume
from app.models.enums import AttentionReason, ProcessingStatus
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="careersync.resume.process", bind=True, max_retries=2)
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
            logger.warning("Resume %s not found in database.", resume_id)
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

        try:
            with open(file_path, "rb") as f:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(
                        ai_url,
                        files={"file": (resume.original_filename, f, resume.mime_type)},
                        data={"resume_id": str(resume.id)},
                    )

            if resp.status_code == 200:
                data = resp.json()
                sections = data.get("sections", {})
                parsed_text = " ".join(sections.values()) if sections else ""
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
                    )
                if extract_resp.status_code == 200:
                    ext_data = extract_resp.json()
                    entities = ext_data.get("entities", {})
                    skills = [s.get("canonical_name") for s in entities.get("skills", []) if s.get("canonical_name")]

                    # Enrich candidate profile if attached
                    if resume.candidate_id:
                        candidate = db.get(CandidateProfile, resume.candidate_id)
                        if candidate:
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

        # Mark completed or needs attention
        if resume.extracted_text:
            resume.processing_status = ProcessingStatus.COMPLETED
            resume.needs_attention_reason = None
        else:
            resume.processing_status = ProcessingStatus.NEEDS_ATTENTION

        db.commit()

    except Exception as err:
        logger.exception("Unexpected error in resume processing worker: %s", err)
        db.rollback()
    finally:
        if close_db:
            db.close()
