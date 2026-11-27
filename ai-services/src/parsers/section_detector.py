"""Section Boundary Detector for CareerSync AI.

Identifies and partitions raw resume text into canonical semantic sections:
contact, summary, skills, experience, education, projects, certifications.
Supports clean newline headers, multi-space/tab headers, and column breaks.
"""

from __future__ import annotations

import re

SECTION_ALIASES = {
    "summary": (
        "professional summary", "summary", "profile", "about me", "objective",
        "executive summary", "career objective", "career summary", "summary of qualifications",
        "personal summary",
    ),
    "skills": (
        "skills and abilities", "skills abilities", "technical skills", "core competencies",
        "clinical skills", "skills", "competencies", "technologies", "tools and frameworks",
        "tools frameworks", "tech stack", "highlights", "key skills", "technical proficiencies",
        "core qualifications", "skills summary", "key competencies", "areas of expertise",
        "technical expertise", "languages and frameworks", "languages and technologies",
    ),
    "experience": (
        "work experience", "professional experience", "experience", "employment history", "career history",
        "work history", "career overview", "clinical experience", "relevant experience", "accounting experience",
        "professional background", "work background", "professional history", "relevant work experience",
        "career highlights",
    ),
    "education": (
        "education", "academic background", "educational qualifications", "academics",
        "qualifications", "academic history", "academic training", "education and training",
        "educational background", "degrees and certifications",
    ),
    "projects": (
        "professional projects", "projects", "personal projects", "key projects",
        "academic projects", "portfolio", "selected projects", "technical projects",
        "project experience",
    ),
    "certifications": (
        "professional certifications", "certifications", "certificates", "licenses and certifications",
        "licenses certifications", "licenses", "accreditations", "certifications and licenses",
        "credentials", "professional licenses",
    ),
}


def _normalize_heading(value: str) -> str:
    return " ".join(re.sub(r"[^\w]+", " ", value.casefold(), flags=re.UNICODE).split())


SECTION_LOOKUP = {_normalize_heading(alias): section for section, aliases in SECTION_ALIASES.items() for alias in aliases}
_ALIAS_REGEXES = sorted(
    (re.escape(alias).replace(r"\ ", r"[\s._-]+") for aliases in SECTION_ALIASES.values() for alias in aliases),
    key=len,
    reverse=True,
)
UNIVERSAL_HEADER_REGEX = re.compile(
    r"^[ \t]*([#•*–—-]?[ \t]*(?:" + "|".join(_ALIAS_REGEXES) + r")[ \t]*(?:[:：|])?)[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)


class SectionDetector:
    """Segments arbitrary resume text streams into semantic sections."""

    def split_sections(self, text: str) -> dict[str, str]:
        if not text or not text.strip():
            return {}

        sections: dict[str, list[str]] = {
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

        # Content before the first standalone section heading is contact/header.
        first_match = matches[0]
        lead_content = text[:first_match.start()].strip()
        if lead_content:
            sections["contact"].append(lead_content)

        # Slice between consecutive matches
        for i in range(len(matches)):
            curr_match = matches[i]
            header_raw = curr_match.group(1).strip(" \t\r\n:：|#•*–—-")
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
        return SECTION_LOOKUP.get(_normalize_heading(header_str), "summary")
