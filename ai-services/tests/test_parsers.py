"""Unit tests for Section Detector and Parser utilities."""

import pytest
from src.parsers.section_detector import SectionDetector


@pytest.fixture
def detector():
    return SectionDetector()


def test_section_detector_standard_headers(detector):
    text = """
    John Doe
    john@example.com | 555-1234

    PROFESSIONAL SUMMARY
    Senior Engineer with extensive distributed systems background.

    TECHNICAL SKILLS
    Python, Go, Docker, AWS

    WORK EXPERIENCE
    Software Engineer at Acme (2020 - Present)

    EDUCATION
    BS in Computer Science, Berkeley 2020
    """
    sections = detector.split_sections(text)

    assert "contact" in sections
    assert "summary" in sections
    assert "skills" in sections
    assert "experience" in sections
    assert "education" in sections

    assert "John Doe" in sections["contact"]
    assert "distributed systems" in sections["summary"]
    assert "Python, Go" in sections["skills"]
    assert "Acme" in sections["experience"]
    assert "Berkeley" in sections["education"]


def test_section_detector_fallback_on_unstructured_text(detector):
    text = "Just a quick unstructured paragraph describing an applicant's background without any explicit headers."
    sections = detector.split_sections(text)
    assert "summary" in sections
    assert text in sections["summary"]
