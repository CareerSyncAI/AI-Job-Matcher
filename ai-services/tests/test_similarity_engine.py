"""Unit and regression tests for CareerSync AI Semantic Matching Engines.

Covers:
1. Deterministic baseline matcher invariants and concept extraction
2. Sentence embedding matcher bounded chunking and diagnostics
3. Safe configurable fallback behavior
4. Absence of hallucinated concepts (evidence anchoring)
5. Empty and malformed text robustness
"""

import os
import pytest
from src.similarity.baseline_matcher import BaselineSemanticMatcher
from src.similarity.embedding_matcher import SentenceEmbeddingMatcher
from src.similarity.semantic_matcher import SemanticMatcher


@pytest.fixture
def sample_candidate():
    return {
        "headline": "Senior Python Backend Engineer",
        "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "experience_summary": "Architected distributed REST APIs using FastAPI and PostgreSQL. Deployed microservices on Docker."
    }


@pytest.fixture
def sample_job():
    return {
        "job_id": "job-py-01",
        "title": "Senior Python Developer",
        "required_skills": ["Python", "FastAPI"],
        "preferred_skills": ["Docker", "Kubernetes"],
        "description": "Looking for a backend engineer to design scalable web services in Python and FastAPI."
    }


@pytest.fixture
def unrelated_candidate():
    return {
        "headline": "Lead Graphic Designer & Brand Specialist",
        "skills": ["Photoshop", "Illustrator", "Figma", "Typography"],
        "experience_summary": "Created corporate branding, marketing assets, and typography design for advertising agencies."
    }


# =========================================================================
# 1. Baseline Semantic Matcher Tests
# =========================================================================

def test_baseline_matcher_reproducibility(sample_candidate, sample_job):
    """Verifies baseline token-frequency cosine produces identical, deterministic output."""
    matcher = BaselineSemanticMatcher()
    res1 = matcher.match(sample_candidate, sample_job)
    res2 = matcher.match(sample_candidate, sample_job)

    assert res1.raw_similarity == res2.raw_similarity
    assert res1.similarity_index == res2.similarity_index
    assert res1.method == "tf_cosine_baseline"
    assert res1.status == "ok"
    assert res1.model_info["engine"] == "tf-cosine-v1"
    assert 0.0 <= res1.raw_similarity <= 1.0


def test_baseline_matcher_negative_discrimination(unrelated_candidate, sample_job):
    """Verifies baseline cleanly assigns low score to completely unrelated profiles."""
    matcher = BaselineSemanticMatcher()
    res = matcher.match(unrelated_candidate, sample_job)

    assert res.alignment_grade == "Low"
    assert res.similarity_index < 30.0
    assert "Python" in res.missing_or_gap_concepts
    assert len(res.matched_key_concepts) == 0


def test_baseline_matcher_empty_input():
    """Verifies baseline handles empty profiles without raising exceptions."""
    matcher = BaselineSemanticMatcher()
    res = matcher.match({}, {})

    assert res.raw_similarity == 0.0
    assert res.similarity_index == 0.0
    assert res.alignment_grade == "Low"
    assert res.status == "ok"


# =========================================================================
# 2. Embedding Matcher & Bounded Chunking Tests
# =========================================================================

def test_embedding_matcher_long_text_chunking():
    """Verifies long documents are deliberately chunked and truncation is tracked in diagnostics."""
    matcher = SentenceEmbeddingMatcher(lazy_load=True)

    long_summary = "Developed distributed cloud architectures and microservices. " * 30  # ~1800 chars
    long_desc = "Seeking experienced software architect to lead modern cloud systems. " * 30  # ~2100 chars

    cand_profile = {
        "headline": "Lead Cloud Architect",
        "skills": ["AWS", "Docker", "Kubernetes", "Python", "Go"],
        "experience_summary": long_summary
    }
    job_req = {
        "job_id": "job-cloud-lead",
        "title": "Principal Cloud Architect",
        "required_skills": ["AWS", "Kubernetes"],
        "preferred_skills": ["Go", "Docker"],
        "description": long_desc
    }

    chunks_c, trunc_c, chars_c = matcher._chunk_candidate_profile(cand_profile)
    chunks_j, trunc_j, chars_j = matcher._chunk_job_requisition(job_req)

    # Chunks must be bounded to MAX_CHARS_PER_CHUNK
    for chunk in chunks_c + chunks_j:
        assert len(chunk) <= matcher.MAX_CHARS_PER_CHUNK + 20

    # Truncation must be tracked
    assert trunc_c is True
    assert trunc_j is True
    assert chars_c > 1500
    assert chars_j > 1500


