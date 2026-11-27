"""Small, fully synthetic quality checks for resume matching behavior.

This complements the five-pair regression benchmark with explicit error
accounting for extraction and required-skill evidence classification.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from types import SimpleNamespace

from app.models.enums import EvaluatedSkillStatus
from app.services.evaluation import DeterministicEvaluationEngine
from app.services.education_extractor import extract_education_from_text
from app.services.experience_extractor import extract_experience_years_from_text
from app.services.scoring import (
    CoverageTier,
    EvaluatedRequirement,
    Weights,
    required_coverage_tier,
)
from app.services.semantic_matcher import SublinearTFCosineMatcher
from app.services.taxonomy import taxonomy
from app.services.text_extraction import _normalize


# These labels describe only skills plainly evidenced by each synthetic text.
EXTRACTION_CASES = [
    (
        "explicit_required_and_preferred",
        "Skills: Python, FastAPI. Preferred: Kubernetes.",
        {"Python", "FastAPI", "Kubernetes"},
    ),
    ("career_change_without_technical_evidence", "Former retail supervisor transitioning to software; managed schedules and customer service.", set()),
    ("java_javascript_boundary", "Built a JavaScript interface; Java is not listed as a skill.", {"JavaScript"}),
    ("ambiguous_words_are_not_skills", "We go to market on C grade improvements; the candidate is a Rust-colored belt.", set()),
    ("punctuation_and_abbreviations", "C++, C#, .NET, and PostgreSQL experience.", {"C++", "C#", "PostgreSQL"}),
    ("pdf_line_wrap_after_normalization", _normalize("Power-\nBI reporting and experi-\nence with SQL."), {"Power BI", "SQL"}),
    ("missing_resume_sections", "Taylor Morgan\nSeeking an entry-level opportunity.", set()),
]


def _metrics(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    precision = tp / (tp + fp) if tp + fp else 1.0
    recall = tp / (tp + fn) if tp + fn else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1


def _engine_result(resume_text: str, requirements: list[tuple[str, bool]]):
    job = SimpleNamespace(
        title="Synthetic role",
        description="Synthetic benchmark role",
        skills=[
            SimpleNamespace(name=name, required=required)
            for name, required in requirements
        ],
        experience_min_years=0,
        education_required="Any",
    )
    candidate = SimpleNamespace(
        total_experience_years=None,
        education=None,
        name="Synthetic candidate",
        headline="",
    )
    resume = SimpleNamespace(extracted_text=resume_text)
    return DeterministicEvaluationEngine(
        semantic_matcher=SublinearTFCosineMatcher()
    ).evaluate(job=job, candidate=candidate, resume=resume, weights=Weights(100, 0, 0, 0))


def test_synthetic_extraction_precision_recall_and_error_examples():
    tp = fp = fn = 0
    false_positive_examples: list[str] = []
    false_negative_examples: list[str] = []

    for case_name, text, expected in EXTRACTION_CASES:
        actual = {
            item["canonical_name"]
            for item in taxonomy.extract_skills_from_text(text)
        }
        case_tp = len(actual & expected)
        case_fp = actual - expected
        case_fn = expected - actual
        tp += case_tp
        fp += len(case_fp)
        fn += len(case_fn)
        false_positive_examples.extend(f"{case_name}: {skill}" for skill in sorted(case_fp))
        false_negative_examples.extend(f"{case_name}: {skill}" for skill in sorted(case_fn))

    precision, recall, f1 = _metrics(tp, fp, fn)
    print(
        "EXTRACTION",
        {"tp": tp, "fp": fp, "fn": fn, "precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3)},
        "false_positives=", false_positive_examples,
        "false_negatives=", false_negative_examples,
    )
    # A compact smoke benchmark; exact errors remain visible in the report.
    assert precision >= 0.80
    assert recall >= 0.85
    assert f1 >= 0.85


def test_synthetic_skill_evidence_classification_and_score_separately():
    # Cases exercise explicit evidence, an explicitly mapped transfer, and a
    # truly absent skill. Preferred omission is tracked separately from required coverage.
    cases = [
        ("direct", "Python and FastAPI", [("Python", True), ("FastAPI", True)], ["matched", "matched"]),
        ("transferable", "Django", [("FastAPI", True)], ["transferable"]),
        ("missing", "Django", [("Kubernetes", True)], ["not_detected"]),
        ("preferred_omitted", "Python", [("Python", True), ("Kubernetes", False)], ["matched", "not_detected"]),
    ]
    confusion: dict[str, Counter[str]] = defaultdict(Counter)
    results = {}
    for name, text, requirements, expected in cases:
        result = _engine_result(text, requirements)
        actual = [skill["status"].value for skill in result["evaluated_skills"]]
        results[name] = result
        assert actual == expected
        for want, got in zip(expected, actual):
            confusion[want][got] += 1

    per_class = {}
    for label in ("matched", "transferable", "not_detected"):
        tp = confusion[label][label]
        fp = sum(confusion[other][label] for other in confusion if other != label)
        fn = sum(confusion[label][other] for other in confusion if other != label)
        per_class[label] = dict(zip(("precision", "recall", "f1"), (round(v, 3) for v in _metrics(tp, fp, fn))))

    direct = results["direct"]["skills_score"]
    transferable = results["transferable"]["skills_score"]
    missing = results["missing"]["skills_score"]
    preferred_omitted = results["preferred_omitted"]["skills_score"]
    # Required-only outcomes order direct > half-credit transferable > absent.
    assert direct > transferable > missing
    assert direct == 100.0 and transferable == 50.0 and missing == 0.0
    # An omitted preferred item cannot lower required coverage tier, though it
    # has its documented 20% contribution to the combined skill score.
    assert required_coverage_tier([EvaluatedRequirement(True, EvaluatedSkillStatus.MATCHED)]) is CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS
    assert required_coverage_tier([
        EvaluatedRequirement(True, EvaluatedSkillStatus.MATCHED),
        EvaluatedRequirement(False, EvaluatedSkillStatus.NOT_DETECTED),
    ]) is CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS
    assert preferred_omitted == 80.0
    assert per_class["matched"]["f1"] == 1.0
    assert per_class["transferable"]["f1"] == 1.0
    assert per_class["not_detected"]["f1"] == 1.0
    print(
        "MATCHING",
        {"per_class": per_class, "required_only_scores": {"direct": direct, "transferable": transferable, "missing": missing}, "missing_preferred_score": preferred_omitted},
    )


def test_synthetic_experience_and_education_edge_cases():
    as_of = datetime(2024, 7, 1)
    overlapping_roles = "Work Experience:\nEngineer | Example A (2018 - 2021)\nConsultant | Example B (2020 - 2022)"
    current_role = "Professional Experience:\nEngineer | Example C (Jan 2023 - Present)"
    undated_role = "Experience:\nSoftware engineer at Example D"

    # Overlapping time is counted once; Present uses a fixed reference date;
    # missing dates do not create invented tenure.
    assert extract_experience_years_from_text(overlapping_roles, as_of=as_of) == 4.0
    assert extract_experience_years_from_text(current_role, as_of=as_of) == 1.5
    assert extract_experience_years_from_text(undated_role, as_of=as_of) is None

    degrees = extract_education_from_text("Education:\nB.S. Computer Science; M.S. Data Science")
    no_degree = extract_education_from_text("Education:\nOnline coursework and professional development")
    assert degrees and degrees[0]["degree_level"] == "Master"
    assert no_degree == []

