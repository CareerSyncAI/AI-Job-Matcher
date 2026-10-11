"""
CareerSync AI — Ground-Truth Evaluation Benchmark Schemas.

Defines standard schemas for:
- Ground-truth evaluation datasets (resumes + jobs + human annotations)
- Evaluation metric scorecards (Precision, Recall, F1, MAE, Rank Correlation)
- Systematic error analysis logs (ambiguity flags, gap discrepancies, tenure drift)
"""

from __future__ import annotations

from typing import Any
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
    expected_coverage_tier: int  # 1 = No Gaps, 2 = Required Gap, 3 = Insufficient Evidence
    expected_human_fit_rating: float  # 0.0 to 100.0
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


class GapDetectionMetrics(BaseModel):
    true_positive_gaps: int = 0
    false_positive_gaps: int = 0
    false_negative_gaps: int = 0
    gap_precision: float = 0.0
    gap_recall: float = 0.0
    gap_f1: float = 0.0


class ErrorAnalysisLog(BaseModel):
    case_id: str
    candidate_name: str
    job_title: str
    error_category: str  # "skill_extraction", "gap_detection", "experience_drift", "education_mismatch"
    details: str
    suggested_action: str


class BenchmarkSummaryReport(BaseModel):
    dataset_version: str
    total_test_pairs: int
    skill_extraction_metrics: ExtractionMetrics
    required_gap_metrics: GapDetectionMetrics
    experience_tenure_metrics: ExperienceMetrics
    education_hierarchy_metrics: EducationMetrics
    rank_correlation_spearman: float
    error_analysis_logs: list[ErrorAnalysisLog]
