from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field, model_validator

from app.models.enums import (
    EvaluatedSkillStatus,
    EvaluationStatus,
    EvidenceConfidence,
    EvidenceKind,
)
from app.schemas.common import APIModel


class EvaluatedSkillSchema(APIModel):
    id: UUID
    name: str
    status: EvaluatedSkillStatus
    evidence_ref: str | None = None


class EvidenceClaimSchema(APIModel):
    id: UUID
    claim_type: str
    claim_text: str
    source_document_id: UUID | None = None
    source_page: int | None = None
    source_snippet: str | None = None
    source_section: str | None = None
    confidence: EvidenceConfidence | None = None
    evidence_kind: EvidenceKind | None = None


class MatchResultSchema(APIModel):
    id: UUID
    evaluation_run_id: UUID
    overall_score: float
    skills_score: float
    experience_score: float
    education_score: float
    semantic_score: float
    rapidfuzz_score: float = 0.0
    tenure_delta_years: float | None = None
    signal_quality: str = "high"
    ranking_attribution: dict[str, Any] = Field(default_factory=dict)
    why_ranked_here: list[str] = Field(default_factory=list)
    why_not_higher: list[str] = Field(default_factory=list)
    generated_at: datetime
    evaluated_skills: list[EvaluatedSkillSchema] = Field(default_factory=list)
    evidence_claims: list[EvidenceClaimSchema] = Field(default_factory=list)


class EvaluationRunSchema(APIModel):
    id: UUID
    application_id: UUID
    status: EvaluationStatus
    scoring_version: str
    weights_used: dict[str, int]
    configuration_hash: str | None = None
    completed_at: datetime | None = None
    match_result: MatchResultSchema | None = None


def sanitize_character_offsets(
    character_start: int | None,
    character_end: int | None,
    text_length: int | None = None,
) -> tuple[int | None, int | None]:
    """Sanitizes character offsets against structural and text-length bounds.

    Returns (None, None) if:
    - Either start or end is None (incomplete pair)
    - start < 0 (negative offset)
    - end < start (inverted offset)
    - text_length is provided and (end > text_length or start > text_length)
    Otherwise returns (character_start, character_end).
    """
    if character_start is None or character_end is None:
        return None, None
    if character_start < 0 or character_end < character_start:
        return None, None
    if text_length is not None and (character_end > text_length or character_start > text_length):
        return None, None
    return character_start, character_end


class CandidateEvidenceItem(APIModel):
    requirement: str
    claim: str
    sourceText: str | None = None
    type: str  # "matched" | "transferable" | "not_detected" | "not_provided" | "gap"
    details: str | None = None
    required: bool | None = None
    source_section: str | None = None
    character_start: int | None = None
    character_end: int | None = None

    @model_validator(mode="after")
    def validate_character_offsets(self) -> "CandidateEvidenceItem":
        self.character_start, self.character_end = sanitize_character_offsets(
            self.character_start, self.character_end
        )
        return self


class CandidateCardDTO(APIModel):
    """Represents a candidate application evaluated for a job, compatible with frontend Candidate type."""

    id: UUID  # candidate_profile.id
    application_id: UUID
    jobId: UUID
    name: str
    currentRole: str | None = None
    location: str | None = None
    experienceYears: float = 0.0
    education: str | None = None
    skills: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    matchScore: float = 0.0
    skillScore: float = 0.0
    experienceScore: float = 0.0
    educationScore: float = 0.0
    semanticScore: float = 0.0
    matchedSkills: list[str] = Field(default_factory=list)
    transferableSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    status: str = "new"  # ApplicationStatus value exposed by the ATS pipeline.
    evidence: list[CandidateEvidenceItem] = Field(default_factory=list)
    recruiterNotes: str | None = None
    evaluation_status: str = "not_evaluated"  # "current" | "stale" | "pending" | "failed" | "not_evaluated"
    is_fresh: bool = False
    evaluated_at: datetime | None = None

class CandidateMatchResultsDTO(APIModel):
    application_id: UUID
    application_status: str
    job_id: UUID
    job_title: str
    company_name: str | None = None
    overall_match_score: float | None = None
    evaluation_status: str
    evaluated_at: datetime | None = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    transferable_skills: list[str] = Field(default_factory=list)
    skill_evidence: list[CandidateEvidenceItem] = Field(default_factory=list)
    experience: dict[str, Any] | None = None
    education: dict[str, Any] | None = None
    recommendations: list[str] = Field(default_factory=list)
