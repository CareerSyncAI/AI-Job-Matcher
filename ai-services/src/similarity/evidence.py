"""Conservative, schema-compatible evidence classification for skill mentions."""
from __future__ import annotations

import re
from collections.abc import Iterable

_NEGATION = re.compile(r"\b(?:no|not|never|without|lack(?:s|ed|ing)?)\b.{0,48}\b(?:experience|proficiency|expertise|used|worked|knowledge)\b|\b(?:not|never)\s+(?:proficient|experienced|familiar)\s+(?:with|in)\b", re.I)
_LEARNING = re.compile(r"\b(?:learning|studying|exploring|planning to learn|want to learn|beginner in)\b", re.I)
_DEMONSTRATION = re.compile(r"\b(?:built|developed|implemented|used|created|maintained|deployed|designed|managed|spearheaded|led|architected|engineered|operated|configured|proficient|experienced|expertise|years? of experience|worked with)\b", re.I)


def unique_skill_items(values: Iterable[str]) -> list[str]:
    """Remove case-insensitive duplicate skill labels without altering order."""
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if isinstance(value, str) and value.strip() and value.casefold() not in seen:
            seen.add(value.casefold())
            result.append(value.strip())
    return result


def classify_skill_evidence(requirement: str, declared_skills: Iterable[str], source_text: str) -> tuple[str, str | None, str, str]:
    """Classify direct skill evidence; bare narrative mentions remain uncertain."""
    skill = requirement.strip()
    if not skill:
        return "insufficient_information", None, "no_requirement_text", "Requirement is empty."
    if skill.casefold() in {item.casefold() for item in unique_skill_items(declared_skills)}:
        return "supported", f"Declared skill item: '{skill}'", "declared_skill_token", "Declared skill; proficiency level is not independently verified."

    pattern = re.compile(rf"(?<![A-Za-z0-9]){re.escape(skill)}(?![A-Za-z0-9])", re.I)
    for sentence in re.split(r"(?<=[.!?;\n])\s+|[\n;]+", source_text):
        match = pattern.search(sentence)
        if not match:
            continue
        quote = sentence.strip()[:200]
        context = sentence[max(0, match.start() - 80):match.start()] + " " + sentence[match.end():match.end() + 80]
        if _NEGATION.search(context):
            return "not_detected", quote, "explicit_negation", "Candidate text explicitly negates experience or proficiency."
        if _LEARNING.search(context):
            return "insufficient_information", quote, "learning_intent", "Learning intent does not establish current proficiency."
        if re.search(r"[\"'“”‘’]", sentence):
            return "insufficient_information", quote, "quoted_mention", "Quoted text is not treated as evidence of the candidate's own experience."
        if _DEMONSTRATION.search(context):
            return "supported", quote, "demonstrated_context", "Candidate describes use or demonstrated work; proficiency level still needs review."
        return "insufficient_information", quote, "unqualified_mention", "A bare mention does not establish candidate experience or proficiency."
    return "not_detected", None, "unmentioned", "Not detected in candidate text. Absence of mention is not proof of candidate deficiency."
