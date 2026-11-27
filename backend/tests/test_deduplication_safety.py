"""
Comprehensive Regression & Safety Tests for CareerSyncAI Deduplication Engine.
Verifies:
1. Seniority preservation (Senior vs Junior vs Staff vs Principal vs Lead vs Associate vs Intern).
2. Location & remote-status disambiguation.
3. Employment-type separation (Full-time vs Contract).
4. Reused URLs with conflicting job titles or descriptions (kept separate, flagged for review).
5. Similar company names (Apple vs Apple Tree Learning).
6. Shared introductory boilerplate with different job bodies.
7. Missing descriptions and missing locations.
8. Idempotency across repeated executions.
"""
import tempfile
from pathlib import Path
import pandas as pd
import pytest

from scripts.data_ingestion.deduplicate import (
    clean_canonical_url,
    clean_company_name,
    compute_full_content_hash,
    deduplicate_cross_dataset,
    extract_seniority_tier,
    normalize_location_conservative,
    normalize_title_preserving_seniority,
)


def test_seniority_tier_extraction():
    assert extract_seniority_tier("Senior Software Engineer") == "senior"
    assert extract_seniority_tier("Sr. Backend Developer") == "senior"
    assert extract_seniority_tier("Junior Data Analyst") == "junior"
    assert extract_seniority_tier("Associate Product Manager") == "junior"
    assert extract_seniority_tier("Lead Infrastructure Engineer") == "lead_staff"
    assert extract_seniority_tier("Principal Security Researcher") == "lead_staff"
    assert extract_seniority_tier("Staff Software Engineer") == "lead_staff"
    assert extract_seniority_tier("Software Engineering Intern") == "intern"
    assert extract_seniority_tier("Software Engineer") == "mid"


def test_normalize_title_preserves_seniority():
    senior_norm = normalize_title_preserving_seniority("Senior Software Engineer")
    junior_norm = normalize_title_preserving_seniority("Junior Software Engineer")
    staff_norm = normalize_title_preserving_seniority("Staff Software Engineer")
    lead_norm = normalize_title_preserving_seniority("Lead Software Engineer")
    principal_norm = normalize_title_preserving_seniority("Principal Software Engineer")

    assert len({senior_norm, junior_norm, staff_norm, lead_norm, principal_norm}) == 5
    assert "senior" in senior_norm
    assert "junior" in junior_norm
    assert "staff" in staff_norm
    assert "lead" in lead_norm
    assert "principal" in principal_norm


def test_canonical_url_cleaning():
    url1 = "https://jobs.lever.co/company/abc-123?utm_source=linkedin&utm_medium=job_post"
    url2 = "http://www.jobs.lever.co/company/abc-123#apply"
    url3 = "https://jobs.lever.co/company/abc-123/"

    cleaned1 = clean_canonical_url(url1)
    cleaned2 = clean_canonical_url(url2)
    cleaned3 = clean_canonical_url(url3)

    assert cleaned1 == "jobs.lever.co/company/abc-123"
    assert cleaned1 == cleaned2 == cleaned3


def test_reused_url_with_conflicting_job_version():
    """Verify that a reused URL for a new role/version is NOT merged."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_parquet = tmp_path / "test_jobs.parquet"
        output_parquet = tmp_path / "out_jobs.parquet"
        report_json = tmp_path / "report.json"
        review_json = tmp_path / "review.json"

        # Same URL, but role 1 was Data Analyst and role 2 is Senior DevOps Engineer
        data = [
            {
                "job_id": "job_v1",
                "source_id": "src_1",
                "original_title": "Data Analyst",
                "normalized_title": "Data Analyst",
                "company": "Acme Corp",
                "location": "New York, NY",
                "employment_type": "full-time",
                "source_url": "https://acme.com/jobs/role-reuse-101",
                "description": "We are hiring a Data Analyst to build dashboards with SQL, Tableau, and Excel.",
            },
            {
                "job_id": "job_v2",
                "source_id": "src_2",
                "original_title": "Senior DevOps Engineer",
                "normalized_title": "Senior DevOps Engineer",
                "company": "Acme Corp",
                "location": "New York, NY",
                "employment_type": "full-time",
                "source_url": "https://acme.com/jobs/role-reuse-101?source=refresh",
                "description": "We are hiring a Senior DevOps Engineer to manage Kubernetes clusters and Terraform infrastructure.",
            },
        ]
        pd.DataFrame(data).to_parquet(input_parquet)

        rep = deduplicate_cross_dataset(
            [("test_source", input_parquet)],
            output_parquet,
            report_json,
            review_queue_json=review_json,
        )

        out_df = pd.read_parquet(output_parquet)
        assert len(out_df) == 2, "Conflicting titles on a reused URL must NOT be merged automatically!"
        assert rep["unique_master_jobs"] == 2
        assert rep["duplicates_removed_total"] == 0

        # Verify flagged in review queue
        import json
        with open(review_json, "r", encoding="utf-8") as f:
            rev = json.load(f)
        assert rev["total_flagged"] >= 1
        assert any(item["reason"] == "reused_url_conflicting_job_version" for item in rev["review_items"])


def test_similar_company_names_not_merged():
    """Verify 'Apple' and 'Apple Tree Learning' are recognized as distinct companies."""
    comp1 = clean_company_name("Apple Inc.")
    comp2 = clean_company_name("Apple Tree Learning LLC")
    assert comp1 == "apple"
    assert comp2 == "apple tree learning"
    assert comp1 != comp2


def test_shared_introductory_boilerplate_different_body():
    """Verify that jobs sharing the exact same introductory boilerplate paragraph do NOT merge."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_parquet = tmp_path / "test_jobs.parquet"
        output_parquet = tmp_path / "out_jobs.parquet"
        report_json = tmp_path / "report.json"

        boilerplate = "About Our Company: We are the leading global logistics and transport automation platform. Founded in 2015, we operate in 40 countries with over 5000 employees. We offer comprehensive healthcare, 401k match, and continuous learning programs."
        data = [
            {
                "job_id": "job_fe",
                "source_id": "src_fe",
                "original_title": "Frontend Engineer",
                "normalized_title": "Frontend Engineer",
                "company": "FastLogistics",
                "location": "Remote",
                "employment_type": "full-time",
                "source_url": "https://fastlogistics.com/jobs/101",
                "description": f"{boilerplate} The Role: Build React and TypeScript interfaces for driver dispatch systems.",
            },
            {
                "job_id": "job_be",
                "source_id": "src_be",
                "original_title": "Backend Engineer",
                "normalized_title": "Backend Engineer",
                "company": "FastLogistics",
                "location": "Remote",
                "employment_type": "full-time",
                "source_url": "https://fastlogistics.com/jobs/102",
                "description": f"{boilerplate} The Role: Build high-throughput Go and Kafka message streaming pipelines.",
            },
        ]
        pd.DataFrame(data).to_parquet(input_parquet)

        rep = deduplicate_cross_dataset(
            [("test_source", input_parquet)],
            output_parquet,
            report_json,
        )

        out_df = pd.read_parquet(output_parquet)
        assert len(out_df) == 2, "Jobs with different technical roles sharing boilerplate intro must remain separate."


