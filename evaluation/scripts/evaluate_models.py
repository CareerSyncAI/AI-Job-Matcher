"""Sequential model evaluation runner for CareerSync AI.

Evaluates semantic matching models sequentially to respect the conservative RAM budget:
1. Baseline: SublinearTFCosineMatcher
2. Embedding: sentence-transformers/all-MiniLM-L6-v2
3. Optional: BAAI/bge-small-en-v1.5, microsoft/harrier-oss-v1-270m

Computes per-job Macro-NDCG@5, MRR, Precision@5, and 95% bootstrap confidence intervals.
"""

from __future__ import annotations

import gc
import json
import os
import sys
import time
from typing import Any

base_dir = r"C:\Users\Hit\Desktop\SGP 5TH Sem\AI-Job-Matcher"
sys.path.insert(0, os.path.join(base_dir, "ai-services"))
sys.path.insert(0, os.path.join(base_dir, "backend"))
sys.path.insert(0, os.path.join(base_dir, "evaluation", "scripts"))

from metrics import evaluate_job_pool, compute_macro_metrics
from src.similarity.baseline_matcher import BaselineSemanticMatcher
from src.similarity.embedding_matcher import SentenceEmbeddingMatcher


def load_dataset(dataset_path: str) -> list[dict[str, Any]]:
    with open(dataset_path, "r", encoding="utf-8") as f:
        return json.load(f)


def evaluate_matcher_on_corpus(
    matcher_name: str,
    matcher_instance: Any,
    pairs: list[dict[str, Any]],
    split_filter: str | None = None
) -> dict[str, Any]:
    """Runs a single matcher sequentially over a set of pairs grouped by job."""
    filtered_pairs = [p for p in pairs if split_filter is None or p.get("split") == split_filter]
    if not filtered_pairs:
        return {}

    # Group pairs by job_id
    jobs_map: dict[str, list[dict[str, Any]]] = {}
    for p in filtered_pairs:
        j_id = p["job_id"]
        if j_id not in jobs_map:
            jobs_map[j_id] = []
        jobs_map[j_id].append(p)

    total_latencies = []
    per_job_results = []

    for j_id, job_pairs in jobs_map.items():
        evaluated_candidates = []
        for p in job_pairs:
            cand_profile = p["candidate_profile"]
            job_req = p["job_requisition"]

            t0 = time.perf_counter()
            output = matcher_instance.match(cand_profile, job_req)
            dt_ms = (time.perf_counter() - t0) * 1000
            total_latencies.append(dt_ms)

            # Score used for ranking
            raw_sim = getattr(output, "raw_similarity", 0.0) or 0.0
            sim_idx = getattr(output, "similarity_index", 0.0) or (raw_sim * 100.0)

            evaluated_candidates.append({
                "candidate_id": p["candidate_id"],
                "relevance_rating": p["relevance_rating"],
                "similarity_score": sim_idx,
                "raw_similarity": raw_sim
            })

        job_metrics = evaluate_job_pool(evaluated_candidates, score_key="similarity_score", k=5)
        job_metrics["job_id"] = j_id
        job_metrics["job_title"] = job_pairs[0]["job_requisition"]["title"]
        per_job_results.append(job_metrics)

    macro = compute_macro_metrics(per_job_results)
    avg_latency = float(sum(total_latencies) / max(1, len(total_latencies)))

    return {
        "matcher": matcher_name,
        "split": split_filter or "all",
        "pairs_evaluated": len(filtered_pairs),
        "jobs_evaluated": len(jobs_map),
        "avg_latency_ms": round(avg_latency, 2),
        "macro_metrics": macro,
        "per_job_metrics": per_job_results
    }


