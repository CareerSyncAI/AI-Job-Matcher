"""
CareerSyncAI - Data Validation Pipeline
Performs strict schema validation, integrity checks, and data quality profiling
across jobs, candidate profiles, annotated resumes, career trajectories, and taxonomies.
"""
from __future__ import annotations

import json
import logging
import statistics
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from pydantic import BaseModel, Field, ValidationError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.validate")


class JobSchema(BaseModel):
    job_id: str = Field(min_length=1)
    source_name: str
    original_title: str = Field(min_length=1)
    normalized_title: str = Field(min_length=1)
    company: str = Field(min_length=1)
    description: str = Field(min_length=20)
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None


class ResumeSchema(BaseModel):
    resume_id: str = Field(min_length=1)
    source_dataset: str
    occupational_category: str = Field(min_length=1)
    record_type: str = Field(pattern=r"^annotated_resume$")
    extraction_metadata: dict[str, Any]


class CandidateProfileSchema(BaseModel):
    candidate_id: str = Field(min_length=1)
    source_dataset: str
    position_title: str = Field(min_length=1)
    normalized_title: str = Field(min_length=1)
    record_type: str = Field(pattern=r"^candidate_profile$")


class CareerTrajectorySchema(BaseModel):
    trajectory_id: str = Field(min_length=1)
    person_id: str = Field(min_length=1)
    record_type: str = Field(pattern=r"^career_trajectory$")


def validate_jobs_dataset(parquet_path: Path) -> dict[str, Any]:
    """Validate job records against schema and generate statistical profile."""
    if not parquet_path.exists():
        return {"status": "error", "message": f"File not found: {parquet_path}"}

    df = pd.read_parquet(parquet_path)
    total_records = len(df)
    valid_count = 0
    errors: list[str] = []

    # Quality metrics
    desc_lengths: list[int] = []
    has_salary = 0
    has_location = 0
    company_counts: dict[str, int] = {}
    null_counts: dict[str, int] = df.isnull().sum().to_dict()

    for idx, row in df.iterrows():
        try:
            JobSchema(
                job_id=str(row.get("job_id")),
                source_name=str(row.get("source_name") or row.get("source_origin")),
                original_title=str(row.get("original_title")),
                normalized_title=str(row.get("normalized_title")),
                company=str(row.get("company")),
                description=str(row.get("description")),
                salary_min=row.get("salary_min") if pd.notna(row.get("salary_min")) else None,
                salary_max=row.get("salary_max") if pd.notna(row.get("salary_max")) else None,
            )
            valid_count += 1
        except ValidationError as e:
            if len(errors) < 10:
                errors.append(f"Row {idx} ({row.get('job_id')}): {str(e)}")

        desc_len = len(str(row.get("description") or ""))
        desc_lengths.append(desc_len)

        if pd.notna(row.get("salary_min")) or pd.notna(row.get("salary_max")):
            has_salary += 1
        loc = str(row.get("location") or "")
        if loc and loc.lower() not in ("unspecified", "nan", "none", ""):
            has_location += 1

        comp = str(row.get("company") or "Unknown")
        company_counts[comp] = company_counts.get(comp, 0) + 1

    top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    unique_ids = df["job_id"].nunique()

    return {
        "status": "passed" if valid_count == total_records and unique_ids == total_records else "partial",
        "total_records": total_records,
        "valid_records": valid_count,
        "invalid_records": total_records - valid_count,
        "unique_identifiers": unique_ids,
        "id_uniqueness_rate_percent": round(unique_ids / total_records * 100, 2) if total_records else 0,
        "validation_errors_sample": errors,
        "null_percentages": {k: round(v / total_records * 100, 2) for k, v in null_counts.items()},
        "metrics": {
            "salary_coverage_percent": round(has_salary / total_records * 100, 2) if total_records else 0,
            "location_coverage_percent": round(has_location / total_records * 100, 2) if total_records else 0,
            "description_length": {
                "min": min(desc_lengths) if desc_lengths else 0,
                "max": max(desc_lengths) if desc_lengths else 0,
                "mean": round(statistics.mean(desc_lengths), 1) if desc_lengths else 0,
                "median": round(statistics.median(desc_lengths), 1) if desc_lengths else 0,
            },
            "top_companies": dict(top_companies),
        },
    }


