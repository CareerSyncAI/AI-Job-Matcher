"""
CareerSyncAI - Dataset Manifest Generator
Generates datasets.json and licenses.json tracking provenance, licenses, hashes, and record counts
for all acquired raw and processed datasets, including Stapply, Open Apply, Djinni, CareerCorpus, JobHop, and O*NET.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.manifest")


def compute_sha256(filepath: Path) -> str:
    """Compute SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def count_parquet_rows(filepath: Path) -> int:
    try:
        t = pq.read_table(filepath)
        return t.num_rows
    except Exception:
        return 0


def count_jsonl_rows(filepath: Path) -> int:
    try:
        count = 0
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    count += 1
        return count
    except Exception:
        return 0


def build_manifests(base_dir: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    """Build datasets.json and licenses.json manifests."""
    manifest_dir = base_dir / "data" / "manifests"
    manifest_dir.mkdir(parents=True, exist_ok=True)

    now_iso = datetime.now(timezone.utc).isoformat()

    datasets: dict[str, Any] = {
        "catalog_version": "2.0.0",
        "last_updated": now_iso,
        "datasets": [],
    }

    # 1. Stapply Open Job Data (External Raw + Processed)
    stapply_raw = Path("C:/Users/Hit/Desktop/SGP 5TH Sem/all.parquet")
    stapply_norm = base_dir / "data" / "processed" / "jobs" / "stapply_normalized.parquet"

    if stapply_raw.exists():
        datasets["datasets"].append({
            "dataset_id": "stapply_jobs_raw",
            "name": "Stapply Open Job Data (Master Aggregated Archive)",
            "tier": "raw",
            "file_path": str(stapply_raw),
            "file_size_bytes": stapply_raw.stat().st_size,
            "sha256": "29783c1fa6bb326a977618d3f5ab0dc30d96eac91dbb7bdb7b8c0f77ecbf993e",
            "record_count": 8001916,
            "source_url": "https://data.stapply.ai/",
            "provenance": "Aggregated live postings across 64 ATS platforms (Greenhouse, Lever, Ashby, Workday, etc.)",
            "licence_id": "Commercial-Clearance-Required-Employer-Content",
            "licence_note": "Scraper tooling open-source; underlying job text copyright of respective employers. Commercial clearance required.",
        })

    if stapply_norm.exists():
        datasets["datasets"].append({
            "dataset_id": "stapply_jobs_normalized",
            "name": "Stapply Normalized Job Postings (Active Slice)",
            "tier": "processed",
            "file_path": str(stapply_norm.relative_to(base_dir)),
            "file_size_bytes": stapply_norm.stat().st_size,
            "sha256": compute_sha256(stapply_norm),
            "record_count": count_parquet_rows(stapply_norm),
            "source_dataset_id": "stapply_jobs_raw",
            "licence_id": "Commercial-Clearance-Required-Employer-Content",
        })

    # 2. Open Apply Jobs (Raw + Processed)
    oa_raw = base_dir / "data" / "raw" / "jobs" / "open_apply" / "0.parquet"
    oa_norm = base_dir / "data" / "processed" / "jobs" / "open_apply_normalized.parquet"

    if oa_raw.exists():
        datasets["datasets"].append({
            "dataset_id": "open_apply_jobs_raw",
            "name": "Open Apply Jobs (Partition 0)",
            "tier": "raw",
            "file_path": str(oa_raw.relative_to(base_dir)),
            "file_size_bytes": oa_raw.stat().st_size,
            "sha256": compute_sha256(oa_raw),
            "record_count": count_parquet_rows(oa_raw),
            "source_url": "https://huggingface.co/datasets/edwarddgao/open-apply-jobs",
            "provenance": "Direct employer ATS endpoints (Greenhouse, Lever, Ashby, Workday)",
            "licence_id": "MIT-Packaging-Employer-Text",
            "licence_note": "Dataset packaging and scrapers under MIT; underlying job text belongs to respective hiring employers.",
        })

    if oa_norm.exists():
        datasets["datasets"].append({
            "dataset_id": "open_apply_jobs_normalized",
            "name": "Open Apply Jobs (Canonical Normalized Schema)",
            "tier": "processed",
            "file_path": str(oa_norm.relative_to(base_dir)),
            "file_size_bytes": oa_norm.stat().st_size,
            "sha256": compute_sha256(oa_norm),
            "record_count": count_parquet_rows(oa_norm),
            "source_dataset_id": "open_apply_jobs_raw",
            "licence_id": "MIT-Packaging-Employer-Text",
        })

    # 3. Djinni Recruitment Dataset (Jobs & Candidates)
    dj_jobs_raw = base_dir / "data" / "raw" / "jobs" / "djinni" / "djinni_jobs_en.parquet"
    dj_jobs_norm = base_dir / "data" / "processed" / "jobs" / "djinni_jobs_normalized.parquet"

    if dj_jobs_raw.exists():
        datasets["datasets"].append({
            "dataset_id": "djinni_jobs_raw",
            "name": "Djinni English Job Descriptions (Raw)",
            "tier": "raw",
            "file_path": str(dj_jobs_raw.relative_to(base_dir)),
            "file_size_bytes": dj_jobs_raw.stat().st_size,
            "sha256": compute_sha256(dj_jobs_raw),
            "record_count": count_parquet_rows(dj_jobs_raw),
            "source_url": "https://huggingface.co/datasets/lang-uk/recruitment-dataset-job-descriptions-english",
            "provenance": "Lang-UK / ACL 2024 UNLP collection (Djinni.co)",
            "licence_id": "MIT",
        })

    if dj_jobs_norm.exists():
        datasets["datasets"].append({
            "dataset_id": "djinni_jobs_normalized",
            "name": "Djinni Jobs (Canonical Normalized Schema)",
            "tier": "processed",
            "file_path": str(dj_jobs_norm.relative_to(base_dir)),
            "file_size_bytes": dj_jobs_norm.stat().st_size,
            "sha256": compute_sha256(dj_jobs_norm),
            "record_count": count_parquet_rows(dj_jobs_norm),
            "source_dataset_id": "djinni_jobs_raw",
            "licence_id": "MIT",
        })

    dj_cand_raw = base_dir / "data" / "raw" / "resumes" / "djinni" / "djinni_candidates_en.parquet"
    dj_cand_norm = base_dir / "data" / "processed" / "resumes" / "djinni_candidate_profiles.parquet"

    if dj_cand_raw.exists():
        datasets["datasets"].append({
            "dataset_id": "djinni_candidates_raw",
            "name": "Djinni English Candidate Profiles (Raw)",
            "tier": "raw",
            "file_path": str(dj_cand_raw.relative_to(base_dir)),
            "file_size_bytes": dj_cand_raw.stat().st_size,
            "sha256": compute_sha256(dj_cand_raw),
            "record_count": count_parquet_rows(dj_cand_raw),
            "source_url": "https://huggingface.co/datasets/lang-uk/recruitment-dataset-candidate-profiles-english",
            "provenance": "Lang-UK / ACL 2024 UNLP collection (anonymized profiles)",
            "licence_id": "MIT",
        })

    if dj_cand_norm.exists():
        datasets["datasets"].append({
            "dataset_id": "djinni_candidate_profiles_normalized",
            "name": "Djinni Candidate Profiles (Normalized Schema)",
            "tier": "processed",
            "record_type": "candidate_profile",
            "file_path": str(dj_cand_norm.relative_to(base_dir)),
            "file_size_bytes": dj_cand_norm.stat().st_size,
            "sha256": compute_sha256(dj_cand_norm),
            "record_count": count_parquet_rows(dj_cand_norm),
            "source_dataset_id": "djinni_candidates_raw",
            "licence_id": "MIT",
        })

    # 4. Master Consolidated Jobs (Cross-Dataset Deduplicated)
    master_jobs = base_dir / "data" / "processed" / "jobs" / "consolidated_jobs_master.parquet"
    if master_jobs.exists():
        datasets["datasets"].append({
            "dataset_id": "consolidated_jobs_master",
            "name": "CareerSyncAI Consolidated Jobs Master (Deduplicated)",
            "tier": "processed",
            "file_path": str(master_jobs.relative_to(base_dir)),
            "file_size_bytes": master_jobs.stat().st_size,
            "sha256": compute_sha256(master_jobs),
            "record_count": count_parquet_rows(master_jobs),
            "source_datasets": ["stapply_jobs_normalized", "open_apply_jobs_normalized", "djinni_jobs_normalized"],
            "licence_id": "Commercial-Clearance-Required-Employer-Content",
        })

    # 5. CareerCorpus Resumes
    cc_raw = base_dir / "data" / "raw" / "resumes" / "career_corpus" / "CareerCorpus.xlsx"
    cc_norm = base_dir / "data" / "processed" / "resumes" / "career_corpus_normalized.jsonl"

    if cc_raw.exists():
        datasets["datasets"].append({
            "dataset_id": "career_corpus_raw",
            "name": "CareerCorpus Anonymized Resume Benchmark (Excel)",
            "tier": "raw",
            "file_path": str(cc_raw.relative_to(base_dir)),
            "file_size_bytes": cc_raw.stat().st_size,
            "sha256": compute_sha256(cc_raw),
            "record_count": 302,
            "source_url": "https://data.mendeley.com/datasets/wzzwn37gmd/1",
            "doi": "10.17632/wzzwn37gmd.1",
            "provenance": "Mendeley Data / Expert annotators (6 occupational categories)",
            "licence_id": "CC-BY-4.0",
        })

    if cc_norm.exists():
        datasets["datasets"].append({
            "dataset_id": "career_corpus_normalized",
            "name": "CareerCorpus Normalized Resumes (JSONL)",
            "tier": "processed",
            "record_type": "annotated_resume",
            "file_path": str(cc_norm.relative_to(base_dir)),
            "file_size_bytes": cc_norm.stat().st_size,
            "sha256": compute_sha256(cc_norm),
            "record_count": count_jsonl_rows(cc_norm),
            "source_dataset_id": "career_corpus_raw",
            "licence_id": "CC-BY-4.0",
        })

    # 6. O*NET Database 31.0
    onet_zip = base_dir / "data" / "raw" / "taxonomies" / "onet" / "db_31_0_text.zip"
    onet_occ = base_dir / "data" / "processed" / "occupations" / "occupations.parquet"
    onet_skills = base_dir / "data" / "processed" / "occupations" / "technology_skills.parquet"

    if onet_zip.exists():
        datasets["datasets"].append({
            "dataset_id": "onet_31_0_raw",
            "name": "O*NET Database 31.0 Text Archive",
            "tier": "raw",
            "file_path": str(onet_zip.relative_to(base_dir)),
            "file_size_bytes": onet_zip.stat().st_size,
            "sha256": compute_sha256(onet_zip),
            "record_count": 46,
            "source_url": "https://www.onetcenter.org/database.html",
            "provenance": "U.S. Department of Labor / Employment and Training Administration",
            "licence_id": "CC-BY-4.0",
        })

    if onet_occ.exists():
        datasets["datasets"].append({
            "dataset_id": "onet_occupations_processed",
            "name": "O*NET Standard Occupational Classification Lookup",
            "tier": "processed",
            "file_path": str(onet_occ.relative_to(base_dir)),
            "file_size_bytes": onet_occ.stat().st_size,
            "sha256": compute_sha256(onet_occ),
            "record_count": count_parquet_rows(onet_occ),
            "licence_id": "CC-BY-4.0",
        })

    if onet_skills.exists():
        datasets["datasets"].append({
            "dataset_id": "onet_technology_skills_processed",
            "name": "O*NET Software & In-Demand Technology Skills Lookup",
            "tier": "processed",
            "file_path": str(onet_skills.relative_to(base_dir)),
            "file_size_bytes": onet_skills.stat().st_size,
            "sha256": compute_sha256(onet_skills),
            "record_count": count_parquet_rows(onet_skills),
            "licence_id": "CC-BY-4.0",
        })

    # 7. JobHop v2 Career Trajectories
    jobhop_train = base_dir / "data" / "raw" / "taxonomies" / "jobhop" / "JobHop_v2_train.parquet"
    jobhop_norm = base_dir / "data" / "processed" / "occupations" / "jobhop_career_trajectories.parquet"

    if jobhop_train.exists():
        datasets["datasets"].append({
            "dataset_id": "jobhop_v2_train",
            "name": "JobHop v2 Career Trajectories (Train Parquet)",
            "tier": "raw",
            "file_path": str(jobhop_train.relative_to(base_dir)),
            "file_size_bytes": jobhop_train.stat().st_size,
            "sha256": compute_sha256(jobhop_train),
            "record_count": count_parquet_rows(jobhop_train),
            "source_url": "https://huggingface.co/datasets/aida-ugent/JobHop",
            "provenance": "Ghent University AIDA / VDAB public employment service pseudonymized career histories",
            "licence_id": "CC-BY-4.0",
            "licence_resolution_evidence": "Authoritative Hugging Face dataset card YAML metadata defines 'license: cc-by-4.0' under IEEE BigData 2025 release.",
        })

    if jobhop_norm.exists():
        datasets["datasets"].append({
            "dataset_id": "jobhop_career_trajectories_normalized",
            "name": "JobHop Career Trajectories (Normalized)",
            "tier": "processed",
            "record_type": "career_trajectory",
            "file_path": str(jobhop_norm.relative_to(base_dir)),
            "file_size_bytes": jobhop_norm.stat().st_size,
            "sha256": compute_sha256(jobhop_norm),
            "record_count": count_parquet_rows(jobhop_norm),
            "source_dataset_id": "jobhop_v2_train",
            "licence_id": "CC-BY-4.0",
        })

    # Comprehensive Licenses Catalog
    licenses: dict[str, Any] = {
        "catalog_version": "2.0.0",
        "last_updated": now_iso,
        "licenses": [
            {
                "licence_id": "CC-BY-4.0",
                "name": "Creative Commons Attribution 4.0 International",
                "url": "https://creativecommons.org/licenses/by/4.0/",
                "commercial_use": True,
                "attribution_required": True,
                "attribution_text": "O*NET® is a trademark of the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). CareerSyncAI uses the O*NET Database 31.0 and has modified raw tables to Parquet. CareerCorpus is sourced from Mendeley Data (Chowdhury et al., 2025). JobHop v2 is published under CC BY 4.0 by Ghent University AIDA / IEEE BigData 2025.",
                "share_alike": False,
                "applicable_datasets": [
                    "career_corpus_raw",
                    "career_corpus_normalized",
                    "onet_31_0_raw",
                    "onet_occupations_processed",
                    "onet_technology_skills_processed",
                    "jobhop_v2_train",
                    "jobhop_career_trajectories_normalized",
                ],
            },
            {
                "licence_id": "MIT",
                "name": "MIT License",
                "url": "https://opensource.org/licenses/MIT",
                "commercial_use": True,
                "attribution_required": True,
                "share_alike": False,
                "applicable_datasets": [
                    "djinni_jobs_raw",
                    "djinni_jobs_normalized",
                    "djinni_candidates_raw",
                    "djinni_candidate_profiles_normalized",
                ],
            },
            {
                "licence_id": "MIT-Packaging-Employer-Text",
                "name": "MIT (Packaging & Scraping Code) / Proprietary Employer Postings (Underlying Content)",
                "url": "https://github.com/edwarddgao/openapply/blob/main/dataset_card.md",
                "commercial_use": False,
                "commercial_use_note": "Scraper tooling is MIT; underlying job text requires employer authorization for commercial redistribution.",
                "attribution_required": True,
                "share_alike": False,
                "applicable_datasets": ["open_apply_jobs_raw", "open_apply_jobs_normalized"],
            },
            {
                "licence_id": "Commercial-Clearance-Required-Employer-Content",
                "name": "Employer-Published Content / Scraper Open Source (Commercial Clearance Required)",
                "url": "https://data.stapply.ai/",
                "commercial_use": False,
                "commercial_use_note": "Postings aggregated across 64 ATS platforms. Content copyright remains with respective employers. Suitable for internal benchmarking and non-commercial research; requires clearance for commercial application.",
                "attribution_required": True,
                "share_alike": False,
                "applicable_datasets": [
                    "stapply_jobs_raw",
                    "stapply_jobs_normalized",
                    "consolidated_jobs_master",
                ],
            },
        ],
    }

    datasets_path = manifest_dir / "datasets.json"
    with open(datasets_path, "w", encoding="utf-8") as f:
        json.dump(datasets, f, indent=2)
    logger.info("Saved dataset manifest to %s (%d datasets tracked)", datasets_path, len(datasets["datasets"]))

    licenses_path = manifest_dir / "licenses.json"
    with open(licenses_path, "w", encoding="utf-8") as f:
        json.dump(licenses, f, indent=2)
    logger.info("Saved licenses manifest to %s", licenses_path)

    return datasets, licenses


if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent.parent
    build_manifests(base)
