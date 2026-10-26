"""Pydantic V2 Schemas for CareerSync AI Service Interface.

Strictly conforms to docs/ai-service-contract.md.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# 1. Health Schema
class CapabilitiesSchema(BaseModel):
    pdf_parsing: bool = True
    docx_parsing: bool = True
    skill_extraction: bool = True
    skill_normalization: bool = True
    experience_structuring: bool = True
    semantic_similarity: bool = True
    embedding_matcher_available: bool = True
    active_matcher_engine: str = "baseline"
    embedding_model_id: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_model_loaded: bool = False


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    service: str = "careersync-ai-engine"
    capabilities: CapabilitiesSchema = Field(default_factory=CapabilitiesSchema)


# 2. Parse Resume Schemas
class ParseResumeResponse(BaseModel):
    resume_id: str | None = None
    status: str = "completed"
    source_format: str
    parser_version: str = "1.0.0"
    processing_duration_ms: int
    raw_text_length: int
    sections: dict[str, str]
    warnings: list[str] = Field(default_factory=list)


# 3. Entity Extraction Schemas
class ExtractEntitiesRequest(BaseModel):
    resume_id: str | None = None
    text: str | None = ""
    sections: dict[str, str] | None = Field(default_factory=dict)


class SkillEntity(BaseModel):
    raw_name: str
    canonical_name: str
    category: str
    confidence: float
    source_section: str = "skills"


class ExperienceEntity(BaseModel):
    organization: str
    role_title: str
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    is_internship: bool = False
    duration_months: int
    highlights: list[str] = Field(default_factory=list)


class EducationEntity(BaseModel):
    institution: str | None = None
    degree_level: str | None = None
    degree_name: str | None = None
    field_of_study: str | None = None
    graduation_year: int | None = None


class EntitiesPayload(BaseModel):
    skills: list[SkillEntity] = Field(default_factory=list)
    experience: list[ExperienceEntity] = Field(default_factory=list)
    total_experience_months: int = 0
    total_experience_years: float = 0.0
    education: list[EducationEntity] = Field(default_factory=list)


class ExtractEntitiesResponse(BaseModel):
    resume_id: str | None = None
    status: str = "completed"
    parser_version: str = "1.0.0"
    entities: EntitiesPayload
    extraction_metadata: dict[str, Any] = Field(default_factory=dict)


# 4. Normalize Skills Schemas
class NormalizeSkillsRequest(BaseModel):
    skills: list[str]


class NormalizedSkillItem(BaseModel):
    input: str
    canonical: str
    category: str
    matched: bool
    confidence: float = 1.0


class NormalizeSkillsResponse(BaseModel):
    normalized: list[NormalizedSkillItem]


# 5. Semantic Match Schemas
class CandidateProfilePayload(BaseModel):
    headline: str | None = ""
    skills: list[str] = Field(default_factory=list)
    experience_summary: str | None = ""
    sections: dict[str, str] | None = Field(default_factory=dict)


class JobRequisitionPayload(BaseModel):
    job_id: str | None = None
    title: str
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    description: str | None = ""


class SemanticMatchRequest(BaseModel):
    candidate_id: str | None = None
    candidate_profile: CandidateProfilePayload
    job_requisition: JobRequisitionPayload
    method: str | None = None  # "baseline" or "embedding"


class ModelInfoPayload(BaseModel):
    engine: str = "semantic-cosine-v1"
    model_id: str | None = None
    model_revision: str | None = None
    vector_dimensions: int = 384
    device: str | None = "cpu"
    offline_compatible: bool = True


class SemanticMatchResponse(BaseModel):
    candidate_id: str | None = None
    job_id: str | None = None
    semantic_similarity_score: float  # Normalized 0.0 - 100.0 (backward compatibility)
    raw_similarity: float | None = None  # Clamped cosine similarity [0.0 - 1.0]
    similarity_index: float | None = None  # Normalized presentation index [0.0 - 100.0]
    alignment_grade: str
    method: str = "tf_cosine_baseline"
    status: str = "ok"
    fallback_reason: str | None = None
    matched_key_concepts: list[str] = Field(default_factory=list)
    missing_or_gap_concepts: list[str] = Field(default_factory=list)
    evidence_status: dict[str, list[str]] = Field(
        default_factory=lambda: {"supported": [], "not_detected": [], "insufficient_information": []}
    )
    evidence_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    model_info: ModelInfoPayload = Field(default_factory=ModelInfoPayload)
    diagnostics: dict[str, Any] = Field(default_factory=dict)


# Standard Error Schema
class ErrorDetail(BaseModel):
    code: str
    message: str
    recoverable: bool = False
    suggested_fallback: str = "REVERT_TO_DETERMINISTIC_EVALUATION"


class StandardErrorResponse(BaseModel):
    error: ErrorDetail
