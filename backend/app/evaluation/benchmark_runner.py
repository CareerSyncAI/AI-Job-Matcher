"""
CareerSync AI — Automated Benchmark Evaluation & Error Analysis Runner.

Executes ground-truth benchmark datasets against the resume intelligence layer and produces:
- Precision, Recall, and F1 for Skill Extraction
- Required-Gap Detection Precision & Recall
- Experience Calculation MAE (Mean Absolute Error)
- Education Classification Accuracy
- Spearman's Rank Correlation Coefficient with Human Fit Ratings
- Systematic Error Analysis Logs for Edge Cases
"""

from __future__ import annotations

import math
from typing import Any

from app.evaluation.benchmark_schema import (
    BenchmarkSummaryReport,
    EducationMetrics,
    ErrorAnalysisLog,
    ExperienceMetrics,
    ExtractionMetrics,
    GapDetectionMetrics,
    GroundTruthItem,
)
from app.evaluation.synthetic_dataset import BENCHMARK_DATASET
from app.models.entities import CandidateProfile, Job, JobSkill, Resume
from app.models.enums import EvaluatedSkillStatus, JobStatus
from app.services.education_extractor import extract_education_from_text
from app.services.evaluation import DeterministicEvaluationEngine
from app.services.experience_extractor import extract_experience_years_from_text
from app.services.scoring import Weights, education_satisfies, normalize_degree, required_coverage_tier
from app.services.taxonomy import taxonomy


