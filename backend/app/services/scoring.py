from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from enum import IntEnum
from typing import Any
from uuid import UUID

from app.models.enums import EvaluatedSkillStatus


class CoverageTier(IntEnum):
    NO_COMPUTABLE_REQUIRED_GAPS = 1
    INSUFFICIENT_REQUIRED_EVIDENCE = 2
    REQUIRED_GAP = 3



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


DEGREE_RANK = {
    "Any": 0,
    "Associate": 1,
    "Bachelor": 2,
    "Master": 3,
    "Doctorate": 4,
}

DEGREE_ALIASES: dict[str, str] = {
    "any": "Any",
    "none": "Any",
    "not_required": "Any",
    "associate": "Associate",
    "associates": "Associate",
    "associate's": "Associate",
    "diploma": "Associate",
    "bachelor": "Bachelor",
    "bachelors": "Bachelor",
    "bachelor's": "Bachelor",
    "bs": "Bachelor",
    "ba": "Bachelor",
    "b.s.": "Bachelor",
    "b.a.": "Bachelor",
    "b.tech": "Bachelor",
    "btech": "Bachelor",
    "b.e.": "Bachelor",
    "undergraduate": "Bachelor",
    "master": "Master",
    "masters": "Master",
    "master's": "Master",
    "ms": "Master",
    "m.s.": "Master",
    "mba": "Master",
    "m.tech": "Master",
    "mtech": "Master",
    "m.sc": "Master",
    "doctorate": "Doctorate",
    "phd": "Doctorate",
    "ph.d.": "Doctorate",
    "ph.d": "Doctorate",
    "doctor": "Doctorate",
}


def normalize_degree(degree: str | None) -> str:
    if not degree:
        return "Any"
    cleaned = degree.strip().lower()
    if cleaned in DEGREE_ALIASES:
        return DEGREE_ALIASES[cleaned]
    no_dot = cleaned.replace(".", "")
    if no_dot in DEGREE_ALIASES:
        return DEGREE_ALIASES[no_dot]
    if "doctor" in cleaned or "phd" in cleaned:
        return "Doctorate"
    if "master" in cleaned or "mba" in cleaned:
        return "Master"
    if "bachelor" in cleaned or "undergraduate" in cleaned or "btech" in cleaned or "b.e" in cleaned:
        return "Bachelor"
    if "associate" in cleaned or "diploma" in cleaned:
        return "Associate"
    return "Any"


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
    # Transferable skills earn partial score credit, but are inferred evidence
    # and should not count as fully covered required qualifications for ranking.
    if any(status in {
        EvaluatedSkillStatus.TRANSFERABLE,
        EvaluatedSkillStatus.NOT_DETECTED,
        EvaluatedSkillStatus.NOT_PROVIDED,
    } for status in required):
        return CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE
    return CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS


