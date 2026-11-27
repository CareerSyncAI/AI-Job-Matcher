"""Skill Normalizer for CareerSync AI.

Transforms raw, noisy, or varied skill strings into authoritative canonical representations.
"""

from __future__ import annotations

import re
from typing import Any

from src.normalizers.taxonomy import ALIAS_LOOKUP, CANONICAL_SKILLS


class SkillNormalizer:
    """Normalizes arbitrary skill names into canonical taxonomy representations."""

    def __init__(self):
        self.lookup = ALIAS_LOOKUP
        self.canonical = CANONICAL_SKILLS

    def normalize_single(self, raw_skill: str) -> dict[str, Any]:
        """Normalize a single raw skill string."""
        raw_clean = raw_skill.strip()
        # Unwrap outer enclosing brackets/parentheses if present (e.g. "(Docker)" -> "Docker", "[Python]" -> "Python")
        if (raw_clean.startswith("(") and raw_clean.endswith(")")) or (raw_clean.startswith("[") and raw_clean.endswith("]")):
            raw_clean = raw_clean[1:-1].strip()
        raw_lower = raw_clean.lower()

        # Step 1: Strip leading bullets, numbers, or dashes
        cleaned = re.sub(r"^[\s•*▪\-–—]+\s*|^\d+[\.\)]\s*", "", raw_clean)
        # Step 2: Strip trailing punctuation (preserves trailing '#' for C# and '+' for C++)
        cleaned = re.sub(r"[\s,.;:!?]+$", "", cleaned)
        cleaned_lower = cleaned.lower()

        # Step 3: Remove parentheticals and extra outer delimiters (e.g. "React (v18)" -> "React", "(Docker)" -> "Docker")
        cleaned_base = re.sub(r"\s*[\(\[].*?[\)\]]", "", raw_clean).strip().lower()
        cleaned_base = re.sub(r"^[\s•*▪\-–—/(\[{'\"`]+\s*|^\d+[\.\)]\s*", "", cleaned_base)
        cleaned_base = re.sub(r"[\s,.;:!?/)}\]'\"`]+$", "", cleaned_base)

        # Priority 1: Direct match on raw input
        if raw_lower in self.lookup:
            canonical_name, category = self.lookup[raw_lower]
            return {
                "input": raw_skill,
                "canonical": canonical_name,
                "category": category,
                "matched": True,
                "confidence": 1.0 if raw_lower == canonical_name.lower() else 0.95,
            }
        elif cleaned_lower in self.lookup:
            canonical_name, category = self.lookup[cleaned_lower]
            return {
                "input": raw_skill,
                "canonical": canonical_name,
                "category": category,
                "matched": True,
                "confidence": 1.0 if cleaned_lower == canonical_name.lower() else 0.95,
            }
        elif cleaned_base in self.lookup:
            canonical_name, category = self.lookup[cleaned_base]
            return {
                "input": raw_skill,
                "canonical": canonical_name,
                "category": category,
                "matched": True,
                "confidence": 0.90,
            }
        else:
            # Fallback: title-case the cleaned string as an unrecognized domain skill
            return {
                "input": raw_skill,
                "canonical": cleaned.title() if cleaned else raw_clean.title(),
                "category": "Other / Domain Specific",
                "matched": False,
                "confidence": 0.50,
            }

    def normalize_list(self, raw_skills: list[str]) -> list[dict[str, Any]]:
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
