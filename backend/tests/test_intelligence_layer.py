"""
Comprehensive tests for CareerSync AI Intelligence Layer:
- Taxonomy skill extraction & boundary disambiguation
- Strict transferable mapping
- Pluggable semantic cosine similarity & concept diagnostics
- Standalone ATS Resume Quality Analyzer
- Ground-truth benchmark evaluation runner
"""

from __future__ import annotations

from datetime import datetime

from app.evaluation.benchmark_runner import run_ground_truth_evaluation
from app.services.ats_analyzer import ATSAnalyzer, ats_analyzer
from app.services.semantic_matcher import SublinearTFCosineMatcher
from app.services.taxonomy import taxonomy


def test_experience_extraction_honors_fixed_reference_date():
    """Benchmark tenure remains reproducible when a role ends in Present."""
    from app.services.experience_extractor import extract_experience_years_from_text

    years = extract_experience_years_from_text(
        "Software Engineer | Example Corp (2020 - Present)",
        as_of=datetime(2024, 7, 1),
    )

    assert years == 4.5


def test_taxonomy_canonical_normalization():
    assert taxonomy.normalize("fastapi") == "FastAPI"
    assert taxonomy.normalize("fast-api") == "FastAPI"
    assert taxonomy.normalize("reactjs") == "React"
    assert taxonomy.normalize("next.js") == "Next.js"
    assert taxonomy.normalize("k8s") == "Kubernetes"
    assert taxonomy.normalize("postgres") == "PostgreSQL"
    assert taxonomy.normalize("ts") == "TypeScript"
    assert taxonomy.normalize("non_existent_skill_xyz") is None


def test_cross_domain_accounting_and_healthcare_skills_keep_evidence():
    accounting = taxonomy.extract_skills_from_text(
        "Accounts payable (AP), accounts receivable (AR), general ledger (GL), bank reconciliation, "
        "financial reporting, GST, Tally Prime, and QuickBooks."
    )
    accounting_by_name = {item["canonical_name"]: item for item in accounting}
    assert {"Accounts Payable", "Accounts Receivable", "General Ledger", "Bank Reconciliation", "Financial Reporting", "GST", "Tally", "QuickBooks"} <= set(accounting_by_name)
    assert accounting_by_name["Accounts Payable"]["snippet"]
    assert "accounts payable" in accounting_by_name["Accounts Payable"]["raw_match"].casefold()
    assert accounting_by_name["Accounts Payable"]["character_start"] >= 0
    abbreviation = taxonomy.extract_skills_from_text("Handled AP workflows in accounting.")
    assert any(item["canonical_name"] == "Accounts Payable" for item in abbreviation)

    nursing = taxonomy.extract_skills_from_text(
        "Patient care, clinical assessment, medication administration, vital signs, EHR, BLS, and CPR."
    )
    nursing_names = {item["canonical_name"] for item in nursing}
    assert {"Patient Care", "Clinical Assessment", "Medication Administration", "Vital Signs Monitoring", "Electronic Health Records", "Basic Life Support", "CPR"} <= nursing_names


def test_cross_domain_taxonomy_preserves_existing_software_skills_and_filters_short_terms():
    software = taxonomy.extract_skills_from_text("Built APIs using Python, FastAPI, React, SQL, and AWS.")
    software_names = {item["canonical_name"] for item in software}
    assert {"Python", "FastAPI", "React", "SQL", "AWS"} <= software_names

    unrelated = taxonomy.extract_skills_from_text("AP was approved. AR was assigned. GL was rendered.")
    unrelated_names = {item["canonical_name"] for item in unrelated}
    assert not {"Accounts Payable", "Accounts Receivable", "General Ledger"} & unrelated_names


def test_ats_recognizes_heading_aliases_but_not_body_mentions():
    analyzer = ATSAnalyzer()
    result = analyzer.analyze(
        "EMPLOYMENT-HISTORY.\nAccountant at Example Co.\nCLINICAL SKILLS:\nPatient care\n"
        "ACADEMIC BACKGROUND\nNursing Diploma\nPROFESSIONAL CERTIFICATIONS:\nBLS"
    )
    assert result.detected_sections["experience"] is True
    assert result.detected_sections["skills"] is True
    assert result.detected_sections["education"] is True
    assert result.detected_sections["certifications"] is True
    assert not result.missing_critical_sections

    prose = analyzer.analyze("I have professional experience in accounting and clinical skills from prior roles.")
    assert prose.detected_sections["experience"] is False
    assert prose.detected_sections["skills"] is False
    assert any("No recognized section heading" in issue.issue for issue in prose.issues)


