from __future__ import annotations

from datetime import date
from uuid import uuid4

import pytest

from app.models.enums import EvaluatedSkillStatus
from app.services.scoring import (
    CoverageTier,
    EmploymentInterval,
    EvaluatedRequirement,
    RankingCandidate,
    Weights,
    calculate_weighted_score,
    education_satisfies,
    professional_experience_years,
    rank_candidates,
    required_coverage_tier,
    transferable_skill_allowed,
)


def test_weights_validation():
    valid = Weights(skills=35, experience=35, education=15, semantic=15)
    valid.validate()
    invalid = Weights(skills=50, experience=50, education=10, semantic=0)
    with pytest.raises(ValueError, match="sum to exactly 100"):
        invalid.validate()


def test_weighted_score_calculation():
    weights = Weights(skills=35, experience=35, education=15, semantic=15)
    score = calculate_weighted_score(weights, skills=80, experience=70, education=100, semantic=60)
    assert score == 76.5


def test_required_coverage_tier():
    reqs_no_gaps = (
        EvaluatedRequirement(required=True, status=EvaluatedSkillStatus.MATCHED),
        EvaluatedRequirement(required=False, status=EvaluatedSkillStatus.GAP),
    )
    assert required_coverage_tier(reqs_no_gaps) == CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS

    reqs_with_gap = (
        EvaluatedRequirement(required=True, status=EvaluatedSkillStatus.GAP),
    )
    assert required_coverage_tier(reqs_with_gap) == CoverageTier.REQUIRED_GAP


def test_candidate_ranking_order():
    weights = Weights(skills=35, experience=35, education=15, semantic=15)
    cand1_id = uuid4()
    cand2_id = uuid4()

    c1 = RankingCandidate(
        candidate_id=cand1_id,
        requirements=(EvaluatedRequirement(required=True, status=EvaluatedSkillStatus.MATCHED),),
        skills_score=90,
        experience_score=90,
        education_score=90,
        semantic_score=90,
    )
    # c2 has higher scores but has a required skill gap
    c2 = RankingCandidate(
        candidate_id=cand2_id,
        requirements=(EvaluatedRequirement(required=True, status=EvaluatedSkillStatus.GAP),),
        skills_score=95,
        experience_score=95,
        education_score=95,
        semantic_score=95,
    )

    ranked = rank_candidates([c2, c1], weights)
    assert ranked[0].candidate_id == cand1_id
    assert ranked[1].candidate_id == cand2_id


def test_professional_experience_years_deduplication():
    eval_date = date(2026, 1, 1)
    intervals = [
        EmploymentInterval(start=date(2020, 1, 1), end=date(2022, 1, 1)),
        # Overlapping job
        EmploymentInterval(start=date(2021, 1, 1), end=date(2023, 1, 1)),
        # Internship should be ignored
        EmploymentInterval(start=date(2018, 1, 1), end=date(2019, 1, 1), employment_type="internship"),
    ]
    years = professional_experience_years(intervals, eval_date)
    # 2020 to 2023 is 3 years (~3.0 years)
    assert 2.9 <= years <= 3.1


def test_education_hierarchy():
    assert education_satisfies("Master", "Bachelor") is True
    assert education_satisfies("Bachelor", "Master") is False
    assert education_satisfies("PhD", "Bachelor") is True
    assert education_satisfies("Unknown", "Bachelor") is False


def test_transferable_skill_taxonomy():
    taxonomy = {"PyTorch": {"TensorFlow", "Keras"}}
    assert transferable_skill_allowed("PyTorch", "TensorFlow", taxonomy) is True
    assert transferable_skill_allowed("PyTorch", "React", taxonomy) is False