def validate_resumes_dataset(jsonl_path: Path) -> dict[str, Any]:
    """Validate normalized resumes and generate domain distributions."""
    if not jsonl_path.exists():
        return {"status": "error", "message": f"File not found: {jsonl_path}"}

    total_records = 0
    valid_count = 0
    errors: list[str] = []
    domain_counts: dict[str, int] = {}
    char_lengths: list[int] = []
    seen_ids: set[str] = set()

    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f):
            total_records += 1
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            rid = data.get("resume_id", "")
            seen_ids.add(rid)

            try:
                ResumeSchema(
                    resume_id=rid,
                    source_dataset=data.get("source_dataset", ""),
                    occupational_category=data.get("occupational_category", ""),
                    record_type=data.get("record_type", ""),
                    extraction_metadata=data.get("extraction_metadata", {}),
                )
                valid_count += 1
            except ValidationError as e:
                if len(errors) < 10:
                    errors.append(f"Line {line_no}: {str(e)}")

            domain = data.get("occupational_category", "Unknown")
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

            meta = data.get("extraction_metadata", {})
            char_lengths.append(meta.get("char_count", 0))

    return {
        "status": "passed" if valid_count == total_records and len(seen_ids) == total_records else "partial",
        "total_records": total_records,
        "valid_records": valid_count,
        "invalid_records": total_records - valid_count,
        "unique_identifiers": len(seen_ids),
        "validation_errors_sample": errors,
        "record_type_verified": "annotated_resume",
        "domain_distribution": domain_counts,
        "text_length": {
            "min": min(char_lengths) if char_lengths else 0,
            "max": max(char_lengths) if char_lengths else 0,
            "mean": round(statistics.mean(char_lengths), 1) if char_lengths else 0,
            "median": round(statistics.median(char_lengths), 1) if char_lengths else 0,
        },
    }


def validate_candidate_profiles(parquet_path: Path) -> dict[str, Any]:
    """Validate normalized candidate profiles against schema and profile skill distributions."""
    if not parquet_path.exists():
        return {"status": "error", "message": f"File not found: {parquet_path}"}

    df = pd.read_parquet(parquet_path)
    total_records = len(df)
    valid_count = 0
    errors: list[str] = []
    exp_years: list[float] = []
    english_levels: dict[str, int] = {}
    null_counts: dict[str, int] = df.isnull().sum().to_dict()

    for idx, row in df.iterrows():
        try:
            CandidateProfileSchema(
                candidate_id=str(row.get("candidate_id") or ""),
                source_dataset=str(row.get("source_dataset") or ""),
                position_title=str(row.get("position_title") or ""),
                normalized_title=str(row.get("normalized_title") or ""),
                record_type=str(row.get("record_type") or ""),
            )
            valid_count += 1
        except Exception as e:
            if len(errors) < 10:
                errors.append(f"Row {idx}: {str(e)}")

        exp = row.get("experience_years")
        if pd.notna(exp) and isinstance(exp, (int, float)):
            exp_years.append(float(exp))

        eng = str(row.get("english_level") or "unspecified").strip()
        english_levels[eng] = english_levels.get(eng, 0) + 1

    unique_ids = df["candidate_id"].nunique()

    return {
        "status": "passed" if valid_count == total_records and unique_ids == total_records else "partial",
        "total_records": total_records,
        "valid_records": valid_count,
        "invalid_records": total_records - valid_count,
        "unique_identifiers": unique_ids,
        "id_uniqueness_rate_percent": round(unique_ids / total_records * 100, 2) if total_records else 0,
        "validation_errors_sample": errors,
        "record_type_verified": "candidate_profile",
        "null_percentages": {k: round(v / total_records * 100, 2) for k, v in null_counts.items()},
        "metrics": {
            "average_experience_years": round(statistics.mean(exp_years), 1) if exp_years else 0,
            "min_experience_years": min(exp_years) if exp_years else 0,
            "max_experience_years": max(exp_years) if exp_years else 0,
            "english_levels_distribution": english_levels,
        },
    }


def validate_career_trajectories(parquet_path: Path) -> dict[str, Any]:
    """Validate normalized career trajectories from JobHop."""
    if not parquet_path.exists():
        return {"status": "error", "message": f"File not found: {parquet_path}"}

    df = pd.read_parquet(parquet_path)
    total_records = len(df)
    valid_count = 0
    errors: list[str] = []
    esco_codes: set[str] = set()
    null_counts: dict[str, int] = df.isnull().sum().to_dict()

    for idx, row in df.iterrows():
        try:
            CareerTrajectorySchema(
                trajectory_id=str(row.get("trajectory_id") or ""),
                person_id=str(row.get("person_id") or ""),
                record_type=str(row.get("record_type") or ""),
            )
            valid_count += 1
        except Exception as e:
            if len(errors) < 10:
                errors.append(f"Row {idx}: {str(e)}")

        esco = row.get("matched_esco_code")
        if esco and pd.notna(esco):
            esco_codes.add(str(esco))

    unique_trajectories = df["trajectory_id"].nunique()
    unique_persons = df["person_id"].nunique()

    return {
        "status": "passed" if valid_count == total_records and unique_trajectories == total_records else "partial",
        "total_records": total_records,
        "valid_records": valid_count,
        "invalid_records": total_records - valid_count,
        "unique_trajectory_ids": unique_trajectories,
        "unique_persons": unique_persons,
        "record_type_verified": "career_trajectory",
        "unique_esco_codes": len(esco_codes),
        "validation_errors_sample": errors,
        "null_percentages": {k: round(v / total_records * 100, 2) for k, v in null_counts.items()},
    }


