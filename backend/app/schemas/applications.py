from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.models.enums import ApplicationStatus
from app.schemas.common import APIModel


class ApplicationCreate(APIModel):
    resume_id: UUID | None = None


class ApplicationStatusUpdate(APIModel):
    status: ApplicationStatus


class RecruiterNoteCreate(APIModel):
    body: str = Field(min_length=1, max_length=10_000)


class ApplicationResponse(APIModel):
    id: UUID
    job_id: UUID
    candidate_id: UUID
    resume_id: UUID
    status: ApplicationStatus
    applied_at: datetime


class CandidateLeaderboardItem(APIModel):
    application_id: UUID
    candidate_id: UUID
    display_name: str | None
    status: ApplicationStatus
    overall_score: float | None = None
    coverage_tier: int | None = None


class RecruiterNoteResponse(APIModel):
    id: UUID
    application_id: UUID
    body: str
    created_at: datetime
