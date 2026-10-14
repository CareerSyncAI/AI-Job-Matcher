"""Smoke test script for CareerSync AI Sentence Embedding Matcher.

Verifies:
1. Local model weights can be initialized (SentenceTransformer / all-MiniLM-L6-v2)
2. Bounded chunking and encoding runs on CPU without errors
3. Raw cosine similarity is computed cleanly
4. Cold-start and warm inference latencies are reported
5. Vector dimension matches expected 384
"""

import sys
import time
from typing import Dict, Any

from src.similarity.embedding_matcher import SentenceEmbeddingMatcher


def run_smoke_test() -> int:
    print("=" * 65)
    print("CAREERSYNC AI - EMBEDDING MODEL SMOKE TEST")
    print("=" * 65)

    print("\n[Step 1] Initializing SentenceEmbeddingMatcher...")
    start_init = time.perf_counter()
    matcher = SentenceEmbeddingMatcher(lazy_load=False)
    init_duration_ms = (time.perf_counter() - start_init) * 1000
    print(f"  [OK] Model initialized in {init_duration_ms:.1f}ms (Cold start)")
    print(f"  [OK] Model ID: {matcher.model_id}")
    print(f"  [OK] Pinned Revision: {matcher.model_revision}")
    print(f"  [OK] Vector Dimensions: {matcher.vector_dimensions}")
    print(f"  [OK] Device: {matcher.device}")

    # Test candidate and requisition
    candidate_profile = {
        "headline": "Senior Fullstack Engineer (Python, React)",
        "skills": ["Python", "FastAPI", "React", "Docker", "PostgreSQL"],
        "experience_summary": "Engineered distributed microservices using Python and FastAPI serving 1M users. Built responsive dashboards using React."
    }

    job_requisition = {
        "job_id": "job-smoke-01",
        "title": "Lead Backend Python Engineer",
        "required_skills": ["Python", "FastAPI", "Docker"],
        "preferred_skills": ["PostgreSQL", "Kubernetes"],
        "description": "Looking for an experienced backend developer to scale our core REST APIs using Python, FastAPI, and containerized Docker services."
    }

    print("\n[Step 2] Executing warm inference match...")
    start_infer = time.perf_counter()
    output = matcher.match(candidate_profile, job_requisition)
    infer_duration_ms = (time.perf_counter() - start_infer) * 1000

    print(f"  [OK] Inference completed in {infer_duration_ms:.1f}ms")
    print(f"  [OK] Method: {output.method}")
    print(f"  [OK] Status: {output.status}")
    print(f"  [OK] Raw Cosine Similarity: {output.raw_similarity:.4f}")
    print(f"  [OK] Presentation Similarity Index: {output.similarity_index:.1f}")
    print(f"  [OK] Alignment Grade: {output.alignment_grade}")
    print(f"  [OK] Matched Concepts: {output.matched_key_concepts}")
    print(f"  [OK] Missing Concepts: {output.missing_or_gap_concepts}")
    print(f"  [OK] Diagnostics: {output.diagnostics}")

    # Verification checks
    assert output.status == "ok", f"Expected status 'ok', got {output.status}"
    assert output.method == "sentence_embedding", f"Expected method 'sentence_embedding', got {output.method}"
    assert 0.0 <= output.raw_similarity <= 1.0, f"Raw similarity out of bounds: {output.raw_similarity}"
    assert output.model_info["vector_dimensions"] == 384, f"Dimension mismatch: {output.model_info['vector_dimensions']}"
    assert "Python" in output.matched_key_concepts, "Expected 'Python' in matched concepts"

    print("\n" + "=" * 65)
    print("ALL SMOKE TEST CHECKS PASSED SUCCESSFULLY (0 ERRORS)")
    print("=" * 65)
    return 0


if __name__ == "__main__":
    sys.exit(run_smoke_test())