def validate_taxonomies(onet_dir: Path) -> dict[str, Any]:
    """Validate O*NET taxonomy parquet files."""
    occ_pq = onet_dir / "occupations.parquet"
    skills_pq = onet_dir / "technology_skills.parquet"

    occ_count = 0
    skills_count = 0

    if occ_pq.exists():
        occ_df = pd.read_parquet(occ_pq)
        occ_count = len(occ_df)

    if skills_pq.exists():
        skills_df = pd.read_parquet(skills_pq)
        skills_count = len(skills_df)

    return {
        "status": "passed" if occ_count > 0 and skills_count > 0 else "incomplete",
        "occupations_count": occ_count,
        "technology_skills_count": skills_count,
    }


def run_full_validation(
    jobs_parquet: Path,
    resumes_jsonl: Path,
    taxonomies_dir: Path,
    output_report: Path,
    candidates_parquet: Optional[Path] = None,
    trajectories_parquet: Optional[Path] = None,
) -> dict[str, Any]:
    """Execute complete validation suite and generate unified quality report."""
    logger.info("Validating jobs dataset at %s", jobs_parquet)
    jobs_report = validate_jobs_dataset(jobs_parquet)

    logger.info("Validating resumes dataset at %s", resumes_jsonl)
    resumes_report = validate_resumes_dataset(resumes_jsonl)

    logger.info("Validating taxonomies at %s", taxonomies_dir)
    taxonomies_report = validate_taxonomies(taxonomies_dir)

    candidates_report = {}
    if candidates_parquet and candidates_parquet.exists():
        logger.info("Validating candidate profiles at %s", candidates_parquet)
        candidates_report = validate_candidate_profiles(candidates_parquet)

    trajectories_report = {}
    if trajectories_parquet and trajectories_parquet.exists():
        logger.info("Validating career trajectories at %s", trajectories_parquet)
        trajectories_report = validate_career_trajectories(trajectories_parquet)

    unified_report = {
        "validation_timestamp": pd.Timestamp.now().isoformat(),
        "summary": {
            "jobs_status": jobs_report.get("status"),
            "resumes_status": resumes_report.get("status"),
            "taxonomies_status": taxonomies_report.get("status"),
            "candidates_status": candidates_report.get("status", "skipped"),
            "trajectories_status": trajectories_report.get("status", "skipped"),
        },
        "jobs": jobs_report,
        "resumes": resumes_report,
        "taxonomies": taxonomies_report,
        "candidates": candidates_report,
        "career_trajectories": trajectories_report,
    }

    output_report.parent.mkdir(parents=True, exist_ok=True)
    temp_rep = output_report.with_suffix(".tmp.json")
    with open(temp_rep, "w", encoding="utf-8") as f:
        json.dump(unified_report, f, indent=2)
    temp_rep.replace(output_report)

    logger.info("Comprehensive data quality report written to %s", output_report)
    return unified_report


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    j_pq = base_dir / "data" / "processed" / "jobs" / "consolidated_jobs_master.parquet"
    if not j_pq.exists():
        j_pq = base_dir / "data" / "processed" / "jobs" / "jobs_deduplicated.parquet"
    r_jl = base_dir / "data" / "processed" / "resumes" / "career_corpus_normalized.jsonl"
    t_dir = base_dir / "data" / "processed" / "occupations"
    cand_pq = base_dir / "data" / "processed" / "resumes" / "djinni_candidate_profiles.parquet"
    traj_pq = base_dir / "data" / "processed" / "occupations" / "jobhop_career_trajectories.parquet"
    rep_out = base_dir / "data" / "reports" / "data_quality_report.json"

    run_full_validation(j_pq, r_jl, t_dir, rep_out, candidates_parquet=cand_pq, trajectories_parquet=traj_pq)
