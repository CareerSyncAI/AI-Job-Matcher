"""
Education Credential Extractor for CareerSync AI.

Extracts university degrees, degree levels (Bachelor/Master/PhD), institutions,
and fields of study without inventing unmentioned credentials.
"""

from __future__ import annotations

import re
from typing import Any

DEGREE_LEVEL_PATTERNS = [
    (re.compile(r"\b(?:ph\.?d|doctorate|doctor\s+of\s+philosophy)\b", re.IGNORECASE), "Doctorate"),
    (re.compile(r"\b(?:m\.?s\.?|master|m\.?tech|m\.?e\.?|mba|m\.?sc)\b", re.IGNORECASE), "Master"),
    (re.compile(r"\b(?:b\.?s\.?|bachelor|b\.?tech|b\.?e\.?|b\.?sc|b\.?a\.?|undergraduate)\b", re.IGNORECASE), "Bachelor"),
    (re.compile(r"\b(?:associate|diploma)\b", re.IGNORECASE), "Associate"),
]

INSTITUTION_KEYWORDS = re.compile(
    r"\b(?:university|college|institute|polytechnic|academy|school\s+of)\b",
    re.IGNORECASE,
)

YEAR_PATTERN = re.compile(r"\b((?:19|20)\d{2})\b")


class EducationExtractor:
    """Extracts verified academic degrees and institutions from education sections."""

    def extract(self, education_text: str) -> list[dict[str, Any]]:
        if not education_text or not education_text.strip():
            return []

        entries: list[dict[str, Any]] = []
        lines = [line.strip() for line in education_text.splitlines() if line.strip()]

        for line in lines:
            degree_level = None
            for pattern, level in DEGREE_LEVEL_PATTERNS:
                if pattern.search(line):
                    degree_level = level
                    break

            if degree_level or INSTITUTION_KEYWORDS.search(line):
                year_match = YEAR_PATTERN.search(line)
                grad_year = int(year_match.group(1)) if year_match else None

                inst, degree_name = self._parse_inst_and_degree(line)

                entries.append({
                    "institution": inst,
                    "degree_level": degree_level,
                    "degree_name": degree_name if degree_level else (degree_name or "Degree"),
                    "field_of_study": self._infer_field(line),
                    "graduation_year": grad_year,
                })

        return entries

    def _parse_inst_and_degree(self, line: str) -> tuple[str | None, str | None]:
        parts = re.split(r"[,|•\-–—]", line)
        parts = [p.strip() for p in parts if p.strip()]

        inst: str | None = None
        degree: str | None = None

        for part in parts:
            if INSTITUTION_KEYWORDS.search(part):
                inst = part
            elif any(pat.search(part) for pat, _ in DEGREE_LEVEL_PATTERNS):
                degree = part

        if not degree and parts:
            degree = parts[0]

        return inst, degree

    def _infer_field(self, line: str) -> str | None:
        lower = line.lower()
        if re.search(r"\b(?:computer\s+science|cs)\b", lower):
            return "Computer Science"
        if re.search(r"\b(?:information\s+technology|it)\b", lower):
            return "Information Technology"
        if re.search(r"\bsoftware\s+engineering\b", lower):
            return "Software Engineering"
        if re.search(r"\bdata\s+science\b", lower):
            return "Data Science"
        if re.search(r"\b(?:electrical|electronics)\b", lower):
            return "Electrical & Electronics"
        if re.search(r"\bmechanical\b", lower):
            return "Mechanical Engineering"
        if re.search(r"\bcivil\b", lower):
            return "Civil Engineering"
        return None


education_extractor = EducationExtractor()


def extract_education_from_text(education_text: str) -> list[dict[str, Any]]:
    """Convenience helper to extract education credentials from text."""
    return education_extractor.extract(education_text)