def test_embedding_matcher_warm_match(sample_candidate, sample_job):
    """Verifies live inference with sentence-transformers works and populates rich diagnostics."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)
    output = matcher.match(sample_candidate, sample_job)

    assert output.status == "ok"
    assert output.method == "sentence_embedding"
    assert 0.0 <= output.raw_similarity <= 1.0
    assert output.similarity_index == round(output.raw_similarity * 100.0, 1)
    assert output.model_info["vector_dimensions"] == 384
    assert output.model_info["device"] == "cpu"
    assert output.diagnostics["chunks_processed"] >= 2
    assert output.diagnostics["latency_ms"] > 0.0
    assert "Python" in output.matched_key_concepts


# =========================================================================
# 3. Safe Configurable Fallback Tests
# =========================================================================

def test_embedding_matcher_fallback_on_invalid_model(sample_candidate, sample_job):
    """Verifies system safely falls back to deterministic baseline if model fails to load."""
    bad_matcher = SentenceEmbeddingMatcher(
        model_id="nonexistent-org/invalid-model-name-xyz",
        fallback_enabled=True,
        lazy_load=True
    )

    output = bad_matcher.match(sample_candidate, sample_job)
    assert output.status == "fallback"
    assert output.method == "fallback"
    assert output.fallback_reason is not None
    assert output.model_info["engine"] == "tf-cosine-v1"
    assert 0.0 <= output.raw_similarity <= 1.0


def test_embedding_matcher_raises_when_fallback_disabled(sample_candidate, sample_job):
    """Verifies system raises exception when fallback is explicitly disabled."""
    strict_bad_matcher = SentenceEmbeddingMatcher(
        model_id="nonexistent-org/invalid-model-name-xyz",
        fallback_enabled=False,
        lazy_load=True
    )

    with pytest.raises(RuntimeError):
        strict_bad_matcher.match(sample_candidate, sample_job)


# =========================================================================
# 4. Pluggable Facade & Method Selection Tests
# =========================================================================

def test_semantic_matcher_facade_method_selection(sample_candidate, sample_job):
    """Verifies facade correctly dispatches between baseline and embedding via parameter."""
    facade = SemanticMatcher()

    # Explicit baseline dispatch
    baseline_result = facade.match(sample_candidate, sample_job, method="baseline")
    assert baseline_result["method"] == "tf_cosine_baseline"
    assert baseline_result["model_info"]["engine"] == "tf-cosine-v1"

    # Explicit embedding dispatch
    embedding_result = facade.match(sample_candidate, sample_job, method="embedding")
    assert embedding_result["method"] == "sentence_embedding"
    assert embedding_result["model_info"]["vector_dimensions"] == 384


def test_concept_overlaps_evidence_anchoring(sample_candidate, sample_job):
    """Verifies concept overlaps are strictly traceable to observable text (zero hallucination)."""
    facade = SemanticMatcher()
    result = facade.match(sample_candidate, sample_job, method="embedding")

    all_req_skills = sample_job["required_skills"] + sample_job["preferred_skills"]
    for concept in result["matched_key_concepts"]:
        assert concept in all_req_skills
        assert concept.lower() in [s.lower() for s in sample_candidate["skills"]] or concept.lower() in sample_candidate["experience_summary"].lower()

    for concept in result["missing_or_gap_concepts"]:
        assert concept in all_req_skills
        assert concept.lower() not in [s.lower() for s in sample_candidate["skills"]]


def test_embedding_matcher_empty_input(sample_job):
    """Verifies embedding matcher handles empty inputs gracefully without exceptions."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)

    # Empty candidate
    empty_cand = matcher.match({}, sample_job)
    assert empty_cand.status == "ok"
    assert empty_cand.raw_similarity == 0.0
    assert empty_cand.similarity_index == 0.0
    assert empty_cand.alignment_grade == "Low"
    assert empty_cand.diagnostics["chunks_processed"] == 0

    # Both empty
    empty_both = matcher.match({}, {})
    assert empty_both.status == "ok"
    assert empty_both.raw_similarity == 0.0
    assert empty_both.similarity_index == 0.0


def test_similarity_repeatability_tolerance(sample_candidate, sample_job):
    """Verifies identical inputs produce deterministic scores within strict tolerance."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)

    outputs = [matcher.match(sample_candidate, sample_job) for _ in range(3)]
    first_sim = outputs[0].raw_similarity
    first_idx = outputs[0].similarity_index

    for out in outputs[1:]:
        assert abs(out.raw_similarity - first_sim) < 1e-5
        assert abs(out.similarity_index - first_idx) < 1e-3
        assert out.matched_key_concepts == outputs[0].matched_key_concepts