def run_sequential_evaluation(models_to_test: list[str] | None = None):
    print("=" * 70)
    print("CAREERSYNC AI — SEQUENTIAL MODEL EVALUATION RUNNER")
    print("=" * 70)

    corpus_path = os.path.join(base_dir, "evaluation", "data", "evaluation_corpus.json")
    if not os.path.exists(corpus_path):
        print(f"Error: evaluation corpus not found at {corpus_path}")
        return

    pairs = load_dataset(corpus_path)
    print(f"Loaded {len(pairs)} pairs from evaluation_corpus.json")

    models_to_run = models_to_test or ["baseline", "minilm"]
    summary_report = {}

    for model_key in models_to_run:
        print(f"\n" + "-" * 50)
        print(f"INITIALIZING MODEL: {model_key}")
        print("-" * 50)

        t_load = time.perf_counter()
        if model_key == "baseline":
            matcher = BaselineSemanticMatcher()
            display_name = "TF-Cosine Baseline (Sublinear)"
        elif model_key == "minilm":
            matcher = SentenceEmbeddingMatcher(
                model_id="sentence-transformers/all-MiniLM-L6-v2",
                device="cpu",
                lazy_load=False
            )
            display_name = "MiniLM-L6-v2 (Embedding)"
        elif model_key == "bge-small":
            matcher = SentenceEmbeddingMatcher(
                model_id="BAAI/bge-small-en-v1.5",
                device="cpu",
                lazy_load=False
            )
            display_name = "BGE-Small-en-v1.5 (Embedding)"
        else:
            print(f"Unknown model key {model_key}, skipping.")
            continue

        load_ms = (time.perf_counter() - t_load) * 1000
        print(f"Loaded in {load_ms:.2f} ms")

        # Evaluate on Development Split (48 pairs, 6 jobs)
        print("Evaluating on Development Split (48 pairs)...")
        dev_res = evaluate_matcher_on_corpus(display_name, matcher, pairs, split_filter="development")
        dev_macro = dev_res["macro_metrics"]
        print(f"  [Dev] Macro-NDCG@5: {dev_macro['ndcg@5']['mean']} (CI 95%: {dev_macro['ndcg@5']['ci_95']}) | MRR: {dev_macro['mrr']['mean']} | Latency: {dev_res['avg_latency_ms']} ms/pair")

        # Evaluate on Held-Out Split (72 pairs, 9 jobs)
        print("Evaluating on Held-Out Split (72 pairs)...")
        held_res = evaluate_matcher_on_corpus(display_name, matcher, pairs, split_filter="held_out")
        held_macro = held_res["macro_metrics"]
        print(f"  [Held-Out] Macro-NDCG@5: {held_macro['ndcg@5']['mean']} (CI 95%: {held_macro['ndcg@5']['ci_95']}) | MRR: {held_macro['mrr']['mean']} | Latency: {held_res['avg_latency_ms']} ms/pair")

        summary_report[model_key] = {
            "display_name": display_name,
            "development": dev_macro,
            "held_out": held_macro,
            "dev_latency_ms": dev_res["avg_latency_ms"],
            "held_latency_ms": held_res["avg_latency_ms"]
        }

        # Explicit garbage collection and memory cleanup before next model
        del matcher
        gc.collect()

    # Save summary results
    out_results_path = os.path.join(base_dir, "evaluation", "data", "evaluation_results_summary.json")
    with open(out_results_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)

    print("\n" + "=" * 70)
    print("EVALUATION RUN COMPLETE — SUMMARY OF RESULTS")
    print("=" * 70)
    for mk, res in summary_report.items():
        print(f"Model: {res['display_name']}")
        print(f"  Development Split: Macro-NDCG@5 = {res['development']['ndcg@5']['mean']} (95% CI: {res['development']['ndcg@5']['ci_95']}) | MRR = {res['development']['mrr']['mean']}")
        print(f"  Held-Out Split:    Macro-NDCG@5 = {res['held_out']['ndcg@5']['mean']} (95% CI: {res['held_out']['ndcg@5']['ci_95']}) | MRR = {res['held_out']['mrr']['mean']}")
        print(f"  Inference Latency: {res['held_latency_ms']} ms/pair")
    print(f"\nDetailed JSON saved to: {out_results_path}")


if __name__ == "__main__":
    run_sequential_evaluation()
