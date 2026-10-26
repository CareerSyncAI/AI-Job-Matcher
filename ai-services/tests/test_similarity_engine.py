"""Unit and regression tests for CareerSync AI Semantic Matching Engines.

Covers:
1. Deterministic baseline matcher invariants and concept extraction
2. Sentence embedding matcher bounded chunking and diagnostics
3. Safe configurable fallback behavior
4. Absence of hallucinated concepts (evidence anchoring)
5. Empty and malformed text robustness
"""

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

def test_embedding_matcher_tokenizer_aware_chunking():
    """Verifies long documents are chunked using tokenizer-aware windows with full coverage (no silent 3-chunk drop)."""
    matcher = SentenceEmbeddingMatcher(lazy_load=True)

    # Substantial summary (~2400 chars, ~350 tokens)
    long_summary = "Architected high-throughput distributed microservices in Go and Python. " * 35
    long_desc = "Seeking experienced cloud architect to lead modern microservice infrastructure. " * 35

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

    chunks_c, trunc_c, tokens_c = matcher._chunk_candidate_profile(cand_profile)
    chunks_j, trunc_j, tokens_j = matcher._chunk_job_requisition(job_req)

    # 1. Multiple overlapping chunks created (no silent 3-chunk limit!)
    assert len(chunks_c) >= 2
    assert len(chunks_j) >= 2

    # 2. Token counts recorded
    assert tokens_c > 200
    assert tokens_j > 200

    # 3. Full document is covered without truncation on realistic documents
    assert trunc_c is False
    assert trunc_j is False


def test_embedding_matcher_late_achievement_preserved():
    """Verifies achievements near the end of long documents are preserved and matched (fixing silent 3-chunk drop)."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)

    # Build a long resume with 8 paragraphs of background experience
    early_background = "Managed general enterprise IT operations, vendor agreements, and hardware support. " * 40
    # Crucial target achievement placed strictly at the very end
    late_achievement = "Spearheaded advanced distributed PyTorch neural network training pipelines on Kubernetes clusters with Ray."

    full_experience = f"{early_background}\n\n{late_achievement}"

    cand_profile = {
        "headline": "Senior Systems Engineer",
        "skills": ["Linux", "Networking"],
        "experience_summary": full_experience
    }
    job_req = {
        "job_id": "job-mlops",
        "title": "Senior PyTorch MLOps Engineer",
        "required_skills": ["PyTorch", "Kubernetes"],
        "description": "Looking for an engineer with deep expertise in PyTorch distributed training on Kubernetes."
    }

    output = matcher.match(cand_profile, job_req)

    # With the new tokenizer-aware chunker, all chunks are processed (no 3-chunk cutoff)
    assert output.diagnostics["candidate_chunks_count"] > 3
    assert output.diagnostics["truncated"] is False
    assert output.diagnostics["coverage_ratio"] == 1.0

    # The late achievement must boost semantic similarity significantly
    assert output.raw_similarity >= 0.40
    assert output.alignment_grade in ["High", "Moderate"]
    # Evidence status must identify PyTorch and Kubernetes as supported
    assert "PyTorch" in output.evidence_status["supported"]
    assert "Kubernetes" in output.evidence_status["supported"]


def test_similarity_semantics_unclamped_cosine(sample_candidate, sample_job):
    """Verifies unclamped cosine is disclosed in diagnostics while raw_similarity stays strictly in [0.0, 1.0]."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)
    output = matcher.match(sample_candidate, sample_job)

    # Backend contract constraint: raw_similarity MUST be in [0.0, 1.0]
    assert 0.0 <= output.raw_similarity <= 1.0
    assert 0.0 <= output.similarity_index <= 100.0

    # Diagnostics contains true mathematical unconstrained cosine
    diag = output.diagnostics
    assert "unclamped_raw_cosine" in diag
    assert "raw_cosine_clamped" in diag
    assert -1.0 <= diag["unclamped_raw_cosine"] <= 1.0
    assert abs(diag["raw_cosine_clamped"] - output.raw_similarity) < 1e-4

    # Explanatory definitions must be present
    assert "v1.1.0" in diag["raw_similarity_definition"]
    assert "Unbounded" in diag["unclamped_cosine_definition"]


