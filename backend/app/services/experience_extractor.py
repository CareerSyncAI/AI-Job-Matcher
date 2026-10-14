"""
Experience & Chronological Tenure Extractor for CareerSync AI.

Extracts employment intervals, calculates non-overlapping tenure duration,
and computes verified total experience years from resume text without external ML dependencies.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12,
}

DATE_RANGE_PATTERN = re.compile(
    r"\b((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|(?:\d{1,2}/(?:\d{4}|\d{2})))\s*(?:[-–—]|to|until)\s*((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|(?:\d{1,2}/(?:\d{4}|\d{2}))|present|current|now)\b",
    re.IGNORECASE,
)

COMMON_ROLE_TITLES = [
    "software engineer", "senior software engineer", "full stack developer", "frontend developer",
    "backend developer", "lead engineer", "engineering manager", "systems engineer",
    "cloud architect", "data engineer", "devops engineer", "ai engineer", "machine learning engineer",
    "intern", "software development intern", "associate engineer", "principal engineer", "staff engineer",
]


class ExperienceExtractor:
    """Extracts employment history and calculates verified tenure."""

    def extract(
        self, experience_text: str, *, as_of: datetime | None = None
    ) -> dict[str, Any]:
        if not experience_text or not experience_text.strip():
            return {
                "entries": [],
                "total_experience_months": 0,
                "total_experience_years": 0.0,
            }

        lines = [line.strip() for line in experience_text.splitlines() if line.strip()]
        entries: list[dict[str, Any]] = []
        date_intervals: list[tuple[datetime, datetime]] = []

        in_education = False
        for idx, line in enumerate(lines):
            clean_lower = line.strip().lower()
            if re.match(r"^(?:education|academics|academic background|qualifications)\b", clean_lower):
                in_education = True
            elif re.match(r"^(?:work experience|professional experience|experience|employment history)\b", clean_lower):
                in_education = False

            if in_education:
                continue

            match = DATE_RANGE_PATTERN.search(line)
            if match:
                raw_start, raw_end = match.group(1), match.group(2)
                start_dt, end_dt, is_current = self._parse_date_pair(
                    raw_start, raw_end, as_of=as_of
                )

                if start_dt and end_dt and end_dt >= start_dt:
                    duration_months = max(1, (end_dt.year - start_dt.year) * 12 + (end_dt.month - start_dt.month))
                    title, org = self._extract_title_org(lines, idx, match)
                    highlights = self._extract_highlights(lines, idx + 1)
                    is_intern = bool(re.search(r"\b(?:intern|internship|trainee)\b", title, re.IGNORECASE))

                    if not is_intern:
                        date_intervals.append((start_dt, end_dt))

                    entries.append({
                        "organization": org,
                        "role_title": title,
                        "start_date": start_dt.strftime("%Y-%m"),
                        "end_date": None if is_current else end_dt.strftime("%Y-%m"),
                        "is_current": is_current,
                        "is_internship": is_intern,
                        "duration_months": duration_months,
                        "highlights": highlights,
                    })

        total_months = self._calculate_non_overlapping_tenure(date_intervals)

        return {
            "entries": entries,
            "total_experience_months": total_months,
            "total_experience_years": round(total_months / 12.0, 1),
        }

    def _parse_date_pair(
        self, start_str: str, end_str: str, *, as_of: datetime | None = None
    ) -> tuple[datetime | None, datetime | None, bool]:
        start_dt = self._parse_single_date(start_str)
        is_current = bool(re.search(r"present|current|now", end_str, re.IGNORECASE))

        if is_current:
            end_dt = as_of or datetime.now()
        else:
            end_dt = self._parse_single_date(end_str)

        return start_dt, end_dt, is_current

    def _parse_single_date(self, text: str) -> datetime | None:
        text = text.strip().lower()
        m1 = re.search(r"([a-z]+)\.?\s+((?:19|20)\d{2})", text)
        if m1:
            m_str, y_str = m1.group(1), m1.group(2)
            month = MONTH_MAP.get(m_str[:3], 1)
            return datetime(int(y_str), month, 1)

        m2 = re.search(r"\b(\d{1,2})/(?:(19\d{2}|20\d{2})|(\d{2}))\b", text)
        if m2:
            m_val = int(m2.group(1))
            if m2.group(2):
                y_val = int(m2.group(2))
            else:
                short_y = int(m2.group(3))
                y_val = short_y + (2000 if short_y < 50 else 1900)
            m_val = max(1, min(12, m_val))
            return datetime(y_val, m_val, 1)

        m3 = re.search(r"\b((?:19|20)\d{2})\b", text)
        if m3:
            return datetime(int(m3.group(1)), 1, 1)

        return None

    def _calculate_non_overlapping_tenure(self, intervals: list[tuple[datetime, datetime]]) -> int:
        if not intervals:
            return 0

        sorted_intervals = sorted(intervals, key=lambda x: x[0])
        merged: list[list[datetime]] = []

        for start, end in sorted_intervals:
            if not merged:
                merged.append([start, end])
            else:
                prev_start, prev_end = merged[-1]
                if start <= prev_end:
                    merged[-1][1] = max(prev_end, end)
                else:
                    merged.append([start, end])

        total_months = 0
        for start, end in merged:
            m = (end.year - start.year) * 12 + (end.month - start.month)
            total_months += max(1, m)

        return total_months

    def _extract_title_org(self, lines: list[str], date_idx: int, match: re.Match) -> tuple[str, str]:
        line = lines[date_idx]
        text_without_date = line[:match.start()] + line[match.end():]
        text_without_date = text_without_date.strip(" -|•,")

        title = "Professional"
        org = "Organization"

        for role in COMMON_ROLE_TITLES:
            if role in line.lower():
                title = role.title()
                break

        if date_idx > 0:
            prev_line = lines[date_idx - 1]
            parts = re.split(r"[,|•\-–—]", prev_line)
            parts = [p.strip() for p in parts if p.strip()]
            if len(parts) >= 2:
                title = parts[0].title()
                org = parts[1]
            elif len(parts) == 1:
                org = parts[0]

        return title, org

    def _extract_highlights(self, lines: list[str], start_idx: int) -> list[str]:
        highlights = []
        for i in range(start_idx, min(len(lines), start_idx + 4)):
            line = lines[i]
            if DATE_RANGE_PATTERN.search(line):
                break
            if line.startswith(("-", "•", "*", "–")) or len(line) > 20:
                clean = re.sub(r"^[-•*–]\s*", "", line).strip()
                if clean:
                    highlights.append(clean)
        return highlights


experience_extractor = ExperienceExtractor()


def extract_experience_years_from_text(
    experience_text: str, *, as_of: datetime | None = None
) -> float | None:
    """Convenience helper to extract total experience years from text."""
    res = experience_extractor.extract(experience_text, as_of=as_of)
    years = res.get("total_experience_years", 0.0)
    return float(years) if years > 0 else None
