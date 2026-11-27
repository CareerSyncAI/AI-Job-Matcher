"""Context-Aware Skill Extractor for CareerSync AI.

Extracts technical competencies using token-boundary matching, section weighting,
and contextual disambiguation to eliminate common NLP false positives.
"""

from __future__ import annotations

import re
from typing import Any

from src.normalizers.skill_normalizer import SkillNormalizer
from src.normalizers.taxonomy import ALIAS_LOOKUP, AMBIGUOUS_SKILLS


class SkillExtractor:
    """Extracts and canonicalizes technical skills from resume text and sections."""

    def __init__(self):
        self.normalizer = SkillNormalizer()
        self.alias_lookup = ALIAS_LOOKUP
        self._compiled_patterns = self._compile_patterns()
        self._ambiguous_context_patterns = self._compile_context_patterns()

    def _compile_patterns(self) -> dict[str, re.Pattern]:
        """Pre-compile regex patterns with word boundaries for each skill alias, sorted by length."""
        patterns = {}
        # Sort aliases by descending length so multi-word/compound skills match before short sub-tokens
        sorted_aliases = sorted(self.alias_lookup.keys(), key=lambda x: -len(x))
        for alias in sorted_aliases:
            escaped = re.escape(alias)
            if alias in {"c", "r"}:
                pattern = re.compile(rf"(?<![a-zA-Z0-9_#+]){escaped}(?![a-zA-Z0-9_#+])", re.IGNORECASE)
            elif alias in {"js", "ts", "py"}:
                # Prevent false positives from file extensions (e.g. .js, .ts, .py) or library names (e.g. Node.js)
                pattern = re.compile(rf"(?<![a-zA-Z0-9_.#+]){escaped}(?![a-zA-Z0-9_#+])", re.IGNORECASE)
            else:
                pattern = re.compile(rf"(?<![a-zA-Z0-9_]){escaped}(?![a-zA-Z0-9_])", re.IGNORECASE)
            patterns[alias] = pattern
        return patterns

    def _compile_context_patterns(self) -> dict[str, list[re.Pattern]]:
        """Pre-compile context patterns with smart word boundaries for ambiguous tokens."""
        context_patterns = {}
        for alias, rule in AMBIGUOUS_SKILLS.items():
            patterns = []
            for ctx in rule["contexts"]:
                prefix = r"(?<![a-zA-Z0-9_])" if ctx[0].isalnum() else ""
                suffix = r"(?![a-zA-Z0-9_])" if ctx[-1].isalnum() else ""
                patterns.append(re.compile(rf"{prefix}{re.escape(ctx)}{suffix}", re.IGNORECASE))
            context_patterns[alias] = patterns
        return context_patterns

    def extract_from_sections(self, sections: dict[str, str]) -> list[dict[str, Any]]:
        """Extract skills across sections with section-based weighting and cross-section disambiguation."""
        detected_skills: dict[str, dict[str, Any]] = {}

        # Prioritize sections: skills > experience > projects > summary
        section_weights = {
            "skills": 1.0,
            "experience": 0.85,
            "projects": 0.80,
            "summary": 0.75,
            "contact": 0.50
        }

        # Combine all sections to form full document context for ambiguous token disambiguation
        combined_text = "\n\n".join(sections.values())

        for sec_name, text in sections.items():
            weight = section_weights.get(sec_name, 0.70)
            sec_skills = self._extract_from_text(
                text,
                default_confidence_mult=weight,
                section=sec_name,
                context_text=combined_text,
            )
            for item in sec_skills:
                canonical = item["canonical_name"]
                if canonical not in detected_skills or item["confidence"] > detected_skills[canonical]["confidence"]:
                    detected_skills[canonical] = item

        return list(detected_skills.values())

    def extract_from_text(self, text: str) -> list[dict[str, Any]]:
        """Extract skills from a flat text string."""
        return self._extract_from_text(text, default_confidence_mult=0.90, section="full_text")

    def _extract_from_text(
        self,
        text: str,
        default_confidence_mult: float,
        section: str,
        context_text: str | None = None,
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        seen_canonical: set[str] = set()
        lower_context = (context_text or text).lower()

        for alias, pattern in self._compiled_patterns.items():
            if pattern.search(text):
                # Disambiguation check for ambiguous short tokens (e.g. 'c', 'go', 'spring', 'cv', 'next')
                if alias in AMBIGUOUS_SKILLS:
                    if not self._check_ambiguous_context(lower_context, alias):
                        continue

                canonical_name, category = self.alias_lookup[alias]
                if canonical_name not in seen_canonical:
                    seen_canonical.add(canonical_name)
                    confidence = round(0.95 * default_confidence_mult, 2)
                    results.append({
                        "raw_name": alias,
                        "canonical_name": canonical_name,
                        "category": category,
                        "confidence": confidence,
                        "source_section": section
                    })

        return results

    def _check_ambiguous_context(self, lower_text: str, alias: str) -> bool:
        """Verify that an ambiguous token appears within technical context rather than common prose."""
        patterns = self._ambiguous_context_patterns.get(alias, [])
        for pattern in patterns:
            if pattern.search(lower_text):
                return True
        return False
