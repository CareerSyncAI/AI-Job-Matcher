"""Conservative, schema-compatible evidence classification for skill mentions."""
from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any, TypedDict

_NEGATION = re.compile(
    r"\b(?:no|not|never|without|lack(?:s|ed|ing)?)\b.{0,48}\b(?:experience|proficiency|expertise|use|uses|using|used|worked|knowledge|familiar)\b"
    r"|\b(?:do not|don't|did not|didn't)\b.{0,48}\b(?:experience|proficiency|expertise|use|using|knowledge)\b"
    r"|\b(?:not|never)\s+(?:proficient|experienced|familiar)\s+(?:with|in)\b",
    re.IGNORECASE,
)
_LEARNING = re.compile(
    r"\b(?:learning|studying|exploring|planning to learn|want to learn|beginner in)\b",
    re.IGNORECASE,
)
_DEMONSTRATION = re.compile(
    r"\b(?:built|developed|implemented|use|uses|used|using|created|maintained|deployed|designed|managed|"
    r"spearheaded|led|architected|engineered|operated|configured|proficient|experienced|"
    r"expertise|years? of experience|worked with)\b",
    re.IGNORECASE,
)
_HISTORICAL_NEGATION = re.compile(
    r"\b(?:previously|formerly|at the time|before(?:\s+then)?|used to|earlier|in the past)\b",
    re.IGNORECASE,
)
_LATER_POSITIVE = re.compile(
    r"\b(?:later|since then|afterward|subsequently|now|currently|since \d{4})\b",
    re.IGNORECASE,
)
_THIRD_PARTY = re.compile(
    r"^(?:\s*)(?:my employer|our team|the team|the company|the employer|a client|the client|"
    r"my manager|the manager|my colleague|a colleague|they|he|she)\b",
    re.IGNORECASE,
)
def unique_skill_items(values: Iterable[str] | None) -> list[str]:
    """Remove case-insensitive duplicate skill labels without altering order."""
    result: list[str] = []
    seen: set[str] = set()
    for value in values or ():
        if not isinstance(value, str):
            continue
        item = value.strip()
        if item and item.casefold() not in seen:
            seen.add(item.casefold())
            result.append(item)
    return result


class SkillEvidenceOutput(TypedDict):
    matched_key_concepts: list[str]
    missing_or_gap_concepts: list[str]
    evidence_status: dict[str, list[str]]
    evidence_breakdown: list[dict[str, Any]]


def evaluate_skill_evidence(
    candidate_profile: dict[str, Any], job_requisition: dict[str, Any]
) -> SkillEvidenceOutput:
    """Evaluate original profile text independently of semantic scoring or chunking."""
    skills = unique_skill_items(candidate_profile.get("skills"))
    sections = candidate_profile.get("sections")
    fields = [candidate_profile.get("headline"), candidate_profile.get("experience_summary")]
    if isinstance(sections, dict):
        fields.extend(sections.values())

    lines: list[str] = []
    seen: set[str] = set()
    for field in fields:
        if not isinstance(field, str):
            continue
        for line in field.splitlines():
            key = " ".join(line.casefold().split())
            if key and key not in seen:
                seen.add(key)
                lines.append(line.strip())

    # Keep claims in independent fields from becoming one classifier sentence.
    source_text = "\n".join(lines)
    has_substantive_text = len(" ".join([source_text, *skills]).strip()) >= 20
    evidence_status: dict[str, list[str]] = {
        "supported": [], "not_detected": [], "insufficient_information": [],
    }
    breakdown: list[dict[str, Any]] = []
    missing: list[str] = []
    for category in ("required", "preferred"):
        for skill in unique_skill_items(job_requisition.get(f"{category}_skills")):
            status, quote, verification_type, note = classify_skill_evidence(skill, skills, source_text)
            if verification_type == "unmentioned" and not has_substantive_text:
                status = "insufficient_information"
                verification_type = "insufficient_material"
                note = "Candidate text is too sparse or missing to verify requirement."
            evidence_status[status].append(skill)
            if status != "supported":
                missing.append(skill)
            breakdown.append({
                "requirement": skill,
                "category": category,
                "status": status,
                "evidence_quote": quote,
                "verification_type": verification_type,
                "is_confirmed_gap": False,
                "note": note,
            })

    return {
        "matched_key_concepts": evidence_status["supported"][:8],
        "missing_or_gap_concepts": missing[:5],
        "evidence_status": evidence_status,
        "evidence_breakdown": breakdown,
    }


def _requirement_pattern(skill: str) -> re.Pattern[str]:
    if skill.casefold() == ".net":
        # ASP.NET includes the .NET platform name; retain the leading dot in the match.
        return re.compile(r"(?<![A-Za-z0-9])(?:ASP)?(\.NET)(?![A-Za-z])", re.IGNORECASE)
    return re.compile(rf"(?<![A-Za-z0-9])({re.escape(skill)})(?![A-Za-z])", re.IGNORECASE)


def _quote_encloses_mention(sentence: str, start: int, end: int) -> bool:
    pairs = {'"': '"', "'": "'", "“": "”", "‘": "’"}
    for opening, closing in pairs.items():
        left = sentence.rfind(opening, 0, start)
        right = sentence.find(closing, end)
        if left >= 0 and right >= end:
            return True
    return False


