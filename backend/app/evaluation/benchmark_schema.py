"""
CareerSync AI — synthetic regression benchmark schemas.

Defines standard schemas for:
- Synthetic regression fixtures and separately labeled evaluation datasets
- Evaluation metric scorecards (Precision, Recall, F1, MAE, Rank Correlation)
- Systematic error analysis logs (ambiguity flags, gap discrepancies, tenure drift)
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class GroundTruthCandidate(BaseModel):
    id: str
    name: str
    resume_text: str
    expected_skills: list[str]
    expected_experience_years: float
    expected_education_degree: str


class GroundTruthJob(BaseModel):
    id: str
    title: str
    description: str
    required_skills: list[str]
    preferred_skills: list[str]
    experience_min_years: float
    education_required: str
    weights: dict[str, int] = Field(default_factory=lambda: {"skills": 35, "experience": 35, "education": 15, "semantic": 15})


class GroundTruthItem(BaseModel):
    id: str
    candidate: GroundTruthCandidate
    job: GroundTruthJob
    expected_matched_required_skills: list[str]
    expected_missing_required_skills: list[str]
    expected_coverage_tier: int  # 1 = No Gaps, 2 = Insufficient Evidence, 3 = Required Gap
    # Synthetic fixtures may provide an illustrative ordering score. It must
    # never be represented as an independently reviewed human rating.
    expected_fixture_fit_rating: float | None = None
    relevance_label: Literal[
        "strong_match", "partial_match", "weak_match", "insufficient_information"
    ] | None = None
    relevance_label_source: Literal["synthetic", "human_reviewed"] = "synthetic"
    split: Literal["development", "held_out", "regression"] = "regression"
    candidate_source: Literal["synthetic", "permitted_public", "permissioned"] = "synthetic"
    annotator_id: str | None = None
    adjudication_status: Literal["not_applicable", "pending", "adjudicated"] = "not_applicable"
    notes: str | None = None


class ExtractionMetrics(BaseModel):
    true_positives: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0


class ExperienceMetrics(BaseModel):
    mean_absolute_error_years: float = 0.0
    exact_matches: int = 0
    total_evaluated: int = 0


class EducationMetrics(BaseModel):
    correct_classifications: int = 0
    total_evaluated: int = 0
    accuracy: float = 0.0


class RequiredSkillEvidenceMetrics(BaseModel):
    """Measures resume evidence mentions; absence is not a confirmed skill gap."""

    true_positive_not_detected: int = 0
    false_positive_not_detected: int = 0
    false_negative_not_detected: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0


class ErrorAnalysisLog(BaseModel):
    case_id: str
    candidate_name: str
    job_title: str
    error_category: str  # "skill_extraction", "gap_detection", "experience_drift", "education_mismatch"
    details: str
    suggested_action: str


class BenchmarkSummaryReport(BaseModel):
    dataset_version: str
    dataset_type: Literal["synthetic_regression", "human_labeled_evaluation"]
    evaluation_reference_date: date | None = None
    total_test_pairs: int
    skill_extraction_metrics: ExtractionMetrics
    required_skill_evidence_metrics: RequiredSkillEvidenceMetrics
    experience_tenure_metrics: ExperienceMetrics
    education_hierarchy_metrics: EducationMetrics
    rank_correlation_spearman: float | None = None
    ranking_metric_note: str
    error_analysis_logs: list[ErrorAnalysisLog]
