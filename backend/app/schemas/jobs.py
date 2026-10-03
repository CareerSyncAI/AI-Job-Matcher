from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, model_validator

from app.models.enums import JobStatus
from app.schemas.common import APIModel


class JobSkillInput(APIModel):
    name: str = Field(min_length=1, max_length=255)
    required: bool = True
    min_years: float | None = Field(default=None, ge=0, le=60)


class JobWeights(APIModel):
    skills: int = Field(default=35, ge=0, le=100)
    experience: int = Field(default=35, ge=0, le=100)
    education: int = Field(default=15, ge=0, le=100)
    semantic: int = Field(default=15, ge=0, le=100)

    @model_validator(mode="after")
    def weights_must_total_100(self) -> JobWeights:
        if self.skills + self.experience + self.education + self.semantic != 100:
            raise ValueError("Evaluation weights must sum to exactly 100.")
        return self


class JobCreate(APIModel):
    title: str = Field(min_length=1, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str = Field(default="Full-time", max_length=32)
    work_arrangement: str = Field(default="On-site", max_length=32)
    experience_min_years: float = Field(default=0, ge=0, le=60)
    education_required: str = Field(default="Any", max_length=32)
    description: str = Field(min_length=1, max_length=20_000)
    skills: list[JobSkillInput] = Field(default_factory=list)
    evaluation_weights: JobWeights = Field(default_factory=JobWeights)
    status: JobStatus = JobStatus.DRAFT


class JobUpdate(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str | None = Field(default=None, max_length=32)
    work_arrangement: str | None = Field(default=None, max_length=32)
    experience_min_years: float | None = Field(default=None, ge=0, le=60)
    education_required: str | None = Field(default=None, max_length=32)
    description: str | None = Field(default=None, min_length=1, max_length=20_000)
    skills: list[JobSkillInput] | None = None
    evaluation_weights: JobWeights | None = None
    status: JobStatus | None = None


class JobSkillResponse(JobSkillInput):
    id: UUID


class JobResponse(APIModel):
    id: UUID
    title: str
    department: str | None
    location: str | None
    employment_type: str
    work_arrangement: str
    experience_min_years: float
    education_required: str
    description: str
    status: JobStatus
    skills: list[JobSkillResponse]
    evaluation_weights: JobWeights
    created_at: datetime
    applicant_count: int = 0

