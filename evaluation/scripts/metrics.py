"""Ranking evaluation metrics for CareerSync AI.

Implements:
1. DCG@K and NDCG@K (Normalized Discounted Cumulative Gain)
2. MRR (Mean Reciprocal Rank)
3. Precision@K
4. Macro-averaging across job requisition pools
5. Non-parametric Bootstrap 95% Confidence Intervals
"""

from __future__ import annotations

import math
from typing import Any
import numpy as np


def compute_dcg(relevance_scores: list[int | float], k: int = 5) -> float:
    """Computes Discounted Cumulative Gain at rank K."""
    scores = relevance_scores[:k]
    dcg = 0.0
    for idx, rel in enumerate(scores):
        # 2^rel - 1 formulation rewards strong matches
        gain = (2.0 ** float(rel)) - 1.0
        discount = math.log2(idx + 2)  # idx 0 -> log2(2) = 1.0
        dcg += gain / discount
    return dcg


def compute_ndcg_at_k(actual_relevances: list[int | float], k: int = 5) -> float:
    """Computes Normalized Discounted Cumulative Gain at rank K.
    
    actual_relevances must be in the order ranked by the algorithm under evaluation.
    """
    if not actual_relevances:
        return 0.0
    actual_dcg = compute_dcg(actual_relevances, k=k)
    ideal_order = sorted(actual_relevances, reverse=True)
    ideal_dcg = compute_dcg(ideal_order, k=k)
    if ideal_dcg == 0.0:
        return 0.0
    return actual_dcg / ideal_dcg


def compute_reciprocal_rank(actual_relevances: list[int | float], target_tier: int = 3) -> float:
    """Computes reciprocal rank (1/rank) of the first target_tier candidate (e.g. Strong Match)."""
    for rank_idx, rel in enumerate(actual_relevances, start=1):
        if rel >= target_tier:
            return 1.0 / rank_idx
    return 0.0


def compute_precision_at_k(actual_relevances: list[int | float], k: int = 5, min_tier: int = 2) -> float:
    """Computes proportion of top-K candidates that meet or exceed min_tier (e.g. Strong or Partial Match)."""
    top_k = actual_relevances[:k]
    if not top_k:
        return 0.0
    matching = sum(1 for rel in top_k if rel >= min_tier)
    return matching / len(top_k)


def evaluate_job_pool(candidate_evaluations: list[dict[str, Any]], score_key: str = "similarity_score", k: int = 5) -> dict[str, float]:
    """Evaluates a single job's candidate pool by sorting candidates by algorithm score.
    
    candidate_evaluations items must have:
      - score_key (e.g. similarity_score or raw_similarity)
      - "relevance_rating" (ground truth integer [0..3])
    """
    # Sort candidates descending by model predicted score
    sorted_candidates = sorted(candidate_evaluations, key=lambda c: float(c.get(score_key, 0.0)), reverse=True)
    ranked_ground_truth = [c["relevance_rating"] for c in sorted_candidates]

    ndcg5 = compute_ndcg_at_k(ranked_ground_truth, k=5)
    ndcg10 = compute_ndcg_at_k(ranked_ground_truth, k=10)
    mrr = compute_reciprocal_rank(ranked_ground_truth, target_tier=3)
    p5 = compute_precision_at_k(ranked_ground_truth, k=5, min_tier=2)

    return {
        "ndcg@5": ndcg5,
        "ndcg@10": ndcg10,
        "mrr": mrr,
        "precision@5": p5,
        "candidate_count": len(sorted_candidates)
    }


def compute_macro_metrics(per_job_metrics: list[dict[str, float]]) -> dict[str, Any]:
    """Computes macro-averages and bootstrap 95% confidence intervals across job requisitions."""
    if not per_job_metrics:
        return {}

    keys = ["ndcg@5", "ndcg@10", "mrr", "precision@5"]
    macro = {}

    for k in keys:
        values = np.array([m[k] for m in per_job_metrics], dtype=np.float64)
        mean_val = float(np.mean(values))
        std_val = float(np.std(values))

        # Bootstrap 95% Confidence Interval (1,000 resamples)
        if len(values) > 1:
            n_boot = 1000
            indices = np.random.randint(0, len(values), size=(n_boot, len(values)))
            boot_means = np.mean(values[indices], axis=1)
            ci_lower = float(np.percentile(boot_means, 2.5))
            ci_upper = float(np.percentile(boot_means, 97.5))
        else:
            ci_lower = mean_val
            ci_upper = mean_val

        macro[k] = {
            "mean": round(mean_val, 4),
            "std": round(std_val, 4),
            "ci_95": [round(ci_lower, 4), round(ci_upper, 4)],
        }

    macro["jobs_evaluated"] = len(per_job_metrics)
    return macro
