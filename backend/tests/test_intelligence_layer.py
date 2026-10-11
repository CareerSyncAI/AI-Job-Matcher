"""
Comprehensive tests for CareerSync AI Intelligence Layer:
- Taxonomy skill extraction & boundary disambiguation
- Strict transferable mapping
- Pluggable semantic cosine similarity & concept diagnostics
- Standalone ATS Resume Quality Analyzer
- Ground-truth benchmark evaluation runner
"""

from __future__ import annotations

import pytest

from app.evaluation.benchmark_runner import run_ground_truth_evaluation
from app.services.ats_analyzer import ats_analyzer
from app.services.semantic_matcher import SublinearTFCosineMatcher
from app.services.taxonomy import taxonomy


def test_taxonomy_canonical_normalization():
    assert taxonomy.normalize("fastapi") == "FastAPI"
    assert taxonomy.normalize("fast-api") == "FastAPI"
    assert taxonomy.normalize("reactjs") == "React"
    assert taxonomy.normalize("next.js") == "Next.js"
    assert taxonomy.normalize("k8s") == "Kubernetes"
    assert taxonomy.normalize("postgres") == "PostgreSQL"
    assert taxonomy.normalize("ts") == "TypeScript"
    assert taxonomy.normalize("non_existent_skill_xyz") is None


def test_taxonomy_ambiguous_token_disambiguation():
    # Ambiguous token "Go": should NOT match general English word "go to the store"
    general_text = "I like to go for a run in the morning and build things."
    extracted = taxonomy.extract_skills_from_text(general_text)
    extracted_names = [s["canonical_name"] for s in extracted]
    assert "Go" not in extracted_names

    # Ambiguous token "Go": SHOULD match when within technical programming context
    tech_text = "Experienced building microservices in Go (Golang) and Python."
    extracted_tech = taxonomy.extract_skills_from_text(tech_text)
    extracted_tech_names = [s["canonical_name"] for s in extracted_tech]
    assert "Go" in extracted_tech_names
    assert "Python" in extracted_tech_names


def test_taxonomy_c_language_disambiguation():
    # Should not match isolated letter 'c' in random sentence
    prose = "We have option a, b, c, or d for the next meeting."
    extracted = taxonomy.extract_skills_from_text(prose)
    assert "C" not in [s["canonical_name"] for s in extracted]

    # Should match C programming language in technical context
    tech_c = "Developed embedded device firmware in pure C language and C++."
    extracted_c = taxonomy.extract_skills_from_text(tech_c)
    names = [s["canonical_name"] for s in extracted_c]
    assert "C" in names
    assert "C++" in names


def test_strict_transferable_rules():
    # FastAPI can transfer to REST APIs and Django/Flask
    assert taxonomy.is_transferable("FastAPI", "REST APIs") is True
    assert taxonomy.is_transferable("Django", "FastAPI") is True
    assert taxonomy.is_transferable("Docker", "Kubernetes") is True

    # Strict Rule: Related skills are NOT direct equivalents unless mapped
    # e.g., Having Django does NOT prove candidate knows React or PyTorch
    assert taxonomy.is_transferable("Django", "React") is False
    assert taxonomy.is_transferable("Python", "Rust") is False
    assert taxonomy.is_transferable("PostgreSQL", "PyTorch") is False


def test_semantic_sublinear_tf_cosine_matcher():
    matcher = SublinearTFCosineMatcher()

    cand_text = "Senior Python engineer building REST APIs and microservices using FastAPI, Docker, and PostgreSQL on AWS."
    job_text = "We are seeking a Python backend developer with experience in FastAPI, Docker, and cloud databases."

    result = matcher.match(
        candidate_text=cand_text,
        job_text=job_text,
        candidate_skills=["Python", "FastAPI", "Docker", "PostgreSQL", "AWS"],
        job_skills=["Python", "FastAPI", "Docker", "PostgreSQL"],
    )

    assert result.similarity_score >= 50.0
    assert result.alignment_grade in {"High", "Moderate"}
    assert "Python" in result.matched_concepts or "fastapi" in [c.lower() for c in result.matched_concepts]
    assert result.confidence in {"high", "medium"}
    assert "raw_cosine" in result.diagnostics


def test_ats_resume_analyzer_strong_resume():
    sample_resume = """
    Alice Vance — Senior Full-Stack Engineer
    Email: alice.vance@example.com | Phone: (415) 555-0199 | San Francisco, CA
    LinkedIn: linkedin.com/in/alice-vance | GitHub: github.com/alice-vance

    PROFESSIONAL SUMMARY
    Senior Software Engineer with 6 years experience architecting scalable distributed systems.

    TECHNICAL SKILLS
    Python, FastAPI, TypeScript, React, Next.js, Docker, Kubernetes, AWS, PostgreSQL, Redis

    WORK EXPERIENCE
    Senior Full-Stack Engineer | Acme Fintech (2020 - Present)
    • Architected microservices in Python using FastAPI and PostgreSQL, serving 50k requests/sec.
    • Accelerated client dashboard rendering by 45% using Next.js and TypeScript.
    • Deployed and scaled containerized workloads with Docker and Kubernetes on AWS.
    • Reduced cloud infrastructure costs by $120k annually.

    EDUCATION
    Bachelor of Science in Computer Science | UC Berkeley (2014 - 2018)
    """

    res = ats_analyzer.analyze(sample_resume)

    assert res.overall_ats_score >= 80.0
    assert res.grade in {"A", "B"}
    assert res.section_score >= 80.0
    assert res.contact_score >= 80.0
    assert res.impact_score >= 80.0
    assert res.contact_details["email"] == "alice.vance@example.com"
    assert len(res.action_verbs_found) >= 3
    assert len(res.strengths) >= 3
    assert len(res.missing_critical_sections) == 0


def test_ats_resume_analyzer_missing_sections():
    poor_resume = "Just some text with no headings or contact information."
    res = ats_analyzer.analyze(poor_resume)

    assert res.overall_ats_score < 50.0
    assert res.grade in {"D", "F"}
    assert len(res.missing_critical_sections) > 0
    assert any(i.severity == "critical" for i in res.issues)


def test_ground_truth_benchmark_runner():
    report = run_ground_truth_evaluation()

    assert report.total_test_pairs >= 4
    # Precision and recall for skill extraction on ground truth should be high (> 0.80)
    assert report.skill_extraction_metrics.precision >= 0.80
    assert report.skill_extraction_metrics.recall >= 0.80
    assert report.skill_extraction_metrics.f1_score >= 0.80

    # Required gap precision
    assert report.required_gap_metrics.gap_precision >= 0.75
    assert report.required_gap_metrics.gap_recall >= 0.75

    # Spearman rank correlation should be strongly positive
    assert report.rank_correlation_spearman >= 0.80
