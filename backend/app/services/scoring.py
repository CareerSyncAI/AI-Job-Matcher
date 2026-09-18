from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from enum import IntEnum
from uuid import UUID

from app.models.enums import EvaluatedSkillStatus


class CoverageTier(IntEnum):
    NO_COMPUTABLE_REQUIRED_GAPS = 1
    REQUIRED_GAP = 2
    INSUFFICIENT_REQUIRED_EVIDENCE = 3


@dataclass(frozen=True)
class Weights:
    skills: float
    experience: float
    education: float
    semantic: float

    def validate(self) -> None:
        values = (self.skills, self.experience, self.education, self.semantic)
        if any(weight < 0 for weight in values) or sum(values) != 100:
            raise ValueError("Weights must be non-negative and sum to exactly 100.")


@dataclass(frozen=True)
class EvaluatedRequirement:
    required: bool
    status: EvaluatedSkillStatus


@dataclass(frozen=True)
class RankingCandidate:
    candidate_id: UUID
    requirements: tuple[EvaluatedRequirement, ...]
    skills_score: float
    experience_score: float
    education_score: float
    semantic_score: float

    def overall_score(self, weights: Weights) -> float:
        return calculate_weighted_score(
            weights,
            skills=self.skills_score,
            experience=self.experience_score,
            education=self.education_score,
            semantic=self.semantic_score,
        )

    def coverage_tier(self) -> CoverageTier:
        return required_coverage_tier(self.requirements)


@dataclass(frozen=True)
class EmploymentInterval:
    start: date
    end: date | None
    employment_type: str = "full_time"


DEGREE_RANK = {"Any": 0, "Bachelor": 1, "Master": 2, "PhD": 3}


def calculate_weighted_score(
    weights: Weights, *, skills: float, experience: float, education: float, semantic: float
) -> float:
    weights.validate()
    values = (skills, experience, education, semantic)
    if any(value < 0 or value > 100 for value in values):
        raise ValueError("Each scoring factor must be within 0 through 100.")
    return round(
        (weights.skills * skills + weights.experience * experience + weights.education * education + weights.semantic * semantic)
        / 100,
        2,
    )


def required_coverage_tier(requirements: Iterable[EvaluatedRequirement]) -> CoverageTier:
    required = [requirement.status for requirement in requirements if requirement.required]
    if any(status is EvaluatedSkillStatus.GAP for status in required):
        return CoverageTier.REQUIRED_GAP
    if any(status in {EvaluatedSkillStatus.NOT_DETECTED, EvaluatedSkillStatus.NOT_PROVIDED} for status in required):
        return CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE
    return CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS


def rank_candidates(candidates: Iterable[RankingCandidate], weights: Weights) -> list[RankingCandidate]:
    """Coverage tier first, then score factors, then an opaque stable identifier."""

    weights.validate()
    return sorted(
        candidates,
        key=lambda candidate: (
            candidate.coverage_tier(),
            -candidate.overall_score(weights),
            -candidate.skills_score,
            -candidate.experience_score,
            -candidate.education_score,
            -candidate.semantic_score,
            str(candidate.candidate_id),
        ),
    )


def professional_experience_years(intervals: Iterable[EmploymentInterval], evaluation_date: date) -> float:
    """Merge overlapping professional intervals; internships contribute no default tenure."""

    normalized: list[tuple[date, date]] = []
    for interval in intervals:
        if interval.employment_type.lower() == "internship":
            continue
        end = min(interval.end or evaluation_date, evaluation_date)
        if interval.start <= end:
            normalized.append((interval.start, end))
    if not normalized:
        return 0.0
    normalized.sort()
    merged: list[list[date]] = []
    for start, end in normalized:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        elif end > merged[-1][1]:
            merged[-1][1] = end
    total_days = sum((end - start).days + 1 for start, end in merged)
    return round(total_days / 365.2425, 2)


def education_satisfies(candidate_degree: str, required_degree: str) -> bool:
    if candidate_degree not in DEGREE_RANK or required_degree not in DEGREE_RANK:
        return False
    return DEGREE_RANK[candidate_degree] >= DEGREE_RANK[required_degree]


def transferable_skill_allowed(skill: str, target_skill: str, taxonomy: dict[str, set[str]]) -> bool:
    """Semantic similarity alone never qualifies a transferable skill."""

    return target_skill.casefold() in {value.casefold() for value in taxonomy.get(skill, set())}
