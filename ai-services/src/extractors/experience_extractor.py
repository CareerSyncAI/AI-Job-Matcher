"""Experience & Chronological Tenure Extractor for CareerSync AI.

Extracts employment entries, job titles, organizations, date boundaries,
and calculates realistic non-overlapping tenure duration in months.
"""

from __future__ import annotations
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple


MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12
}

# Regex matching date intervals: "Jan 2020 - Present", "2018 - 2022", "06/2019 to 12/2021"
DATE_RANGE_PATTERN = re.compile(
    r"\b((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|(?:\d{1,2}/(?:\d{4}|\d{2})))\s*(?:[-–—]|to|until)\s*((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|(?:\d{1,2}/(?:\d{4}|\d{2}))|present|current|now)\b",
    re.IGNORECASE,
)

COMMON_ROLE_TITLES = [
    "software engineer", "senior software engineer", "full stack developer", "frontend developer",
    "backend developer", "lead engineer", "engineering manager", "systems engineer",
    "cloud architect", "data engineer", "devops engineer", "ai engineer", "machine learning engineer",
    "intern", "software development intern", "associate engineer", "principal engineer", "staff engineer"
]


class ExperienceExtractor:
    """Extracts employment history and calculates verified tenure."""

    def extract(self, experience_text: str) -> Dict[str, any]:
        if not experience_text or not experience_text.strip():
            return {
                "entries": [],
                "total_experience_months": 0,
                "total_experience_years": 0.0
            }

        lines = [line.strip() for line in experience_text.splitlines() if line.strip()]
        entries: List[Dict[str, any]] = []
        date_intervals: List[Tuple[datetime, datetime]] = []

        in_education = False
        # Find date range lines and parse surrounding organization and title
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
                start_dt, end_dt, is_current = self._parse_date_pair(raw_start, raw_end)

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
                        "highlights": highlights
                    })

        total_months = self._calculate_non_overlapping_tenure(date_intervals)

        return {
            "entries": entries,
            "total_experience_months": total_months,
            "total_experience_years": round(total_months / 12.0, 1)
        }

    def _parse_date_pair(self, start_str: str, end_str: str) -> Tuple[Optional[datetime], Optional[datetime], bool]:
        start_dt = self._parse_single_date(start_str)
        is_current = bool(re.search(r"present|current|now", end_str, re.IGNORECASE))

        if is_current:
            end_dt = datetime.now()
        else:
            end_dt = self._parse_single_date(end_str)

        return start_dt, end_dt, is_current

    def _parse_single_date(self, text: str) -> Optional[datetime]:
        text = text.strip().lower()
        # Pattern 1: Month Year (e.g. 'Jan 2021', 'January 2020')
        m1 = re.search(r"([a-z]+)\.?\s+((?:19|20)\d{2})", text)
        if m1:
            m_str, y_str = m1.group(1), m1.group(2)
            month = MONTH_MAP.get(m_str[:3], 1)
            return datetime(int(y_str), month, 1)

        # Pattern 2: MM/YYYY or M/YYYY or MM/YY
        m2 = re.search(r"\b(\d{1,2})/(?:(19\d{2}|20\d{2})|(\d{2}))\b", text)
        if m2:
            m = int(m2.group(1))
            if m2.group(2):
                y = int(m2.group(2))
            else:
                short_y = int(m2.group(3))
                y = short_y + (2000 if short_y < 50 else 1900)
            return datetime(y, min(12, max(1, m)), 1)

        # Pattern 3: Just Year (e.g. '2021')
        m3 = re.search(r"\b((?:19|20)\d{2})\b", text)
        if m3:
            return datetime(int(m3.group(1)), 1, 1)

        return None

    def _extract_title_org(self, lines: List[str], current_idx: int, date_match: re.Match) -> Tuple[str, str]:
        current_line = lines[current_idx]
        # Check if title/org are on the same line as the date (e.g. "Software Engineer - Google | 2020 - 2022")
        line_without_date = current_line[:date_match.start()] + current_line[date_match.end():]
        line_without_date = re.sub(r"[|\-–—]", " ", line_without_date).strip()

        candidate_line = line_without_date
        if not candidate_line and current_idx > 0:
            candidate_line = lines[current_idx - 1].strip()

        # Heuristic split by 'at', '@', '|', or ','
        parts = re.split(r"\s+(?:at|@|\|)\s+|,", candidate_line, maxsplit=1)
        if len(parts) == 2:
            return parts[0].strip() or "Engineer", parts[1].strip() or "Organization"
        elif candidate_line:
            return candidate_line, "Organization"
        return "Software Engineer", "Organization"

    def _extract_highlights(self, lines: List[str], start_idx: int) -> List[str]:
        highlights = []
        for i in range(start_idx, min(len(lines), start_idx + 4)):
            line = lines[i].strip()
            if DATE_RANGE_PATTERN.search(line):
                break
            if line.startswith(("-", "•", "*")):
                highlights.append(line.lstrip("-•* ").strip())
            elif len(line) > 20:
                highlights.append(line)
        return highlights[:3]

    def _calculate_non_overlapping_tenure(self, intervals: List[Tuple[datetime, datetime]]) -> int:
        """Merge overlapping intervals to prevent double-counting parallel employments."""
        if not intervals:
            return 0
        sorted_intervals = sorted(intervals, key=lambda x: x[0])
        merged: List[Tuple[datetime, datetime]] = [sorted_intervals[0]]

        for current_start, current_end in sorted_intervals[1:]:
            last_start, last_end = merged[-1]
            if current_start <= last_end:
                merged[-1] = (last_start, max(last_end, current_end))
            else:
                merged.append((current_start, current_end))

        total_months = 0
        for start, end in merged:
            total_months += max(1, (end.year - start.year) * 12 + (end.month - start.month))
        return total_months
