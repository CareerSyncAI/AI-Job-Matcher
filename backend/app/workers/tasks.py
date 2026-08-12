from __future__ import annotations

from uuid import UUID

from app.workers.celery_app import celery_app


@celery_app.task(name="careersync.resume.process")
def process_resume(resume_id: str) -> None:
    """Reserved boundary for Docling/GLiNER/BGE-M3 integration.

    A later AI-service integration must update processing state and persist an
    immutable EvaluationRun/MatchResult. It must not decide authorization.
    """

    UUID(resume_id)
