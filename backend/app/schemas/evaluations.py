from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

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


class CandidateEvidenceItem(APIModel):
    requirement: str
    claim: str
    sourceText: str | None = None
    type: str  # "matched" | "transferable" | "not_detected" | "not_provided" | "gap"
    details: str | None = None


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
    status: str = "screened"  # "screened" | "shortlisted" | "interviewing" | "rejected"
    evidence: list[CandidateEvidenceItem] = Field(default_factory=list)
    recruiterNotes: str | None = None
    evaluation_status: str = "not_evaluated"  # "current" | "stale" | "pending" | "failed" | "not_evaluated"
    is_fresh: bool = False
    evaluated_at: datetime | None = None