def candidate_card_coverage_tier(
    card: Any,
    job_skills: Iterable[Any] | None = None,
) -> CoverageTier:
    """Determine the required coverage tier for a candidate card against job requirements.

    - Unevaluated candidates never receive the highest tier (NO_COMPUTABLE_REQUIRED_GAPS).
    - Direct required evidence achieves Tier 1.
    - Transferable required evidence or missing required skills receive Tier 2.
    - Candidates with evaluation status other than 'current' can never receive Tier 1 (NO_COMPUTABLE_REQUIRED_GAPS).
    - Unevaluated, pending, running, queued, failed, stale, or unknown candidates receive at least Tier 2 (INSUFFICIENT_REQUIRED_EVIDENCE).
    - Missing required skills or explicit required gaps receive Tier 3.
    - Transferable required skills receive Tier 2.
    - Preferred-skill gaps never reduce required coverage.
    """
    eval_status = getattr(card, "evaluation_status", None)
    is_fresh = getattr(card, "is_fresh", False)
    if eval_status in ("not_evaluated", "pending", "queued", "running", "failed", "unknown", "stale") or not is_fresh:
        return CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE

    requirements: list[EvaluatedRequirement] = []

    preferred_skill_names: set[str] = set()
    if job_skills:
        matched_set = {s.casefold() for s in (getattr(card, "matchedSkills", None) or [])}
        transferable_set = {s.casefold() for s in (getattr(card, "transferableSkills", None) or [])}
        preferred_skill_names = {
            getattr(js, "name", "").casefold()
            for js in job_skills
            if not getattr(js, "required", True)
        }

        import re
        for js in job_skills:
            is_required = getattr(js, "required", True)
            name_lower = getattr(js, "name", "").casefold()

            if name_lower in matched_set:
                status = EvaluatedSkillStatus.MATCHED
            elif name_lower in transferable_set:
                status = EvaluatedSkillStatus.TRANSFERABLE
            else:
                pattern = rf"(?:\b|'){re.escape(name_lower)}(?:\b|')"
                has_gap = any(
                    getattr(ev, "type", None) == "gap"
                    and (
                        getattr(ev, "requirement", "").casefold() == name_lower
                        or bool(re.search(pattern, getattr(ev, "claim", "") or "", flags=re.IGNORECASE))
                    )
                    for ev in (getattr(card, "evidence", None) or [])
                )
                status = EvaluatedSkillStatus.GAP if has_gap else EvaluatedSkillStatus.NOT_DETECTED

            requirements.append(EvaluatedRequirement(required=is_required, status=status))

    # Hard gaps on required qualifications (e.g. experience tenure or education)
    # Generic or qualification gap evidence must only count as a hard required gap if it is NOT for a preferred skill
    for ev in (getattr(card, "evidence", None) or []):
        if getattr(ev, "type", None) != "gap":
            continue

        # If evidence item is explicitly marked preferred (required is False) or names a preferred skill,
        # it MUST NEVER become a hard required gap
        if getattr(ev, "required", None) is False:
            continue

        req_name = (getattr(ev, "requirement", "") or "").casefold()
        if req_name in preferred_skill_names:
            continue

        # Non-skill hard requirements (e.g. experience tenure or education gaps) or explicitly required skill gaps
        is_hard_req = (
            getattr(ev, "required", None) is True
            or "experience" in req_name
            or "experience" in (getattr(ev, "claim", "") or "").casefold()
            or "education" in req_name
            or "education" in (getattr(ev, "claim", "") or "").casefold()
            or not job_skills  # If job_skills not provided and not marked preferred, treat generic gap as required
        )
        if is_hard_req:
            requirements.append(EvaluatedRequirement(required=True, status=EvaluatedSkillStatus.GAP))

    computed_tier = required_coverage_tier(requirements)

    # Stale or non-current evaluations can never receive Tier 1
    if (eval_status != "current" or not is_fresh) and computed_tier == CoverageTier.NO_COMPUTABLE_REQUIRED_GAPS:
        return CoverageTier.INSUFFICIENT_REQUIRED_EVIDENCE

    return computed_tier


def candidate_card_rank_key(
    card: Any,
    job_skills: Iterable[Any] | None = None,
) -> tuple[Any, ...]:
    """Compute the deterministic sorting key for candidate cards in recruiter candidate lists.

    - Only current, completed, fresh evaluations can use their actual scores.
    - Stale, unknown, pending, queued, running, failed, and not_evaluated evaluations have zero effective ranking score.
    - Old scores never influence the ordering of non-current evaluations.
    - Current evaluations rank ahead of non-current evaluations when coverage tiers are equivalent.
    """
    status = getattr(card, "evaluation_status", "not_evaluated")
    is_current = (status == "current" and getattr(card, "is_fresh", False))

    tier = candidate_card_coverage_tier(card, job_skills)

    if is_current:
        effective_match_score = getattr(card, "matchScore", 0.0)
        effective_skill_score = getattr(card, "skillScore", 0.0)
        effective_exp_score = getattr(card, "experienceScore", 0.0)
        effective_edu_score = getattr(card, "educationScore", 0.0)
        effective_sem_score = getattr(card, "semanticScore", 0.0)
    else:
        effective_match_score = 0.0
        effective_skill_score = 0.0
        effective_exp_score = 0.0
        effective_edu_score = 0.0
        effective_sem_score = 0.0

    return (
        tier.value,
        0 if is_current else 1,  # Current evaluations rank ahead of non-current in equivalent coverage tiers
        -effective_match_score,
        -effective_skill_score,
        -effective_exp_score,
        -effective_edu_score,
        -effective_sem_score,
        str(getattr(card, "id", "")),
    )


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


def education_satisfies(candidate_degree: str | None, required_degree: str | None) -> bool:
    norm_cand = normalize_degree(candidate_degree)
    norm_req = normalize_degree(required_degree)
    if norm_req == "Any":
        return True
    return DEGREE_RANK.get(norm_cand, 0) >= DEGREE_RANK.get(norm_req, 0)


def transferable_skill_allowed(skill: str, target_skill: str, taxonomy: dict[str, set[str]]) -> bool:
    """Semantic similarity alone never qualifies a transferable skill."""

    return target_skill.casefold() in {value.casefold() for value in taxonomy.get(skill, set())}
