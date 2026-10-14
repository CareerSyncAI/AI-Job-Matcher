"""CareerSync AI — Comparative Semantic Similarity Evaluation Runner.

Empirically compares:
1. Baseline: Deterministic token-frequency cosine matcher (tf-cosine-v1)
2. Neural Embedding: Pretrained sentence-transformers/all-MiniLM-L6-v2

Evaluates across:
- Dev Split (15 candidate-job pairs)
- Held-Out Test Split (15 candidate-job pairs)
- Overall Combined Benchmark (30 pairs)

Computes:
- Spearman rank correlation (rho)
- Pearson correlation (r)
- Pairwise ranking ordering accuracy
- Score distribution by relevance tier (strong, partial, weak, insufficient)
- Negative control rejection
- Cold-start and warm inference latencies (mean, p95)
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from typing import Any, Dict, List, Tuple

import numpy as np

from src.similarity.baseline_matcher import BaselineSemanticMatcher
from src.similarity.embedding_matcher import SentenceEmbeddingMatcher


def compute_spearman_rho(x: List[float], y: List[float]) -> float:
    """Computes Spearman rank correlation coefficient between predictions and ordinal ground truth."""
    if len(x) < 2:
        return 0.0

    def get_ranks(seq: List[float]) -> List[float]:
        sorted_indices = sorted(range(len(seq)), key=lambda i: seq[i])
        ranks = [0.0] * len(seq)
        i = 0
        while i < len(seq):
            j = i
            while j < len(seq) and seq[sorted_indices[j]] == seq[sorted_indices[i]]:
                j += 1
            avg_rank = (i + j + 1) / 2.0
            for k in range(i, j):
                ranks[sorted_indices[k]] = avg_rank
            i = j
        return ranks

    rank_x = get_ranks(x)
    rank_y = get_ranks(y)

    mean_rx = sum(rank_x) / len(rank_x)
    mean_ry = sum(rank_y) / len(rank_y)

    numerator = sum((rx - mean_rx) * (ry - mean_ry) for rx, ry in zip(rank_x, rank_y))
    den_x = math.sqrt(sum((rx - mean_rx) ** 2 for rx in rank_x))
    den_y = math.sqrt(sum((ry - mean_ry) ** 2 for ry in rank_y))

    if den_x == 0.0 or den_y == 0.0:
        return 0.0
    return numerator / (den_x * den_y)


def compute_pearson_r(x: List[float], y: List[float]) -> float:
    """Computes standard Pearson correlation coefficient."""
    if len(x) < 2:
        return 0.0
    mean_x = sum(x) / len(x)
    mean_y = sum(y) / len(y)

    num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    den = math.sqrt(sum((xi - mean_x) ** 2 for xi in x) * sum((yi - mean_y) ** 2 for yi in y))
    if den == 0.0:
        return 0.0
    return num / den


def compute_pairwise_accuracy(scores: List[float], ground_truth: List[int]) -> float:
    """Computes percentage of valid pairs where higher ground truth is correctly assigned higher score."""
    total_pairs = 0
    correct_pairs = 0
    ties = 0

    n = len(scores)
    for i in range(n):
        for j in range(i + 1, n):
            gt_i, gt_j = ground_truth[i], ground_truth[j]
            sc_i, sc_j = scores[i], scores[j]

            if gt_i > gt_j:
                total_pairs += 1
                if sc_i > sc_j:
                    correct_pairs += 1
                elif sc_i == sc_j:
                    ties += 1
            elif gt_j > gt_i:
                total_pairs += 1
                if sc_j > sc_i:
                    correct_pairs += 1
                elif sc_i == sc_j:
                    ties += 1

    if total_pairs == 0:
        return 0.0
    # Strict accuracy: ties are considered incorrect for distinct ordinal categories
    return (correct_pairs / total_pairs) * 100.0


def evaluate_engine_on_split(
    engine: Any,
    pairs: List[Dict[str, Any]],
    is_embedding: bool = False
) -> Dict[str, Any]:
    """Runs evaluation on a specific split of candidate-job pairs."""
    scores = []
    raw_sims = []
    latencies = []
    tier_scores: Dict[str, List[float]] = {
        "strong_match": [],
        "partial_match": [],
        "weak_match": [],
        "insufficient_information": []
    }
    ordinals = []
    negative_scores = []

    for p in pairs:
        cand = p["candidate_profile"]
        job = p["job_requisition"]
        gt_label = p["relevance_label"]
        ordinal = p["expected_ordinal"]
        ordinals.append(ordinal)

        start_t = time.perf_counter()
        out = engine.match(cand, job)
        lat_ms = (time.perf_counter() - start_t) * 1000

        score = float(out.similarity_index)
        raw_sim = float(out.raw_similarity)

        scores.append(score)
        raw_sims.append(raw_sim)
        latencies.append(lat_ms)

        if gt_label in tier_scores:
            tier_scores[gt_label].append(score)

        if "Negative Control" in p.get("role_family", ""):
            negative_scores.append(score)

    rho = compute_spearman_rho(scores, [float(o) for o in ordinals])
    pearson = compute_pearson_r(scores, [float(o) for o in ordinals])
    pairwise_acc = compute_pairwise_accuracy(scores, ordinals)

    tier_means = {
        tier: round(sum(vals) / len(vals), 2) if vals else 0.0
        for tier, vals in tier_scores.items()
    }

    return {
        "sample_size": len(pairs),
        "spearman_rho": round(rho, 4),
        "pearson_r": round(pearson, 4),
        "pairwise_accuracy_pct": round(pairwise_acc, 2),
        "tier_mean_scores": tier_means,
        "negative_control_mean_score": round(sum(negative_scores) / len(negative_scores), 2) if negative_scores else 0.0,
        "latency_ms": {
            "mean": round(float(np.mean(latencies)), 2),
            "median": round(float(np.median(latencies)), 2),
            "p95": round(float(np.percentile(latencies, 95)), 2),
            "min": round(float(np.min(latencies)), 2),
            "max": round(float(np.max(latencies)), 2)
        }
    }


def main():
    benchmark_path = os.path.join(
        os.path.dirname(__file__), "fixtures", "evaluation", "evaluation_benchmark.json"
    )

    if not os.path.exists(benchmark_path):
        print(f"[Error] Benchmark file not found at: {benchmark_path}")
        sys.exit(1)

    with open(benchmark_path, "r", encoding="utf-8") as f:
        benchmark_data = json.load(f)

    all_pairs = benchmark_data["pairs"]
    dev_pairs = [p for p in all_pairs if p["split"] == "dev"]
    test_pairs = [p for p in all_pairs if p["split"] == "held_out_test"]

    print("=" * 78)
    print("CAREERSYNC AI - COMPARATIVE SEMANTIC MATCHING EVALUATION")
    print("=" * 78)
    print(f"Total pairs: {len(all_pairs)} | Dev split: {len(dev_pairs)} | Held-out test split: {len(test_pairs)}")

    # 1. Initialize Baseline
    start_b = time.perf_counter()
    baseline = BaselineSemanticMatcher()
    b_init_ms = (time.perf_counter() - start_b) * 1000

    # 2. Initialize Pretrained Embedding Matcher
    start_e = time.perf_counter()
    embedding = SentenceEmbeddingMatcher(lazy_load=False)
    e_init_ms = (time.perf_counter() - start_e) * 1000

    print(f"\nCold-Start Initialization Latency:")
    print(f"  - Baseline (tf-cosine-v1):               {b_init_ms:.2f} ms")
    print(f"  - Neural (all-MiniLM-L6-v2):             {e_init_ms:.2f} ms")

    # Evaluate on Dev Split
    baseline_dev = evaluate_engine_on_split(baseline, dev_pairs, is_embedding=False)
    embedding_dev = evaluate_engine_on_split(embedding, dev_pairs, is_embedding=True)

    # Evaluate on Held-Out Test Split
    baseline_test = evaluate_engine_on_split(baseline, test_pairs, is_embedding=False)
    embedding_test = evaluate_engine_on_split(embedding, test_pairs, is_embedding=True)

    # Evaluate on Combined Split
    baseline_combined = evaluate_engine_on_split(baseline, all_pairs, is_embedding=False)
    embedding_combined = evaluate_engine_on_split(embedding, all_pairs, is_embedding=True)

    # Compile Final Report
    report = {
        "metadata": {
            "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "benchmark_version": benchmark_data["benchmark_metadata"]["version"],
            "models_evaluated": {
                "baseline": {
                    "engine": baseline.engine_name,
                    "method": baseline.method_name,
                    "dimensions": baseline.vector_dimensions,
                    "cold_start_ms": round(b_init_ms, 2)
                },
                "embedding": {
                    "engine": embedding.model_id,
                    "revision": embedding.model_revision,
                    "method": embedding.method_name,
                    "dimensions": embedding.vector_dimensions,
                    "device": embedding.device,
                    "cold_start_ms": round(e_init_ms, 2)
                }
            },
            "limitations_and_qualifications": [
                "Small exploratory sample size (N=30 total: 15 dev, 15 held-out). Not statistically sufficient to claim generalized production-level hiring ranking accuracy.",
                "Synthetic and curated benchmark archetypes do not substitute for multi-annotator, independently reviewed real recruiter evaluation sets.",
                "Metric scores represent text-vector geometric similarity, NOT hiring suitability, candidate competency, or model confidence.",
                "Held-out split was strictly held out and not used for model hyperparameter or threshold tuning."
            ]
        },
        "dev_split": {
            "baseline": baseline_dev,
            "embedding": embedding_dev
        },
        "held_out_test_split": {
            "baseline": baseline_test,
            "embedding": embedding_test
        },
        "overall_benchmark": {
            "baseline": baseline_combined,
            "embedding": embedding_combined
        }
    }

    report_path = os.path.join(os.path.dirname(__file__), "evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Print Clean Summary Table
    print("\n" + "=" * 78)
    print(f"{'EVALUATION METRIC':<36} | {'BASELINE (TF-Cosine)':<18} | {'NEURAL (all-MiniLM-L6-v2)':<20}")
    print("-" * 78)
    print(f"{'Dev Split - Spearman Rho':<36} | {baseline_dev['spearman_rho']:<18} | {embedding_dev['spearman_rho']:<20}")
    print(f"{'Dev Split - Pairwise Accuracy':<36} | {str(baseline_dev['pairwise_accuracy_pct']) + '%' :<18} | {str(embedding_dev['pairwise_accuracy_pct']) + '%' :<20}")
    print("-" * 78)
    print(f"{'Held-Out Test - Spearman Rho':<36} | {baseline_test['spearman_rho']:<18} | {embedding_test['spearman_rho']:<20}")
    print(f"{'Held-Out Test - Pearson r':<36} | {baseline_test['pearson_r']:<18} | {embedding_test['pearson_r']:<20}")
    print(f"{'Held-Out Test - Pairwise Accuracy':<36} | {str(baseline_test['pairwise_accuracy_pct']) + '%' :<18} | {str(embedding_test['pairwise_accuracy_pct']) + '%' :<20}")
    print("-" * 78)
    print(f"{'Overall Spearman Rho (N=30)':<36} | {baseline_combined['spearman_rho']:<18} | {embedding_combined['spearman_rho']:<20}")
    print(f"{'Overall Pairwise Accuracy (N=30)':<36} | {str(baseline_combined['pairwise_accuracy_pct']) + '%' :<18} | {str(embedding_combined['pairwise_accuracy_pct']) + '%' :<20}")
    print("-" * 78)
    print(f"{'Tier Mean: Strong Match':<36} | {baseline_combined['tier_mean_scores']['strong_match']:<18} | {embedding_combined['tier_mean_scores']['strong_match']:<20}")
    print(f"{'Tier Mean: Partial Match':<36} | {baseline_combined['tier_mean_scores']['partial_match']:<18} | {embedding_combined['tier_mean_scores']['partial_match']:<20}")
    print(f"{'Tier Mean: Weak Match (Negative)':<36} | {baseline_combined['tier_mean_scores']['weak_match']:<18} | {embedding_combined['tier_mean_scores']['weak_match']:<20}")
    print(f"{'Negative Control Rejection Score':<36} | {baseline_combined['negative_control_mean_score']:<18} | {embedding_combined['negative_control_mean_score']:<20}")
    print("-" * 78)
    print(f"{'Warm Inference Latency (Mean)':<36} | {str(baseline_combined['latency_ms']['mean']) + ' ms':<18} | {str(embedding_combined['latency_ms']['mean']) + ' ms':<20}")
    print(f"{'Warm Inference Latency (p95)':<36} | {str(baseline_combined['latency_ms']['p95']) + ' ms':<18} | {str(embedding_combined['latency_ms']['p95']) + ' ms':<20}")
    print("=" * 78)
    print(f"\n[OK] Full empirical audit report successfully written to: {report_path}\n")


if __name__ == "__main__":
    main()
