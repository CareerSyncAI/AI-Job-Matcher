"""Run the evaluation-only matching challenge against the repository's two engines.

From ai-services: python benchmarks/run_challenge.py
Requires the configured MiniLM revision in the local Hugging Face cache.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import platform
import statistics
import sys
import time
from importlib.metadata import version
from pathlib import Path
from typing import Any
from unittest.mock import Mock, patch

SERVICE_ROOT = Path(__file__).resolve().parents[1]
FIXTURE = SERVICE_ROOT / "fixtures" / "evaluation" / "challenge_benchmark.json"

if __name__ == "__main__":
    sys.path.insert(0, str(SERVICE_ROOT))

from src.similarity.base import BaseSimilarityEngine, SemanticMatchOutput  # noqa: E402
from src.similarity.baseline_matcher import BaselineSemanticMatcher  # noqa: E402
from src.similarity.embedding_matcher import SentenceEmbeddingMatcher  # noqa: E402


def load_groups() -> list[dict[str, Any]]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))["groups"]


def run_groups(
    matcher: BaseSimilarityEngine, groups: list[dict[str, Any]], *, clear_job_cache: bool = False
) -> tuple[dict[str, SemanticMatchOutput], list[float]]:
    outputs = {}
    latencies = []
    for group in groups:
        for case in group["cases"]:
            if clear_job_cache:
                assert isinstance(matcher, SentenceEmbeddingMatcher)
                matcher._job_embedding_cache.clear()
            started = time.perf_counter()
            output = matcher.match(case["candidate_profile"], group["job_requisition"])
            latencies.append((time.perf_counter() - started) * 1000)
            if output.status != "ok":
                raise RuntimeError(f"{case['id']}: {output.status}: {output.fallback_reason}")
            outputs[case["id"]] = output
    return outputs, latencies


def evidence_metrics(
    groups: list[dict[str, Any]], outputs: dict[str, SemanticMatchOutput]
) -> dict[str, Any]:
    counts = {
        "true_positives": 0,
        "true_negatives": 0,
        "false_positives": 0,
        "false_negatives": 0,
        "status_matches": 0,
        "requirement_rows_omitted": 0,
        "expected_supported_mandatory_missed": 0,
        "unsupported_mandatory_marked_supported": 0,
        "mandatory_rows_omitted": 0,
    }
    mismatches = []
    for group in groups:
        required = group["job_requisition"]["required_skills"]
        for case in group["cases"]:
            actual = {
                (e["category"], e["requirement"]): e
                for e in outputs[case["id"]].evidence_breakdown
            }
            for requirement, expected in case["expected_evidence"].items():
                mandatory = requirement in required
                row = actual.get(("required" if mandatory else "preferred", requirement))
                status = row["status"] if row is not None else None
                if row is None:
                    counts["requirement_rows_omitted"] += 1
                    counts["mandatory_rows_omitted"] += int(mandatory)
                if status == expected:
                    counts["status_matches"] += 1
                else:
                    mismatches.append({
                        "case": case["id"],
                        "requirement": requirement,
                        "mandatory": mandatory,
                        "expected": expected,
                        "actual": status,
                        "verification_type": row["verification_type"] if row is not None else None,
                    })

                if expected == "supported":
                    if status == "supported":
                        counts["true_positives"] += 1
                    else:
                        counts["false_negatives"] += 1
                        counts["expected_supported_mandatory_missed"] += int(mandatory)
                elif status == "supported":
                    counts["false_positives"] += 1
                    counts["unsupported_mandatory_marked_supported"] += int(mandatory)
                else:
                    counts["true_negatives"] += int(row is not None)

    return {**counts, "mismatches": mismatches}


def ordered_results(
    groups: list[dict[str, Any]],
    outputs: dict[str, SemanticMatchOutput],
    label: str,
    score_field: str,
    *,
    required_first: bool = False,
) -> dict[str, Any]:
    counts: dict[str, Any] = {"correct": 0, "ties": 0, "reversed": 0, "disagreements": []}
    for group in groups:
        required = set(group["job_requisition"]["required_skills"])
        for higher, lower, _ in group[label]:
            high = outputs[higher]
            low = outputs[lower]
            high_score = getattr(high, score_field)
            low_score = getattr(low, score_field)
            high_complete = required.issubset(high.evidence_status["supported"])
            low_complete = required.issubset(low.evidence_status["supported"])
            if required_first and high_complete != low_complete:
                result = "correct" if high_complete else "reversed"
            elif math.isclose(high_score, low_score, rel_tol=0.0, abs_tol=1e-7):
                result = "ties"
            else:
                result = "correct" if high_score > low_score else "reversed"
            counts[result] += 1
            if result != "correct":
                counts["disagreements"].append({
                    "higher_expected": higher,
                    "lower_expected": lower,
                    "scores": [round(high_score, 4), round(low_score, 4)],
                    "result": result,
                })
    return counts


def distribution(values: list[float]) -> dict[str, float]:
    ordered = sorted(values)
    return {
        "min": round(ordered[0], 4),
        "median": round(statistics.median(ordered), 4),
        "p95_nearest_rank": round(ordered[math.ceil(0.95 * len(ordered)) - 1], 4),
        "max": round(ordered[-1], 4),
    }


def characterize(
    groups: list[dict[str, Any]], outputs: dict[str, SemanticMatchOutput]
) -> dict[str, Any]:
    scores = [output.similarity_index for output in outputs.values()]
    raw = [output.diagnostics["unclamped_raw_cosine"] for output in outputs.values()]
    return {
        "evidence": evidence_metrics(groups, outputs),
        "semantic_order_raw": ordered_results(groups, outputs, "semantic_order", "raw_similarity"),
        "semantic_order_display": ordered_results(
            groups, outputs, "semantic_order", "similarity_index"
        ),
        "qualification_order_raw": ordered_results(
            groups, outputs, "qualification_order", "raw_similarity"
        ),
        "qualification_order_display": ordered_results(
            groups, outputs, "qualification_order", "similarity_index"
        ),
        "qualification_order_supported_mandatory_first": ordered_results(
            groups, outputs, "qualification_order", "raw_similarity", required_first=True
        ),
        "unclamped_score_distribution": distribution(raw),
        "display_score_distribution": distribution(scores),
        "display_scores_at_100": sum(score == 100.0 for score in scores),
        "display_scores_at_least_90": sum(score >= 90.0 for score in scores),
        "display_scores_at_zero": sum(score == 0.0 for score in scores),
        "scores_by_case": {
            case_id: {
                "unclamped": output.diagnostics["unclamped_raw_cosine"],
                "display": output.similarity_index,
            }
            for case_id, output in outputs.items()
        },
    }


def failure_probes(
    groups: list[dict[str, Any]], baseline: dict[str, SemanticMatchOutput]
) -> dict[str, Any]:
    group = groups[0]
    case = group["cases"][0]
    profile = case["candidate_profile"]
    job = group["job_requisition"]
    expected = baseline[case["id"]]
    report = {}

    for failure in ("model_load", "encode"):
        for fallback_enabled in (True, False):
            matcher = SentenceEmbeddingMatcher(fallback_enabled=fallback_enabled)
            encode_error = RuntimeError("controlled encode failure")
            fake_model = Mock()
            fake_model.encode.side_effect = encode_error
            match_args = {"side_effect": RuntimeError("controlled model load failure")}
            if failure == "encode":
                match_args = {"return_value": fake_model}
                matcher._tokenizer = Mock()
                matcher._tokenizer.encode.return_value = [1]
                matcher._tokenizer.decode.return_value = "controlled input"

            with patch.object(matcher, "_ensure_model_loaded", **match_args):
                started = time.perf_counter()
                if fallback_enabled:
                    output = matcher.match(profile, job)
                    elapsed = (time.perf_counter() - started) * 1000
                    assert output.status == output.method == "fallback"
                    assert output.fallback_reason and failure.split("_")[-1] in output.fallback_reason
                    assert output.evidence_breakdown == expected.evidence_breakdown
                    assert math.isclose(output.raw_similarity, expected.raw_similarity, abs_tol=1e-7)
                    report[f"{failure}_fallback_enabled"] = {
                        "method": output.method,
                        "status": output.status,
                        "reason": output.fallback_reason,
                        "baseline_score_and_evidence_match": True,
                        "duration_ms": round(elapsed, 4),
                    }
                else:
                    try:
                        matcher.match(profile, job)
                    except RuntimeError as exc:
                        assert failure.split("_")[-1] in str(exc)
                        report[f"{failure}_fallback_disabled"] = {"raised": str(exc)}
                    else:
                        raise AssertionError(f"{failure} should propagate with fallback disabled")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repeats", type=int, default=3, help="Warm timing rounds per engine")
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats must be at least 1")

    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

    groups = load_groups()
    first_job = groups[0]["job_requisition"]
    first_profile = groups[0]["cases"][0]["candidate_profile"]

    started = time.perf_counter()
    baseline = BaselineSemanticMatcher()
    baseline.match(first_profile, first_job)
    baseline_cold = (time.perf_counter() - started) * 1000

    started = time.perf_counter()
    embedding = SentenceEmbeddingMatcher(fallback_enabled=False, lazy_load=False)
    embedding_load = (time.perf_counter() - started) * 1000
    started = time.perf_counter()
    first_embedding = embedding.match(first_profile, first_job)
    embedding_first_match = (time.perf_counter() - started) * 1000

    baseline_latencies: list[float] = []
    for _ in range(args.repeats):
        baseline_outputs, latencies = run_groups(baseline, groups)
        baseline_latencies.extend(latencies)

    # Discard common initialization costs above, then compare identical cases with
    # a cleared cache per request or a cache primed for every requisition.
    cold_job_latencies: list[float] = []
    warm_job_latencies: list[float] = []
    for repeat in range(args.repeats):
        cold_first = repeat % 2 == 0
        for clear_job_cache in (cold_first, not cold_first):
            if clear_job_cache:
                cold_outputs, latencies = run_groups(embedding, groups, clear_job_cache=True)
                cold_job_latencies.extend(latencies)
            else:
                run_groups(embedding, groups)
                embedding_outputs, latencies = run_groups(embedding, groups)
                warm_job_latencies.extend(latencies)
                warm_cache_entries = len(embedding._job_embedding_cache)

    for case_id, warm in embedding_outputs.items():
        cold = cold_outputs[case_id]
        assert math.isclose(warm.raw_similarity, cold.raw_similarity, abs_tol=1e-7), case_id
        assert warm.evidence_breakdown == cold.evidence_breakdown, case_id
    parity = {
        "cases": len(baseline_outputs),
        "cases_with_status_differences": [
            case_id
            for case_id, result in baseline_outputs.items()
            if result.evidence_status != embedding_outputs[case_id].evidence_status
        ],
        "cases_with_breakdown_differences": [
            case_id
            for case_id, result in baseline_outputs.items()
            if result.evidence_breakdown != embedding_outputs[case_id].evidence_breakdown
        ],
    }

    report = {
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "torch": version("torch"),
            "sentence_transformers": version("sentence-transformers"),
            "transformers": version("transformers"),
            "model_info": first_embedding.model_info,
            "embedding_method": first_embedding.method,
        },
        "requisitions": len(groups),
        "cases": len(baseline_outputs),
        "timing_rounds": args.repeats,
        "timing_sample_count_per_phase": len(warm_job_latencies),
        "latency_ms": {
            "baseline_first_match_including_init": round(baseline_cold, 4),
            "baseline_warm": distribution(baseline_latencies),
            "embedding_model_load": round(embedding_load, 4),
            "embedding_first_match_after_model_load": round(embedding_first_match, 4),
            "embedding_cold_end_to_end": round(embedding_load + embedding_first_match, 4),
            "embedding_warm_cache_cold": distribution(cold_job_latencies),
            "embedding_warm_cache_hot": distribution(warm_job_latencies),
        },
        "cache": {
            "entries_after_warm_run": warm_cache_entries,
            "scores_and_evidence_match": True,
        },
        "baseline": characterize(groups, baseline_outputs),
        "embedding": characterize(groups, embedding_outputs),
        "evidence_parity": parity,
        "failure_probes": failure_probes(groups, baseline_outputs),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