def test_similarity_semantics_negative_zero_positive_cosine(monkeypatch, sample_candidate, sample_job):
    """Verifies that positive, zero, and negative cosine cases behave correctly according to contract."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)

    # 1. Positive cosine case
    pos_output = matcher.match(sample_candidate, sample_job)
    assert pos_output.diagnostics["unclamped_raw_cosine"] > 0.0
    assert pos_output.raw_similarity > 0.0
    assert abs(pos_output.raw_similarity - round(pos_output.diagnostics["unclamped_raw_cosine"], 4)) < 1e-4

    # 2. Zero cosine case (empty input)
    zero_output = matcher.match({}, sample_job)
    assert zero_output.diagnostics["unclamped_raw_cosine"] == 0.0
    assert zero_output.raw_similarity == 0.0
    assert zero_output.similarity_index == 0.0

    # 3. Negative cosine case (opposing embedding vectors)
    # Mock model.encode to return opposing unit vectors on candidate vs job calls
    import numpy as np

    class MockOpposingModel:
        def __init__(self):
            self.call_count = 0

        def encode(self, texts, **kwargs):
            self.call_count += 1
            dim = 384
            vec = np.zeros(dim, dtype=np.float32)
            if self.call_count % 2 == 1:
                # 1st call (candidate): [1.0, 0.0, ...]
                vec[0] = 1.0
            else:
                # 2nd call (job requisition): [-1.0, 0.0, ...] (opposing direction)
                vec[0] = -1.0
            return np.array([vec] * len(texts))

    matcher._model = MockOpposingModel()

    neg_output = matcher.match(sample_candidate, sample_job)
    # Unclamped raw cosine must reflect the opposing vector (-1.0)
    assert neg_output.diagnostics["unclamped_raw_cosine"] == -1.0
    # Clamped raw similarity MUST clamp to 0.0 to satisfy the backend v1.1.0 contract
    assert neg_output.raw_similarity == 0.0
    assert neg_output.similarity_index == 0.0
    assert neg_output.alignment_grade == "Low"


def test_evidence_status_distinction():
    """Verifies supported, not_detected, and insufficient_information are strictly distinguished."""
    matcher = SentenceEmbeddingMatcher(lazy_load=False)

    cand_profile = {
        "headline": "Full Stack Developer",
        "skills": ["React", "TypeScript", "Node.js"],
        "experience_summary": "Built scalable web apps using React, TypeScript, and Node.js with PostgreSQL database."
    }
    job_req = {
        "title": "Senior Frontend Developer",
        "required_skills": ["React", "TypeScript", "Rust"],  # Rust is absent
        "preferred_skills": ["Docker"],                       # Docker is absent
        "description": "Frontend lead with React and TypeScript. Optional Rust for WebAssembly modules."
    }

    output = matcher.match(cand_profile, job_req)

    # 1. Supported skills
    assert "React" in output.evidence_status["supported"]
    assert "TypeScript" in output.evidence_status["supported"]

    # 2. Not detected skills
    assert "Rust" in output.evidence_status["not_detected"]
    assert "Docker" in output.evidence_status["not_detected"]

    # 3. Absence is NOT marked as a confirmed gap
    for item in output.evidence_breakdown:
        if item["requirement"] in ("Rust", "Docker"):
            assert item["status"] == "not_detected"
            assert item["is_confirmed_gap"] is False
            assert "Absence of mention" in item["note"]

    # 4. Sparse candidate profile yields insufficient_information
    sparse_cand = {"headline": "", "skills": [], "experience_summary": ""}
    sparse_output = matcher.match(sparse_cand, job_req)
    for req in job_req["required_skills"]:
        assert req in sparse_output.evidence_status["insufficient_information"]
        for item in sparse_output.evidence_breakdown:
            if item["requirement"] == req:
                assert item["status"] == "insufficient_information"
                assert item["is_confirmed_gap"] is False


def test_safety_ceiling_truncation_on_massive_document():
    """Verifies safety ceiling (MAX_CHUNKS_PER_DOC) prevents memory exhaustion and sets truncated=True."""
    matcher = SentenceEmbeddingMatcher(lazy_load=True)

    # Massive document with 100 long paragraphs (>70 chunks)
    massive_summary = "Extensive multi-decade legacy enterprise operations with complex systems. " * 1500
    profile = {"headline": "Architect", "skills": [], "experience_summary": massive_summary}

    chunks, truncated, tokens = matcher._chunk_candidate_profile(profile)
    assert len(chunks) == matcher.MAX_CHUNKS_PER_DOC
    assert truncated is True
    assert tokens > 2000


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

