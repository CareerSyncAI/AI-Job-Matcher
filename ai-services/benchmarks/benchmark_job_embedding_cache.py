"""Offline, reproducible before/after benchmark for per-job embedding reuse.

Run from ai-services with:
    python benchmarks/benchmark_job_embedding_cache.py --repeats 6

The model must already exist in the local Hugging Face cache. Model loading and
one throwaway forward pass are excluded so timings isolate match inference.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
from pathlib import Path
from types import MethodType
from typing import Any

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.similarity.embedding_matcher import SentenceEmbeddingMatcher  # noqa: E402

JOB = {
    "title": "Senior Python API Engineer",
    "required_skills": ["Python", "FastAPI", "PostgreSQL"],
    "preferred_skills": ["Docker"],
    "description": (
        "Build scalable Python API services with FastAPI, PostgreSQL, "
        "automated tests and container deployments."
    ),
}


def candidate(index: int) -> dict[str, Any]:
    return {
        "headline": "Backend Engineer",
        "skills": ["Python", "Django", "PostgreSQL"],
        "experience_summary": (
            f"Synthetic candidate {index} builds Python backend services, "
            "APIs, database integrations, and automated tests."
        ),
    }


def timed_match(matcher: SentenceEmbeddingMatcher, index: int) -> tuple[float, float]:
    started = time.perf_counter()
    output = matcher.match(candidate(index), JOB)
    return (time.perf_counter() - started) * 1000, output.raw_similarity


def run_phase(matcher: SentenceEmbeddingMatcher, repeats: int) -> dict[str, Any]:
    cold_ms, cold_score = timed_match(matcher, 0)
    repeated = [timed_match(matcher, i) for i in range(1, repeats + 1)]
    repeated_times = [elapsed for elapsed, _ in repeated]
    return {
        "cache_cold_match_ms": round(cold_ms, 2),
        "repeated_match_ms": [round(value, 2) for value in repeated_times],
        "repeated_match_median_ms": round(statistics.median(repeated_times), 2),
        "scores": [cold_score, *(score for _, score in repeated)],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repeats", type=int, default=6)
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats must be at least 1")

    matcher = SentenceEmbeddingMatcher(lazy_load=False, fallback_enabled=False)
    model = matcher._model
    model.encode(["offline benchmark warmup"], convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)

    cached_method = SentenceEmbeddingMatcher._encode_job_chunks

    # Before: same candidate/job embedding calls as the previous implementation.
    matcher._encode_job_chunks = MethodType(
        lambda self, active_model, chunks: active_model.encode(
            chunks,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        ),
        matcher,
    )
    uncached = run_phase(matcher, args.repeats)

    # After: bounded cache starts empty and sees the same job/candidate sequence.
    matcher._encode_job_chunks = MethodType(cached_method, matcher)
    cached = run_phase(matcher, args.repeats)
    if any(abs(a - b) > 1e-7 for a, b in zip(uncached["scores"], cached["scores"], strict=True)):
        raise AssertionError("Cached inference changed semantic matching scores")

    uncached.pop("scores")
    cached.pop("scores")
    print(json.dumps({"repeats": args.repeats, "uncached": uncached, "cached": cached}, indent=2))


if __name__ == "__main__":
    main()
