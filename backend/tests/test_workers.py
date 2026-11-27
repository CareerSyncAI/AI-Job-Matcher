from __future__ import annotations

from uuid import uuid4

from app.models.entities import Resume
from app.models.enums import AttentionReason, ProcessingStatus
from app.workers.tasks import _mark_unexpected_processing_failure, _set_resume_processing_result


def test_unexpected_worker_failure_does_not_leave_resume_processing(db_session):
    resume = Resume(
        id=uuid4(),
        original_filename="resume.pdf",
        storage_key="resume.pdf",
        mime_type="application/pdf",
        byte_size=16,
        sha256="b" * 64,
        processing_status=ProcessingStatus.PROCESSING,
    )
    db_session.add(resume)
    db_session.commit()

    _mark_unexpected_processing_failure(db_session, resume.id)

    db_session.refresh(resume)
    assert resume.processing_status is ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason is AttentionReason.ANALYSIS_FAILED


def test_worker_evaluation_failure_does_not_mark_resume_completed():
    resume = Resume(
        original_filename="resume.pdf",
        storage_key="resume.pdf",
        mime_type="application/pdf",
        byte_size=16,
        sha256="c" * 64,
    )

    _set_resume_processing_result(resume, "extracted resume text", evaluation_failed=True)

    assert resume.processing_status is ProcessingStatus.NEEDS_ATTENTION
    assert resume.needs_attention_reason is AttentionReason.ANALYSIS_FAILED


def test_worker_success_marks_resume_completed():
    resume = Resume(
        original_filename="resume.pdf",
        storage_key="resume.pdf",
        mime_type="application/pdf",
        byte_size=16,
        sha256="d" * 64,
        needs_attention_reason=AttentionReason.PARSE_FAILED,
    )

    _set_resume_processing_result(resume, "extracted resume text", evaluation_failed=False)

    assert resume.processing_status is ProcessingStatus.COMPLETED
    assert resume.needs_attention_reason is None
