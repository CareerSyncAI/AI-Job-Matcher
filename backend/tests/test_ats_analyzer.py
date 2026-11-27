from __future__ import annotations

import time

from app.services.ats_analyzer import _normalize_heading, ats_analyzer


def test_normalize_heading_preserves_aliases_and_strips_continued():
    assert _normalize_heading("  ### Professional Experience:  ") == "professional experience"
    assert _normalize_heading("Work Experience (Continued)") == "work experience"
    assert _normalize_heading("TECHNICAL_SKILLS — continued") == "technical skills"
    assert _normalize_heading("Education & Training") == "education training"


def test_ats_section_recognition_and_contact_detection():
    resume_text = """
    Jane Doe
    Email: jane.doe@example.com | Phone: +1 (555) 123-4567
    San Francisco, CA
    LinkedIn: https://www.linkedin.com/in/janedoe
    Portfolio: https://janedoe.dev

    Professional Summary
    Senior Backend Engineer with 6+ years building distributed APIs.

    Work Experience (Continued)
    - Architected Python services reducing latency by 35% for 2M users.
    - Built PostgreSQL pipelines and automated deployments.
    - Led 4 engineers and delivered 12 releases.
    - Improved test coverage to 92%.
    - Reduced cloud spend by $12,000.

    Technical Skills
    Python, FastAPI, PostgreSQL, Docker, Redis, Kubernetes

    Education
    B.S. in Computer Science
    """
    result = ats_analyzer.analyze(resume_text)
    assert result.detected_sections["summary"] is True
    assert result.detected_sections["experience"] is True
    assert result.detected_sections["skills"] is True
    assert result.detected_sections["education"] is True
    assert result.contact_details["email"] == "jane.doe@example.com"
    assert result.contact_details["phone"] is not None
    assert result.contact_details["linkedin"] == "https://www.linkedin.com/in/janedoe"
    assert result.contact_details["portfolio"] == "https://janedoe.dev"
    assert result.contact_details["location"] == "San Francisco, CA"
    assert result.quantifiable_metrics_count >= 4


def test_ats_adversarial_inputs_no_redos():
    adversarial_cases = [
        # Repeated spaces and tabs after portfolio/website keyword without URL
        "website" + (" \t" * 25_000) + "not_a_url",
        # Repeated spaces and letters without comma (location regex)
        "A" + ("a " * 25_000) + "end",
        # Long heading with repeated punctuation and spaces
        (" \t:-_•*" * 5_000) + "continued",
        # Long email-like subdomain chain without valid TLD
        "user@" + ("sub." * 10_000) + "123",
        # Long digits with spaces before non-matching unit
        ("1000" + (" " * 10_000) + "widgets\n") * 5,
        # Malformed control/unicode characters
        "\x00\x0b\x0c" + ("🚀" * 10_000) + "\r\n###\t\t",
    ]

    for payload in adversarial_cases:
        start = time.perf_counter()
        _normalize_heading(payload[:50_000])
        res = ats_analyzer.analyze(payload)
        elapsed = time.perf_counter() - start
        assert elapsed < 1.0, f"ATS analysis took too long ({elapsed:.3f}s) on adversarial input"
        assert res.overall_ats_score >= 0.0