def test_ats_recommendations_are_domain_appropriate_and_links_are_relevant():
    accounting = ats_analyzer.analyze(
        "ACCOUNTING EXPERIENCE\nAccounts Payable and General Ledger. Reconciled monthly statements. "
        "GitHub: https://github.com/example-accounting\n"
        "SKILLS\nQuickBooks, bank reconciliation, financial reporting\n"
        "EDUCATION\nBachelor of Accounting"
    )
    accounting_recommendations = " ".join(issue.recommendation for issue in accounting.issues)
    assert "audited" in accounting_recommendations.casefold()
    assert "Architected" not in accounting_recommendations
    assert not any("GitHub profile relevant" in strength for strength in accounting.strengths)
    assert accounting.contact_details["github"] == "https://github.com/example-accounting"
    assert accounting.contact_details["profile_links"] is None

    nursing = ats_analyzer.analyze(
        "CLINICAL EXPERIENCE\nPatient care and clinical assessment.\n"
        "SKILLS\nMedication administration, vital signs, CPR, BLS\n"
        "EDUCATION\nNursing Diploma"
    )
    nursing_recommendations = " ".join(issue.recommendation for issue in nursing.issues)
    assert "assessed" in nursing_recommendations.casefold()
    assert "Architected" not in nursing_recommendations


def test_ats_unknown_skill_coverage_is_neutral_disclosed_and_score_is_consistent():
    text = (
        "PROFESSIONAL EXPERIENCE\nCompleted specialized work with uncommon domain practices.\n"
        "SKILLS\nQwerty-domain-method and niche practice\n"
        "EDUCATION\nProfessional qualification\n"
    ) * 8
    result = ats_analyzer.analyze(text)

    assert result.detected_skills == []
    assert result.skills_score == 50.0
    assert any("does not establish that the resume contains no skills" in issue.issue for issue in result.issues)
    assert result.overall_ats_score == round(
        0.25 * result.section_score
        + 0.20 * result.contact_score
        + 0.20 * result.impact_score
        + 0.20 * result.formatting_score
        + 0.15 * result.skills_score,
        1,
    )
    assert all(0.0 <= score <= 100.0 for score in (
        result.overall_ats_score,
        result.section_score,
        result.contact_score,
        result.impact_score,
        result.formatting_score,
        result.skills_score,
    ))


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


def test_semantic_baseline_preserves_documented_score_transformation():
    """The current 0-100 component remains stable until shared approval changes it."""
    matcher = SublinearTFCosineMatcher()
    result = matcher.match(
        candidate_text="Python FastAPI Docker PostgreSQL",
        job_text="Python FastAPI Docker cloud",
    )

    raw_cosine = result.diagnostics["raw_cosine"]
    assert result.similarity_score == round(min(100.0, raw_cosine * 1.8 * 100), 1)
    assert 0.0 <= raw_cosine <= 1.0
    assert 0.0 <= result.similarity_score <= 100.0


def test_semantic_baseline_empty_input_is_explicit_and_safe():
    matcher = SublinearTFCosineMatcher()
    result = matcher.match(candidate_text="", job_text="Python FastAPI")

    assert result.similarity_score == 0.0
    assert result.diagnostics["reason"] == "Empty token corpus"
    assert result.matched_concepts == []
    assert result.missing_concepts == []


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


def test_ats_metric_detection_ignores_bare_years_and_versions():
    """F7: Standalone years (2020) and version numbers (3.10) must not inflate quantifiable metrics count."""
    text_with_years = """
    Alice Vance
    alice.vance@example.com
    (555) 019-2834

    SUMMARY
    Engineer working since 2018 with Python 3.10.

    EXPERIENCE
    Software Engineer (2019 - 2023)
    • Worked on release 2.0 and updated dependencies in 2021.
    • Managed 4 internal meetings across 2 quarters.

    EDUCATION
    Graduated in 2017.
    """
    res = ats_analyzer.analyze(text_with_years)
    # The text contains years (2018, 2019, 2023, 2021, 2017) and versions (3.10, 2.0)
    # but NO genuine quantifiable metrics ($100k, 25%, 50k users, 2x).
    assert res.quantifiable_metrics_count == 0
    assert res.impact_score < 60.0


