from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.evaluation.benchmark_runner import run_ground_truth_evaluation
from app.evaluation.benchmark_schema import BenchmarkSummaryReport
from app.models.entities import User
from app.models.enums import UserRole

router = APIRouter(prefix="/evaluation", tags=["evaluation-benchmarks"])


@router.get("/benchmark", response_model=BenchmarkSummaryReport)
def run_benchmark_evaluation(current_user: User = Depends(require_roles(UserRole.ADMIN))) -> BenchmarkSummaryReport:
    """
    Run automated ground-truth benchmark evaluation across diverse test pairs.
    Returns:
    - Skill extraction Precision, Recall, F1
    - Required-Gap Detection Precision & Recall
    - Experience calculation MAE
    - Education classification accuracy
    - Spearman's Rank Correlation Coefficient
    - Systematic Error Analysis Logs
    """
    return run_ground_truth_evaluation()
