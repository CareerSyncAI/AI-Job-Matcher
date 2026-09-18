"""Skill Normalizer for CareerSync AI.

Transforms raw, noisy, or varied skill strings into authoritative canonical representations.
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional
from src.normalizers.taxonomy import ALIAS_LOOKUP, CANONICAL_SKILLS


class SkillNormalizer:
    """Normalizes arbitrary skill names into canonical taxonomy representations."""

    def __init__(self):
        self.lookup = ALIAS_LOOKUP
        self.canonical = CANONICAL_SKILLS

    def normalize_single(self, raw_skill: str) -> Dict[str, any]:
        """Normalize a single raw skill string."""
        cleaned = raw_skill.strip()
        cleaned_lower = cleaned.lower()

        # Remove trailing punctuation or parentheticals e.g. "React (v18)" -> "React"
        cleaned_base = re.sub(r"\s*[\(\[].*?[\)\]]", "", cleaned_lower).strip()

        if cleaned_lower in self.lookup:
            canonical_name, category = self.lookup[cleaned_lower]
            return {
                "input": raw_skill,
                "canonical": canonical_name,
                "category": category,
                "matched": True,
                "confidence": 1.0 if cleaned_lower == canonical_name.lower() else 0.95
            }
        elif cleaned_base in self.lookup:
            canonical_name, category = self.lookup[cleaned_base]
            return {
                "input": raw_skill,
                "canonical": canonical_name,
                "category": category,
                "matched": True,
                "confidence": 0.90
            }
        else:
            # Fallback: title-case the cleaned string as an unrecognized domain skill
            return {
                "input": raw_skill,
                "canonical": cleaned.title(),
                "category": "Other / Domain Specific",
                "matched": False,
                "confidence": 0.50
            }

    def normalize_list(self, raw_skills: List[str]) -> List[Dict[str, any]]:
        """Normalize a list of raw skill strings, deduplicating canonical forms."""
        seen_canonical = set()
        results = []

        for skill in raw_skills:
            if not skill or not skill.strip():
                continue
            normalized = self.normalize_single(skill)
            can_name = normalized["canonical"]
            if can_name not in seen_canonical:
                seen_canonical.add(can_name)
                results.append(normalized)

        return results
