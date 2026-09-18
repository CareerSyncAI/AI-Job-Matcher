"""Section Boundary Detector for CareerSync AI.

Identifies and partitions raw resume text into canonical semantic sections:
contact, summary, skills, experience, education, projects, certifications.
Supports clean newline headers, multi-space/tab headers, and column breaks.
"""

from __future__ import annotations
import re
from typing import Dict, List, Tuple


SECTION_PATTERNS = {
    "summary": re.compile(
        r"^(?:professional\s+summary|summary|profile|about\s+me|objective|executive\s+summary|career\s+objective)\b",
        re.IGNORECASE,
    ),
    "skills": re.compile(
        r"^(?:skills\s*(?:&|and)?\s*abilities|technical\s+skills|core\s+competencies|skills|competencies|technologies|tools\s*(?:&|and)?\s*frameworks|tech\s+stack|highlights|key\s+skills)\b",
        re.IGNORECASE,
    ),
    "experience": re.compile(
        r"^(?:work\s+experience|professional\s+experience|experience|employment\s+history|career\s+history|work\s+history|career\s+overview)\b",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"^(?:education|academic\s+background|educational\s+qualifications|academics|qualifications|academic\s+history)\b",
        re.IGNORECASE,
    ),
    "projects": re.compile(
        r"^(?:projects|personal\s+projects|key\s+projects|academic\s+projects|portfolio)\b",
        re.IGNORECASE,
    ),
    "certifications": re.compile(
        r"^(?:certifications|certificates|licenses\s*(?:&|and)?\s*certifications|professional\s+certifications)\b",
        re.IGNORECASE,
    ),
}

UNIVERSAL_HEADER_REGEX = re.compile(
    r"(?:^|\n|\s{3,}|\t+)(professional\s+summary|summary|profile|about\s+me|objective|executive\s+summary|"
    r"technical\s+skills|skills\s*(?:&|and)?\s*abilities|core\s+competencies|skills|competencies|technologies|"
    r"work\s+experience|professional\s+experience|experience|employment\s+history|career\s+history|"
    r"education|academic\s+background|academics|qualifications|"
    r"projects|certifications)(?::|\s{2,}|\t+|\n|$)",
    re.IGNORECASE,
)


class SectionDetector:
    """Segments arbitrary resume text streams into semantic sections."""

    def split_sections(self, text: str) -> Dict[str, str]:
        if not text or not text.strip():
            return {}

        sections: Dict[str, List[str]] = {
            "contact": [],
            "summary": [],
            "skills": [],
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
        }

        # Step 1: Find all section markers across the full text
        matches = list(UNIVERSAL_HEADER_REGEX.finditer(text))

        if not matches:
            # Fallback: All text in summary if no headers detected
            return {"summary": text.strip()}

        # Content before the first header is contact/header
        first_match = matches[0]
        lead_content = text[:first_match.start()].strip()
        if lead_content:
            sections["contact"].append(lead_content)

        # Slice between consecutive matches
        for i in range(len(matches)):
            curr_match = matches[i]
            header_raw = curr_match.group(1).strip()
            sec_key = self._resolve_section_key(header_raw)

            chunk_start = curr_match.end()
            chunk_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            sec_text = text[chunk_start:chunk_end].strip()

            if sec_text and sec_key in sections:
                sections[sec_key].append(sec_text)

        # Merge and return non-empty sections
        return {
            sec: "\n\n".join(chunks).strip()
            for sec, chunks in sections.items()
            if chunks and "\n\n".join(chunks).strip()
        }

    def _resolve_section_key(self, header_str: str) -> str:
        clean = header_str.strip()
        for sec_key, pattern in SECTION_PATTERNS.items():
            if pattern.search(clean):
                return sec_key
        return "summary"
