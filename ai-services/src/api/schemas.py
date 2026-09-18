"""Pydantic V2 Schemas for CareerSync AI Service Interface.

Strictly conforms to docs/ai-service-contract.md.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# 1. Health Schema
class CapabilitiesSchema(BaseModel):
    pdf_parsing: bool = True
    docx_parsing: bool = True
    skill_extraction: bool = True
    skill_normalization: bool = True
    experience_structuring: bool = True
    semantic_similarity: bool = True


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    service: str = "careersync-ai-engine"
    capabilities: CapabilitiesSchema = Field(default_factory=CapabilitiesSchema)


# 2. Parse Resume Schemas
class ParseResumeResponse(BaseModel):
    resume_id: Optional[str] = None
    status: str = "completed"
    source_format: str
    parser_version: str = "1.0.0"
    processing_duration_ms: int
    raw_text_length: int
    sections: Dict[str, str]
    warnings: List[str] = Field(default_factory=list)


# 3. Entity Extraction Schemas
class ExtractEntitiesRequest(BaseModel):
    resume_id: Optional[str] = None
    text: Optional[str] = ""
    sections: Optional[Dict[str, str]] = Field(default_factory=dict)


class SkillEntity(BaseModel):
    raw_name: str
    canonical_name: str
    category: str
    confidence: float
    source_section: str = "skills"


class ExperienceEntity(BaseModel):
    organization: str
    role_title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    duration_months: int
    highlights: List[str] = Field(default_factory=list)


class EducationEntity(BaseModel):
    institution: str
    degree_level: str
    degree_name: str
    field_of_study: str
    graduation_year: Optional[int] = None


class EntitiesPayload(BaseModel):
    skills: List[SkillEntity] = Field(default_factory=list)
    experience: List[ExperienceEntity] = Field(default_factory=list)
    total_experience_months: int = 0
    total_experience_years: float = 0.0
    education: List[EducationEntity] = Field(default_factory=list)


class ExtractEntitiesResponse(BaseModel):
    resume_id: Optional[str] = None
    status: str = "completed"
    parser_version: str = "1.0.0"
    entities: EntitiesPayload
    extraction_metadata: Dict[str, Any] = Field(default_factory=dict)


# 4. Normalize Skills Schemas
class NormalizeSkillsRequest(BaseModel):
    skills: List[str]


class NormalizedSkillItem(BaseModel):
    input: str
    canonical: str
    category: str
    matched: bool
    confidence: float = 1.0


class NormalizeSkillsResponse(BaseModel):
    normalized: List[NormalizedSkillItem]


# 5. Semantic Match Schemas
class CandidateProfilePayload(BaseModel):
    headline: Optional[str] = ""
    skills: List[str] = Field(default_factory=list)
    experience_summary: Optional[str] = ""


class JobRequisitionPayload(BaseModel):
    job_id: Optional[str] = None
    title: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    description: Optional[str] = ""


class SemanticMatchRequest(BaseModel):
    candidate_id: Optional[str] = None
    candidate_profile: CandidateProfilePayload
    job_requisition: JobRequisitionPayload


class ModelInfoPayload(BaseModel):
    engine: str = "semantic-cosine-v1"
    vector_dimensions: int = 384
    offline_compatible: bool = True


class SemanticMatchResponse(BaseModel):
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    semantic_similarity_score: float
    alignment_grade: str
    matched_key_concepts: List[str] = Field(default_factory=list)
    missing_or_gap_concepts: List[str] = Field(default_factory=list)
    model_info: ModelInfoPayload = Field(default_factory=ModelInfoPayload)


# Standard Error Schema
class ErrorDetail(BaseModel):
    code: str
    message: str
    recoverable: bool = False
    suggested_fallback: str = "REVERT_TO_DETERMINISTIC_EVALUATION"


class StandardErrorResponse(BaseModel):
    error: ErrorDetail
