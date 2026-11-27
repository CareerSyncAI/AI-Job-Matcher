from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.models.enums import AttentionReason, ProcessingStatus, ResumeAnalysisStatus
from app.schemas.common import APIModel


class ResumeResponse(APIModel):
    id: UUID
    mime_type: str
    byte_size: int
    processing_status: ProcessingStatus
    needs_attention_reason: AttentionReason | None
    uploaded_at: datetime


class ATSIssueSchema(APIModel):
    category: str
    severity: str
    issue: str
    recommendation: str


class ATSAnalysisSchema(APIModel):
    overall_ats_score: float
    grade: str
    section_score: float
    contact_score: float
    impact_score: float
    formatting_score: float
    skills_score: float
    detected_sections: dict[str, bool]
    detected_skills: list[str] = Field(default_factory=list)
    missing_critical_sections: list[str]
    contact_details: dict[str, Any]
    action_verbs_found: list[str]
    quantifiable_metrics_count: int
    word_count: int
    strengths: list[str]
    issues: list[ATSIssueSchema]


class AnalyzeTextPayload(APIModel):
    text: str = Field(min_length=1, max_length=100_000)


class ResumeAnalysisStatusResponse(APIModel):
    resume_id: UUID
    run_id: UUID | None = None
    status: ResumeAnalysisStatus
    current_stage: str | None = None
    failed_stage: str | None = None
    attempt_number: int = 0
    retry_of_run_id: UUID | None = None
    result_available: bool = False
    failure_code: str | None = None
    failure_detail: str | None = None
    result: ATSAnalysisSchema | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    failed_at: datetime | None = None
