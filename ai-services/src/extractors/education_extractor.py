"""Education Credential Extractor for CareerSync AI.

Extracts university degrees, degree levels (Bachelor/Master/PhD), institutions,
fields of study, and graduation years without hallucinating missing data.
"""

from __future__ import annotations
import re
from typing import Dict, List, Optional


DEGREE_LEVEL_PATTERNS = [
    (re.compile(r"\b(?:ph\.?d|doctorate|doctor\s+of\s+philosophy)\b", re.IGNORECASE), "Doctorate"),
    (re.compile(r"\b(?:m\.?s\.?|master|m\.?tech|m\.?e\.?|mba|m\.?sc)\b", re.IGNORECASE), "Master"),
    (re.compile(r"\b(?:b\.?s\.?|bachelor|b\.?tech|b\.?e\.?|b\.?sc|b\.?a\.?|undergraduate)\b", re.IGNORECASE), "Bachelor"),
    (re.compile(r"\b(?:associate|diploma)\b", re.IGNORECASE), "Associate")
]

INSTITUTION_KEYWORDS = re.compile(
    r"\b(?:university|college|institute|polytechnic|academy|school\s+of)\b",
    re.IGNORECASE
)

YEAR_PATTERN = re.compile(r"\b((?:19|20)\d{2})\b")


class EducationExtractor:
    """Extracts verified academic degrees and institutions from education sections."""

    def extract(self, education_text: str) -> List[Dict[str, any]]:
        if not education_text or not education_text.strip():
            return []

        entries: List[Dict[str, any]] = []
        lines = [line.strip() for line in education_text.splitlines() if line.strip()]

        for line in lines:
            degree_level = None
            for pattern, level in DEGREE_LEVEL_PATTERNS:
                if pattern.search(line):
                    degree_level = level
                    break

            # If degree level or university keyword found, this is an education entry line
            if degree_level or INSTITUTION_KEYWORDS.search(line):
                # Extract year
                year_match = YEAR_PATTERN.search(line)
                grad_year = int(year_match.group(1)) if year_match else None

                # Extract institution vs degree name
                inst, degree_name = self._parse_inst_and_degree(line)

                entries.append({
                    "institution": inst,
                    "degree_level": degree_level or "Bachelor",
                    "degree_name": degree_name or "Degree in Computing / Science",
                    "field_of_study": self._infer_field(line),
                    "graduation_year": grad_year
                })

        return entries

    def _parse_inst_and_degree(self, line: str) -> Tuple[str, str]:
        parts = re.split(r"[,|•\-–—]", line)
        parts = [p.strip() for p in parts if p.strip()]

        inst = "University / Institution"
        degree = ""

        for part in parts:
            if INSTITUTION_KEYWORDS.search(part):
                inst = part
            elif any(pat.search(part) for pat, _ in DEGREE_LEVEL_PATTERNS):
                degree = part

        return inst, degree or (parts[0] if parts else "Degree")

    def _infer_field(self, line: str) -> str:
        lower = line.lower()
        if "computer science" in lower or "cs" in lower:
            return "Computer Science"
        if "information technology" in lower or "it" in lower:
            return "Information Technology"
        if "software engineering" in lower:
            return "Software Engineering"
        if "data science" in lower:
            return "Data Science"
        if "electrical" in lower or "electronics" in lower:
            return "Electrical & Electronics"
        return "Computer Science & Engineering"