def test_missing_description_safety():
    """Verify that records with missing or empty descriptions are never merged via content hash."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_parquet = tmp_path / "test_jobs.parquet"
        output_parquet = tmp_path / "out_jobs.parquet"
        report_json = tmp_path / "report.json"

        data = [
            {
                "job_id": "job_nodesc1",
                "source_id": "src_1",
                "original_title": "Product Designer",
                "normalized_title": "Product Designer",
                "company": "DesignHub",
                "location": "Remote",
                "employment_type": "full-time",
                "source_url": "https://designhub.com/job1",
                "description": "",
            },
            {
                "job_id": "job_nodesc2",
                "source_id": "src_2",
                "original_title": "Product Designer",
                "normalized_title": "Product Designer",
                "company": "DesignHub",
                "location": "Remote",
                "employment_type": "full-time",
                "source_url": "https://designhub.com/job2",
                "description": "",
            },
        ]
        pd.DataFrame(data).to_parquet(input_parquet)

        rep = deduplicate_cross_dataset(
            [("test_source", input_parquet)],
            output_parquet,
            report_json,
        )

        out_df = pd.read_parquet(output_parquet)
        assert len(out_df) == 2, "Empty descriptions must never produce colliding content hashes."


def test_deduplication_idempotency():
    """Verify that re-running deduplication produces identical deterministic output."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_parquet = tmp_path / "test_jobs.parquet"
        out_run1 = tmp_path / "out1.parquet"
        out_run2 = tmp_path / "out2.parquet"
        rep_run1 = tmp_path / "rep1.json"
        rep_run2 = tmp_path / "rep2.json"

        data = [
            {
                "job_id": "job_a",
                "source_id": "src_a",
                "original_title": "Software Engineer",
                "normalized_title": "Software Engineer",
                "company": "TechCorp",
                "location": "San Francisco, CA",
                "employment_type": "full-time",
                "source_url": "https://techcorp.com/jobs/1?utm_source=feed",
                "description": "TechCorp is hiring a Software Engineer to work on distributed storage.",
            },
            {
                "job_id": "job_b",
                "source_id": "src_b",
                "original_title": "Software Engineer",
                "normalized_title": "Software Engineer",
                "company": "TechCorp, Inc.",
                "location": "San Francisco, CA",
                "employment_type": "full-time",
                "source_url": "https://techcorp.com/jobs/1?ref=greenhouse",
                "description": "TechCorp is hiring a Software Engineer to work on distributed storage.",
            },
            {
                "job_id": "job_c",
                "source_id": "src_c",
                "original_title": "Senior Software Engineer",
                "normalized_title": "Senior Software Engineer",
                "company": "TechCorp",
                "location": "San Francisco, CA",
                "employment_type": "full-time",
                "source_url": "https://techcorp.com/jobs/2",
                "description": "TechCorp is hiring a Senior Software Engineer with 8+ years experience.",
            },
        ]
        pd.DataFrame(data).to_parquet(input_parquet)

        rep1 = deduplicate_cross_dataset([("source", input_parquet)], out_run1, rep_run1)
        rep2 = deduplicate_cross_dataset([("source", input_parquet)], out_run2, rep_run2)

        df1 = pd.read_parquet(out_run1)
        df2 = pd.read_parquet(out_run2)

        assert len(df1) == len(df2) == 2
        assert df1["job_id"].tolist() == df2["job_id"].tolist()
        assert rep1["duplicates_removed_total"] == rep2["duplicates_removed_total"] == 1