def _clauses(sentence: str) -> list[tuple[str, str]]:
    """Split contrast clauses and `and` clauses with independent action verbs."""
    pieces = re.split(r"\s+(but|however|although|yet|whereas|while|and)\s+", sentence, flags=re.IGNORECASE)
    clauses: list[tuple[str, str]] = []
    connector = ""
    prior_clause = ""
    for index, piece in enumerate(pieces):
        if index % 2:
            connector = piece.casefold()
            continue
        clause = piece.strip()
        if not clause:
            continue
        if connector == "and" and prior_clause:
            prior_has_action = bool(_NEGATION.search(prior_clause) or _LEARNING.search(prior_clause) or _DEMONSTRATION.search(prior_clause))
            clause_has_action = bool(_NEGATION.search(clause) or _LEARNING.search(clause) or _DEMONSTRATION.search(clause))
            if prior_has_action and not clause_has_action:
                clause = f"{prior_clause} {clause}"
        clauses.append((clause, connector))
        prior_clause = piece.strip()
        connector = ""
    return clauses


def classify_skill_evidence(
    requirement: str, declared_skills: Iterable[str] | None, source_text: str | None
) -> tuple[str, str | None, str, str]:
    """Classify exact skill mentions, retaining uncertainty for conflicting claims."""
    skill = requirement.strip() if isinstance(requirement, str) else ""
    if not skill:
        return "insufficient_information", None, "no_requirement_text", "Requirement is empty."

    pattern = _requirement_pattern(skill)
    declared = any(pattern.search(item) for item in unique_skill_items(declared_skills))
    mentions: list[dict[str, str]] = []
    text = source_text if isinstance(source_text, str) else ""
    sentences = re.split(r"(?<=[.!?;\n])\s+|[\n;]+", text)
    for sentence in sentences:
        for clause, connector in _clauses(sentence):
            for match in pattern.finditer(clause):
                quote = sentence.strip()[:200]
                context = clause[max(0, match.start() - 80):match.start()] + " " + clause[match.end():match.end() + 80]
                negative = _NEGATION.search(context)
                learning = _LEARNING.search(context)
                demonstration = _DEMONSTRATION.search(context)
                actor_is_third_party = bool(_THIRD_PARTY.search(clause)) or bool(
                    re.search(r"\bby\s+(?:my|our|the)\s+(?:employer|team|company|client|manager|colleague)\b", clause, re.IGNORECASE)
                )
                if negative:
                    status, evidence_type = "not_detected", "explicit_negation"
                elif _quote_encloses_mention(clause, match.start(), match.end()):
                    status, evidence_type = "insufficient_information", "quoted_mention"
                elif learning:
                    status, evidence_type = "insufficient_information", "learning_intent"
                elif demonstration and actor_is_third_party:
                    status, evidence_type = "insufficient_information", "third_party_experience"
                elif demonstration:
                    status, evidence_type = "supported", "demonstrated_context"
                else:
                    status, evidence_type = "insufficient_information", "unqualified_mention"
                mentions.append({
                    "status": status,
                    "type": evidence_type,
                    "quote": quote,
                    "clause": clause,
                    "connector": connector,
                })

    supported = [item for item in mentions if item["status"] == "supported"]
    negated = [item for item in mentions if item["type"] == "explicit_negation"]
    if supported and negated:
        historical_denial = any(_HISTORICAL_NEGATION.search(item["clause"]) for item in negated)
        later_demonstration = any(_LATER_POSITIVE.search(item["clause"]) for item in supported)
        if historical_denial and later_demonstration:
            item = next(item for item in supported if _LATER_POSITIVE.search(item["clause"]))
            return "supported", item["quote"], "demonstrated_after_historical_gap", "Later demonstrated experience follows an explicitly historical lack of experience."
        return "insufficient_information", supported[0]["quote"], "conflicting_mentions", "Candidate text contains both negated and positive skill claims; proficiency needs review."
    if supported:
        item = supported[0]
        return "supported", item["quote"], item["type"], "Candidate describes use or demonstrated work; proficiency level still needs review."
    if negated and declared:
        return "insufficient_information", negated[0]["quote"], "conflicting_declaration_and_negation", "A declared skill conflicts with explicit negation in the candidate text."
    if negated:
        return "not_detected", negated[0]["quote"], "explicit_negation", "Candidate text explicitly negates experience or proficiency."
    if declared:
        return "supported", f"Declared skill item: '{skill}'", "declared_skill_token", "Declared skill; proficiency level is not independently verified."
    if mentions:
        item = mentions[0]
        note = {
            "learning_intent": "Learning intent does not establish current proficiency.",
            "quoted_mention": "Quoted text is not treated as evidence of the candidate's own experience.",
            "third_party_experience": "Experience attributed to another person or organization is not candidate evidence.",
            "conflicting_mentions": "Candidate text contains conflicting skill claims; proficiency needs review.",
        }.get(item["type"], "A bare mention does not establish candidate experience or proficiency.")
        return item["status"], item["quote"], item["type"], note
    return "not_detected", None, "unmentioned", "Not detected in candidate text. Absence of mention is not proof of candidate deficiency."
