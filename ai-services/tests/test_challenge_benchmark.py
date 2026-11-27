"""Guard the matching challenge's data integrity and stable evidence controls."""

from __future__ import annotations

import json

import pytest

from benchmarks.run_challenge import evidence_metrics, load_groups, run_groups
from src.api.schemas import CandidateProfilePayload, JobRequisitionPayload
from src.similarity.baseline_matcher import BaselineSemanticMatcher

EXPECTED_STATUSES = {"supported", "not_detected", "insufficient_information"}
REQUIRED_FOCUS = {
    "ambiguous_skill",
    "alternative_terminology",
    "conflicting_evidence",
    "cross_domain_transfer",
    "exact_match",
    "explicit_negation",
    "irrelevant_experience",
    "keyword_stuffing",
    "learning_only",
    "quoted_requirements",
    "relevant_experience",
    "same_domain_missing_mandatory",
    "seniority_mismatch",
    "sparse_valid",
    "third_party",
    "transferable_nonidentical",
}


def test_challenge_groups_have_unique_inputs_and_complete_annotations():
    groups = load_groups()
    job_ids = set()
    job_payloads = set()
    case_ids = set()
    candidate_payloads = set()
    focus = set()
    for group in groups:
        job = JobRequisitionPayload.model_validate(group["job_requisition"])
        normalized_job = json.dumps(job.model_dump(), sort_keys=True).casefold()
        assert group["id"] not in job_ids
        assert normalized_job not in job_payloads
        job_ids.add(group["id"])
        job_payloads.add(normalized_job)
        requirements = set(job.required_skills + job.preferred_skills)
        group_case_ids = set()
        for case in group["cases"]:
            profile = CandidateProfilePayload.model_validate(case["candidate_profile"])
            normalized_profile = json.dumps(profile.model_dump(), sort_keys=True).casefold()
            assert case["id"] not in case_ids
            assert normalized_profile not in candidate_payloads
            case_ids.add(case["id"])
            candidate_payloads.add(normalized_profile)
            group_case_ids.add(case["id"])
            focus.update(case["focus"])
            assert set(case["expected_evidence"]) == requirements
            assert set(case["expected_evidence"].values()) <= EXPECTED_STATUSES
            assert case["rationale"].strip()
        for label in ("semantic_order", "qualification_order"):
            rankings = set()
            for higher, lower, reason in group[label]:
                assert higher != lower
                assert {higher, lower} <= group_case_ids
                assert (higher, lower) not in rankings
                assert (lower, higher) not in rankings
                rankings.add((higher, lower))
                assert reason.strip()
            assert rankings
    assert REQUIRED_FOCUS <= focus


@pytest.mark.parametrize(
    ("case_id", "target_skill", "status", "verification_type"),
    [
        ("api-negated", "FastAPI", "not_detected", "explicit_negation"),
        ("api-conflict", "FastAPI", "insufficient_information", "conflicting_mentions"),
        ("api-historical", "FastAPI", "supported", "demonstrated_after_historical_gap"),
        ("api-learning", "FastAPI", "insufficient_information", "learning_intent"),
        ("api-quoted", "FastAPI", "insufficient_information", "quoted_mention"),
        ("api-third-party", "FastAPI", "insufficient_information", "third_party_experience"),
        ("api-stuffing", "FastAPI", "insufficient_information", "unqualified_mention"),
        ("go-sparse", "Go", "supported", "declared_skill_token"),
        ("go-empty", "Go", "insufficient_information", "insufficient_material"),
        ("privacy-exact", "Data Loss Prevention", "supported", "demonstrated_context"),
    ],
)
def test_challenge_stable_evidence_controls(case_id, target_skill, status, verification_type):
    job, case = next(
        (group["job_requisition"], case)
        for group in load_groups()
        for case in group["cases"]
        if case["id"] == case_id
    )
    output = BaselineSemanticMatcher().match(case["candidate_profile"], job)
    row = next(item for item in output.evidence_breakdown if item["requirement"] == target_skill)
    assert row["status"] == case["expected_evidence"][target_skill] == status
    assert row["verification_type"] == verification_type


def test_benchmark_metrics_count_missing_mandatory_rows():
    groups = load_groups()
    outputs, _ = run_groups(BaselineSemanticMatcher(), groups)
    row = outputs["api-exact"].evidence_breakdown.pop(0)
    assert row["requirement"] == "Python"
    report = evidence_metrics(groups, outputs)
    assert report["mandatory_rows_omitted"] == 1
    assert report["requirement_rows_omitted"] == 1
    assert {
        "case": "api-exact",
        "requirement": "Python",
        "mandatory": True,
        "expected": "supported",
        "actual": None,
        "verification_type": None,
    } in report["mismatches"]