def test_synthetic_regression_benchmark_runner():
    report = run_ground_truth_evaluation()

    assert report.total_test_pairs >= 4
    # Precision and recall for skill extraction on ground truth should be high (> 0.80)
    assert report.skill_extraction_metrics.precision >= 0.80
    assert report.skill_extraction_metrics.recall >= 0.80
    assert report.skill_extraction_metrics.f1_score >= 0.80

    # These fixtures measure required-skill evidence detection. A missing
    # mention is not a confirmed candidate skill gap.
    assert report.required_skill_evidence_metrics.precision >= 0.75
    assert report.required_skill_evidence_metrics.recall >= 0.75

    # Ranking correlation requires independently reviewed relevance labels;
    # this synthetic regression set deliberately does not report one.
    assert report.rank_correlation_spearman is None
    assert "independent human relevance" in report.ranking_metric_note
    assert str(report.evaluation_reference_date) == "2024-07-01"
    assert report.experience_tenure_metrics.mean_absolute_error_years == 0.0


def test_benchmark_metrics_degrade_on_poor_predictions():
    """Verifies that degraded or incorrect predictions genuinely lower benchmark accuracy."""
    from app.evaluation.benchmark_runner import BenchmarkRunner
    from app.evaluation.benchmark_schema import (
        GroundTruthCandidate,
        GroundTruthItem,
        GroundTruthJob,
    )

    # Dataset with intentional mismatches and missing required credentials
    degraded_item = GroundTruthItem(
        id="degrade-001",
        candidate=GroundTruthCandidate(
            id="cand-deg",
            name="No Match Candidate",
            resume_text="Experienced painter and artist with 10 years working with watercolor and oil on canvas (2014 - Present). High School Diploma 2013.",
            expected_skills=["Kubernetes", "Docker", "Python", "FastAPI"],
            expected_experience_years=10.0,
            expected_education_degree="Doctorate",
        ),
        job=GroundTruthJob(
            id="job-deg",
            title="Senior Infrastructure Engineer",
            description="Requires Kubernetes and Docker.",
            required_skills=["Kubernetes", "Docker"],
            preferred_skills=["FastAPI"],
            experience_min_years=5.0,
            education_required="Doctorate",
        ),
        expected_matched_required_skills=[],
        expected_missing_required_skills=["Kubernetes", "Docker"],
        expected_coverage_tier=3,
        expected_fixture_fit_rating=10.0,
    )

    runner = BenchmarkRunner([degraded_item])
    report = runner.run_benchmark()

    # Skill recall should be 0 because candidate text has none of expected skills
    assert report.skill_extraction_metrics.recall == 0.0
    assert report.skill_extraction_metrics.f1_score == 0.0

    # Education mismatch should be caught (High School is not Doctorate)
    assert report.education_hierarchy_metrics.accuracy == 0.0

    # Error analysis logs should document the failures
    assert len(report.error_analysis_logs) > 0
    categories = {log.error_category for log in report.error_analysis_logs}
    assert "skill_extraction" in categories or "education_mismatch" in categories


def test_resume_text_name_extraction():
    from app.api.v1.resumes import _extract_name_from_resume_text

    text_with_name = """Jane Doe
jane.doe@example.com | (555) 123-4567 | San Francisco, CA
linkedin.com/in/janedoe

Professional Summary
Senior Software Engineer with 8 years of experience building scalable systems.
"""
    assert _extract_name_from_resume_text(text_with_name, "resume_final_2024.pdf") == "Jane Doe"

    text_without_clear_name = """jane.doe@example.com | (555) 123-4567
Summary: Dedicated engineer.
"""
    assert _extract_name_from_resume_text(text_without_clear_name, "Jane_Smith_Resume.pdf") == "Jane Smith"


def test_text_extraction_dehyphenation():
    from app.services.text_extraction import _normalize

    raw = "Extensive experi-\nence with distributed archi-\ntectures and micro-\nservices."
    normalized = _normalize(raw)
    assert "experience" in normalized
    assert "architectures" in normalized
    assert "microservices" in normalized


def test_helm_and_kubernetes_distinct_taxonomy():
    assert taxonomy.normalize("helm") == "Helm"
    assert taxonomy.normalize("helm charts") == "Helm"
    assert taxonomy.normalize("kubernetes") == "Kubernetes"
    assert taxonomy.normalize("k8s") == "Kubernetes"

    # Contextual disambiguation
    tech_skills = {item["canonical_name"] for item in taxonomy.extract_skills_from_text("Deploying microservices on Kubernetes using Helm charts.")}
    assert "Kubernetes" in tech_skills
    assert "Helm" in tech_skills

    prose_skills = {item["canonical_name"] for item in taxonomy.extract_skills_from_text("He served at the helm of the executive board.")}
    assert "Helm" not in prose_skills
