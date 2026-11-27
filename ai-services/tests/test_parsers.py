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


def test_section_detector_recognizes_domain_headings_and_preserves_boundaries(detector):
    text = """Jane Example
    ACCOUNTING EXPERIENCE:
    Reconciled monthly statements.
    Core Competencies
    Bank reconciliation, financial reporting
    Academic Background:
    Bachelors in Accounting
    Professional Certifications
    CPA
    Projects
    Forecasting dashboard
    """

    sections = detector.split_sections(text)

    assert "Reconciled monthly statements." in sections["experience"]
    assert "Bank reconciliation" in sections["skills"]
    assert "Bachelors in Accounting" in sections["education"]
    assert sections["certifications"] == "CPA"
    assert sections["projects"] == "Forecasting dashboard"


def test_section_detector_does_not_split_on_body_text_mention(detector):
    text = "I have professional experience in accounting and clinical skills from prior roles."
    sections = detector.split_sections(text)

    assert sections == {"summary": text}


def test_section_detector_unconventional_headers(detector):
    text = """
    Applicant Name
    applicant@example.com

    SUMMARY OF QUALIFICATIONS
    Seasoned full-stack engineer with 6 years experience.

    TECHNICAL PROFICIENCIES
    Python, FastAPI, Celery, RabbitMQ, PostgreSQL

    PROFESSIONAL BACKGROUND
    Lead Developer at Tech Corp (2021 - Present)

    EDUCATION AND TRAINING
    BS in Computer Science, State University

    SELECTED PROJECTS
    Scalable messaging queue with RabbitMQ

    CREDENTIALS
    AWS Certified Solutions Architect
    """
    sections = detector.split_sections(text)

    assert "summary" in sections
    assert "skills" in sections
    assert "experience" in sections
    assert "education" in sections
    assert "projects" in sections
    assert "certifications" in sections
    assert "Seasoned full-stack engineer" in sections["summary"]
    assert "Celery, RabbitMQ" in sections["skills"]
    assert "Lead Developer" in sections["experience"]
    assert "State University" in sections["education"]
    assert "Scalable messaging queue" in sections["projects"]
    assert "AWS Certified" in sections["certifications"]
