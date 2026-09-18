"""Unit tests for Skill Extraction and Normalization Engine."""

import pytest
from src.extractors.skill_extractor import SkillExtractor
from src.normalizers.skill_normalizer import SkillNormalizer


@pytest.fixture
def extractor():
    return SkillExtractor()


@pytest.fixture
def normalizer():
    return SkillNormalizer()


def test_canonical_normalization(normalizer):
    """Verifies that common variations map to canonical skills."""
    test_cases = [
        ("ReactJS", "React", "Frontend Engineering"),
        ("react.js", "React", "Frontend Engineering"),
        ("golang", "Go", "Backend Engineering"),
        ("k8s", "Kubernetes", "Cloud & DevOps"),
        ("Postgres", "PostgreSQL", "Databases & Storage"),
        ("amazon web services", "AWS", "Cloud & DevOps"),
        ("TypeScript", "TypeScript", "Backend Engineering")
    ]

    for raw, expected_can, expected_cat in test_cases:
        res = normalizer.normalize_single(raw)
        assert res["matched"] is True
        assert res["canonical"] == expected_can
        assert res["category"] == expected_cat


def test_skill_extractor_token_boundaries(extractor):
    """Ensures token boundaries prevent false positive substring matching."""
    text = (
        "We are looking for someone who loves to go on hikes and has good trust in colleagues. "
        "Candidate has excellent communication and received Grade C in chemistry."
    )
    # Neither 'Go', 'Rust', nor 'C' should be detected from "to go", "trust", or "Grade C"
    skills = extractor.extract_from_text(text)
    detected_names = [s["canonical_name"] for s in skills]

    assert "Rust" not in detected_names
    assert "Go" not in detected_names
    assert "C" not in detected_names


def test_skill_extractor_valid_technical_context(extractor):
    """Ensures skills in technical context are correctly identified."""
    text = "Proficient in Python, Go (golang), Docker, PostgreSQL, and PyTorch for distributed deep learning."
    skills = extractor.extract_from_text(text)
    detected_names = {s["canonical_name"] for s in skills}

    assert "Python" in detected_names
    assert "Go" in detected_names
    assert "Docker" in detected_names
    assert "PostgreSQL" in detected_names
    assert "PyTorch" in detected_names


def test_section_weighted_extraction(extractor):
    """Verifies skills in the 'skills' section have higher confidence than unstructured sections."""
    sections = {
        "skills": "Python, FastAPI, Redis",
        "summary": "Experienced engineer familiar with Docker"
    }
    extracted = extractor.extract_from_sections(sections)
    skills_map = {s["canonical_name"]: s for s in extracted}

    assert "Python" in skills_map
    assert "FastAPI" in skills_map
    assert "Docker" in skills_map
    # Confidence in 'skills' section should be >= 0.90
    assert skills_map["Python"]["confidence"] >= 0.90
