"""Unit tests for Experience and Education Extractors."""

import pytest

from src.extractors.education_extractor import EducationExtractor
from src.extractors.experience_extractor import ExperienceExtractor


@pytest.fixture
def exp_extractor():
    return ExperienceExtractor()


@pytest.fixture
def edu_extractor():
    return EducationExtractor()


def test_experience_extraction_and_tenure(exp_extractor):
    text = """
    Senior Software Engineer | Acme Corporation
    Jan 2020 - Dec 2022
    - Led microservice migration.

    Software Engineer | Beta Corp
    June 2018 - Dec 2019
    - Developed backend services in Go.
    """
    res = exp_extractor.extract(text)
    entries = res["entries"]

    assert len(entries) == 2
    assert entries[0]["start_date"] == "2020-01"
    assert entries[0]["end_date"] == "2022-12"
    assert entries[0]["duration_months"] == 35  # Jan 2020 to Dec 2022

    # Total non-overlapping months: 35 + 18 = 53 months ~ 4.4 years
    assert res["total_experience_months"] >= 50
    assert res["total_experience_years"] >= 4.0


def test_overlapping_tenure_merging(exp_extractor):
    """Overlapping employment intervals should not be double-counted."""
    text = """
    Role A - Tech Inc
    Jan 2020 - Dec 2021
    
    Role B - Part Time Labs
    June 2020 - June 2021
    """
    res = exp_extractor.extract(text)
    # Total span is Jan 2020 to Dec 2021 = 23 months (not 23 + 12 = 35)
    assert res["total_experience_months"] == 23


def test_current_employment_handling(exp_extractor):
    text = "Lead Architect at Apex | 2022 - Present"
    res = exp_extractor.extract(text)
    entries = res["entries"]
    assert len(entries) == 1
    assert entries[0]["is_current"] is True
    assert entries[0]["end_date"] is None
    assert entries[0]["duration_months"] > 0


def test_education_extractor(edu_extractor):
    text = """
    Master of Science in Computer Science, Stanford University (2018 - 2020)
    Bachelor of Technology in Information Technology, IIT Bombay (2014 - 2018)
    """
    entries = edu_extractor.extract(text)
    assert len(entries) >= 2

    degrees = [e["degree_level"] for e in entries]
    assert "Master" in degrees
    assert "Bachelor" in degrees


def test_internship_separated_from_professional_tenure(exp_extractor):
    """Internships are identified and excluded from professional tenure calculations."""
    text = """
    Software Engineering Intern | Startup Inc
    June 2019 - Aug 2019
    - Built internal dashboard tools.

    Junior Developer | Tech Corp
    Jan 2020 - Dec 2021
    - Backend API development.
    """
    res = exp_extractor.extract(text)
    entries = res["entries"]
    assert len(entries) == 2

    # Check internship flags
    intern_entry = next(e for e in entries if "Intern" in e["role_title"])
    dev_entry = next(e for e in entries if "Developer" in e["role_title"])
    assert intern_entry["is_internship"] is True
    assert dev_entry["is_internship"] is False

    # Total tenure only includes the full-time role (23 months, ~1.9 yrs)
    assert res["total_experience_months"] == 23


def test_malformed_and_reversed_date_ranges_safely_ignored(exp_extractor):
    """Reversed or nonsensical date ranges do not corrupt tenure or crash."""
    text = """
    Invalid Role | Bad Data Corp
    2024 - 2020
    - Impossible timeline.

    Valid Role | Good Corp
    2021 - 2023
    - Normal job.
    """
    res = exp_extractor.extract(text)
    assert len(res["entries"]) == 1
    assert res["entries"][0]["organization"] == "Good Corp"
    assert res["total_experience_months"] >= 24