class BenchmarkRunner:
    """Evaluates the resume intelligence engine against ground-truth benchmark datasets."""

    def __init__(self, dataset: list[GroundTruthItem] | None = None) -> None:
        self.dataset = dataset or BENCHMARK_DATASET
        self.engine = DeterministicEvaluationEngine()

    def run_benchmark(self) -> BenchmarkSummaryReport:
        # Skill extraction counters
        total_extracted_tp = 0
        total_extracted_fp = 0
        total_extracted_fn = 0

        # Gap detection counters
        gap_tp = 0
        gap_fp = 0
        gap_fn = 0

        # Experience error tracking
        exp_errors: list[float] = []
        exp_exact = 0

        # Education accuracy tracking
        edu_correct = 0

        # Ranking correlation pairs
        system_scores: list[float] = []
        human_ratings: list[float] = []

        # Error analysis logs
        error_logs: list[ErrorAnalysisLog] = []

        for item in self.dataset:
            # 1. Evaluate Skill Extraction
            extracted_skills_raw = taxonomy.extract_skills_from_text(item.candidate.resume_text)
            extracted_skill_names = {s["canonical_name"].casefold() for s in extracted_skills_raw}
            expected_skill_names = {s.casefold() for s in item.candidate.expected_skills}

            tp = len(extracted_skill_names.intersection(expected_skill_names))
            fp = len(extracted_skill_names.difference(expected_skill_names))
            fn = len(expected_skill_names.difference(extracted_skill_names))

            total_extracted_tp += tp
            total_extracted_fp += fp
            total_extracted_fn += fn

            if fp > 0 or fn > 0:
                missing = [s for s in item.candidate.expected_skills if s.casefold() not in extracted_skill_names]
                extra = [s["canonical_name"] for s in extracted_skills_raw if s["canonical_name"].casefold() not in expected_skill_names]
                error_logs.append(ErrorAnalysisLog(
                    case_id=item.id,
                    candidate_name=item.candidate.name,
                    job_title=item.job.title,
                    error_category="skill_extraction",
                    details=f"Discrepancy: Missing={missing}, Extra={extra}",
                    suggested_action="Review taxonomy alias mappings or ambiguity boundary patterns.",
                ))

            # 2. Extract Actual Experience and Compute Real MAE
            pred_exp_years = extract_experience_years_from_text(item.candidate.resume_text)
            exp_err = abs((pred_exp_years or 0.0) - item.candidate.expected_experience_years)
            exp_errors.append(exp_err)
            if round(pred_exp_years or 0.0, 1) == round(item.candidate.expected_experience_years, 1):
                exp_exact += 1
            if exp_err > 1.5:
                error_logs.append(ErrorAnalysisLog(
                    case_id=item.id,
                    candidate_name=item.candidate.name,
                    job_title=item.job.title,
                    error_category="experience_drift",
                    details=f"Extracted experience ({pred_exp_years} yrs) drifted from expected ({item.candidate.expected_experience_years} yrs).",
                    suggested_action="Check date boundaries and ongoing tenure calculation against resume text.",
                ))

            # 3. Extract Actual Education and Compute Real Classification Accuracy
            pred_edu_entries = extract_education_from_text(item.candidate.resume_text)
            pred_degree = pred_edu_entries[0].get("degree_level") if pred_edu_entries else None
            is_edu_correct = normalize_degree(pred_degree) == normalize_degree(item.candidate.expected_education_degree)
            if is_edu_correct:
                edu_correct += 1
            else:
                error_logs.append(ErrorAnalysisLog(
                    case_id=item.id,
                    candidate_name=item.candidate.name,
                    job_title=item.job.title,
                    error_category="education_mismatch",
                    details=f"Extracted degree ({pred_degree}) does not match expected ({item.candidate.expected_education_degree}).",
                    suggested_action="Review degree pattern regexes and academic institution boundary parser.",
                ))

            # 4. Mock Entities for Deterministic Engine Run using Actual Predictions
            mock_job = Job(
                title=item.job.title,
                description=item.job.description,
                experience_min_years=item.job.experience_min_years,
                education_required=item.job.education_required,
                skills_weight=item.job.weights["skills"],
                experience_weight=item.job.weights["experience"],
                education_weight=item.job.weights["education"],
                semantic_weight=item.job.weights["semantic"],
                status=JobStatus.OPEN,
            )
            mock_job.skills = [
                JobSkill(name=s, normalized_name=s.casefold(), required=True)
                for s in item.job.required_skills
            ] + [
                JobSkill(name=s, normalized_name=s.casefold(), required=False)
                for s in item.job.preferred_skills
            ]

            mock_cand = CandidateProfile(
                name=item.candidate.name,
                total_experience_years=pred_exp_years,
                education={"degree": pred_degree, "skills": list(extracted_skill_names)},
            )
            mock_resume = Resume(
                extracted_text=item.candidate.resume_text,
            )

            weights = Weights(
                skills=float(item.job.weights["skills"]),
                experience=float(item.job.weights["experience"]),
                education=float(item.job.weights["education"]),
                semantic=float(item.job.weights["semantic"]),
            )

            eval_res = self.engine.evaluate(
                job=mock_job,
                candidate=mock_cand,
                resume=mock_resume,
                weights=weights,
            )

            # 5. Evaluate Required Skill Gap Accuracy
            req_skills_set = {s.casefold() for s in item.job.required_skills}
            system_missing_skills = [
                s["name"] for s in eval_res["evaluated_skills"]
                if s["status"] in (EvaluatedSkillStatus.GAP, EvaluatedSkillStatus.NOT_DETECTED)
                and s["name"].casefold() in req_skills_set
            ]
            expected_missing = item.expected_missing_required_skills

            sys_missing_set = {s.casefold() for s in system_missing_skills}
            exp_missing_set = {s.casefold() for s in expected_missing}

            g_tp = len(sys_missing_set.intersection(exp_missing_set))
            g_fp = len(sys_missing_set.difference(exp_missing_set))
            g_fn = len(exp_missing_set.difference(sys_missing_set))

            gap_tp += g_tp
            gap_fp += g_fp
            gap_fn += g_fn

            # 6. Track Score Correlation
            system_scores.append(eval_res["overall_score"])
            human_ratings.append(item.expected_human_fit_rating)

        # Calculate Skill Extraction Precision, Recall, F1
        prec = total_extracted_tp / (total_extracted_tp + total_extracted_fp) if (total_extracted_tp + total_extracted_fp) > 0 else 0.0
        rec = total_extracted_tp / (total_extracted_tp + total_extracted_fn) if (total_extracted_tp + total_extracted_fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        # Calculate Gap Detection Precision, Recall, F1
        g_prec = gap_tp / (gap_tp + gap_fp) if (gap_tp + gap_fp) > 0 else 1.0
        g_rec = gap_tp / (gap_tp + gap_fn) if (gap_tp + gap_fn) > 0 else 1.0
        g_f1 = (2 * g_prec * g_rec) / (g_prec + g_rec) if (g_prec + g_rec) > 0 else 1.0

        # Spearman's Rank Correlation Coefficient
        spearman_rho = self._calculate_spearman_rho(system_scores, human_ratings)

        return BenchmarkSummaryReport(
            dataset_version="benchmark-v1.0-groundtruth",
            total_test_pairs=len(self.dataset),
            skill_extraction_metrics=ExtractionMetrics(
                true_positives=total_extracted_tp,
                false_positives=total_extracted_fp,
                false_negatives=total_extracted_fn,
                precision=round(prec, 4),
                recall=round(rec, 4),
                f1_score=round(f1, 4),
            ),
            required_gap_metrics=GapDetectionMetrics(
                true_positive_gaps=gap_tp,
                false_positive_gaps=gap_fp,
                false_negative_gaps=gap_fn,
                gap_precision=round(g_prec, 4),
                gap_recall=round(g_rec, 4),
                gap_f1=round(g_f1, 4),
            ),
            experience_tenure_metrics=ExperienceMetrics(
                mean_absolute_error_years=round(sum(exp_errors) / len(exp_errors), 4) if exp_errors else 0.0,
                exact_matches=exp_exact,
                total_evaluated=len(self.dataset),
            ),
            education_hierarchy_metrics=EducationMetrics(
                correct_classifications=edu_correct,
                total_evaluated=len(self.dataset),
                accuracy=round(edu_correct / len(self.dataset), 4) if self.dataset else 1.0,
            ),
            rank_correlation_spearman=round(spearman_rho, 4),
            error_analysis_logs=error_logs,
        )

    def _calculate_spearman_rho(self, x: list[float], y: list[float]) -> float:
        """Calculate Spearman's rank correlation coefficient with tie-averaging."""
        n = len(x)
        if n < 2:
            return 1.0

        def _rank_with_ties(vals: list[float]) -> list[float]:
            sorted_indices = sorted(range(n), key=lambda i: vals[i])
            ranks = [0.0] * n
            i = 0
            while i < n:
                j = i
                while j + 1 < n and vals[sorted_indices[j + 1]] == vals[sorted_indices[i]]:
                    j += 1
                avg_rank = sum(r + 1 for r in range(i, j + 1)) / (j - i + 1)
                for k in range(i, j + 1):
                    ranks[sorted_indices[k]] = avg_rank
                i = j + 1
            return ranks

        rx = _rank_with_ties(x)
        ry = _rank_with_ties(y)

        mean_rx = sum(rx) / n
        mean_ry = sum(ry) / n
        cov = sum((rx[i] - mean_rx) * (ry[i] - mean_ry) for i in range(n))
        var_x = sum((rx[i] - mean_rx) ** 2 for i in range(n))
        var_y = sum((ry[i] - mean_ry) ** 2 for i in range(n))
        if var_x == 0 or var_y == 0:
            return 0.0
        rho = cov / math.sqrt(var_x * var_y)
        return max(-1.0, min(1.0, rho))


def run_ground_truth_evaluation() -> BenchmarkSummaryReport:
    """Entrypoint function to run benchmark evaluation suite."""
    runner = BenchmarkRunner()
    return runner.run_benchmark()
