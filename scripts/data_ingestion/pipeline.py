"""
CareerSyncAI - Unified Data Ingestion Pipeline CLI Orchestrator
Executes acquisition, extraction, normalization, conservative deduplication, validation,
taxonomy alignment, benchmarking, and manifest generation with exact process-wide peak RSS tracking.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psutil

# Local ingestion modules
from download import run_download_step
from extract import safe_extract_zip
from normalize import run_normalization_step
from deduplicate import deduplicate_jobs, deduplicate_cross_dataset
from validate import run_full_validation
from taxonomy_integrator import run_taxonomy_alignment
from build_manifest import build_manifests
from build_benchmarks import build_all_benchmarks
from config import CheckpointManager, DATASET_SPECS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ingestion.pipeline")


class MemoryMonitor:
    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self.peak_rss = 0.0
        self.initial_rss = self.get_current_rss()
        self.peak_rss = self.initial_rss

    def get_current_rss(self) -> float:
        """Returns current process-wide Resident Set Size in MB."""
        rss = self.process.memory_info().rss / (1024 * 1024)
        if rss > self.peak_rss:
            self.peak_rss = rss
        return rss

    def check(self, step_name: str) -> None:
        curr = self.get_current_rss()
        logger.info("[MemoryMonitor] %s - Current RSS: %.2f MB | Process-wide Peak RSS: %.2f MB", step_name, curr, self.peak_rss)


def generate_coverage_report(base_dir: Path, output_json: Path) -> dict[str, Any]:
    """Compile dataset processing coverage report comparing available vs processed rows by category."""
    import pyarrow.parquet as pq

    category_buckets: dict[str, dict[str, Any]] = {
        "job_postings": {"available": 0, "processed": 0, "remaining": 0, "coverage_pct": 0.0},
        "candidate_profiles": {"available": 0, "processed": 0, "remaining": 0, "coverage_pct": 0.0},
        "annotated_resumes": {"available": 0, "processed": 0, "remaining": 0, "coverage_pct": 0.0},
        "career_trajectories": {"available": 0, "processed": 0, "remaining": 0, "coverage_pct": 0.0},
        "occupations_taxonomy": {"available": 0, "processed": 0, "remaining": 0, "coverage_pct": 0.0},
        "technology_skills_taxonomy": {"available": 0, "processed": 0, "remaining": 0, "coverage_pct": 0.0},
    }

    datasets_report = {}

    for key, spec in DATASET_SPECS.items():
        processed_count = 0
        status = "not_found"

        if spec.category == "jobs":
            if key == "stapply_jobs":
                p = base_dir / "data/processed/jobs/stapply_normalized.parquet"
            elif key == "open_apply_jobs":
                p = base_dir / "data/processed/jobs/open_apply_normalized.parquet"
            elif key == "djinni_jobs":
                p = base_dir / "data/processed/jobs/djinni_jobs_normalized.parquet"
            else:
                p = Path("")
            cat_key = "job_postings"
        elif spec.category == "resumes":
            if key == "career_corpus":
                p = base_dir / "data/processed/resumes/career_corpus_normalized.jsonl"
                cat_key = "annotated_resumes"
            else:
                p = base_dir / "data/processed/resumes/djinni_candidate_profiles.parquet"
                cat_key = "candidate_profiles"
        elif spec.category == "trajectories":
            p = base_dir / "data/processed/occupations/jobhop_career_trajectories.parquet"
            cat_key = "career_trajectories"
        elif spec.category == "occupations_taxonomy":
            p = base_dir / "data/processed/occupations/occupations.parquet"
            cat_key = "occupations_taxonomy"
        else:
            p = base_dir / "data/processed/occupations/technology_skills.parquet"
            cat_key = "technology_skills_taxonomy"

        if p.exists():
            if p.suffix == ".parquet":
                processed_count = pq.read_table(p).num_rows
            elif p.suffix == ".jsonl":
                with open(p, "r", encoding="utf-8") as f:
                    processed_count = sum(1 for line in f if line.strip())
            status = "processed"

        remaining = max(0, spec.total_available_rows - processed_count)
        pct = round(processed_count / spec.total_available_rows * 100, 2) if spec.total_available_rows else 0.0

        category_buckets[cat_key]["available"] += spec.total_available_rows
        category_buckets[cat_key]["processed"] += processed_count
        category_buckets[cat_key]["remaining"] += remaining

        datasets_report[key] = {
            "name": spec.name,
            "category": cat_key,
            "record_type": spec.record_type,
            "total_available_rows": spec.total_available_rows,
            "processed_rows": processed_count,
            "remaining_unprocessed_rows": remaining,
            "coverage_percent": pct,
            "status": status,
            "license_id": spec.license_id,
            "commercial_status": spec.commercial_status,
        }

    # Calculate category percentages
    for cat_data in category_buckets.values():
        if cat_data["available"] > 0:
            cat_data["coverage_pct"] = round(cat_data["processed"] / cat_data["available"] * 100, 2)

    coverage = {
        "report_name": "CareerSyncAI Dataset Processing Coverage & Availability Report",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "methodology": "Categories are strictly partitioned by record type; heterogeneous records are evaluated within independent domain subtotals.",
        "category_subtotals": category_buckets,
        "datasets": datasets_report,
    }

    output_json.parent.mkdir(parents=True, exist_ok=True)
    temp_cov = output_json.with_suffix(".tmp.json")
    with open(temp_cov, "w", encoding="utf-8") as f:
        json.dump(coverage, f, indent=2)
    temp_cov.replace(output_json)
    logger.info("Saved dataset processing coverage report to %s", output_json)
    return coverage


def main() -> int:
    parser = argparse.ArgumentParser(
        description="CareerSyncAI Data Acquisition & Ingestion Pipeline Orchestrator",
    )
    parser.add_argument("--download", action="store_true", help="Download raw external datasets")
    parser.add_argument("--extract", action="store_true", help="Extract raw archives (O*NET zip)")
    parser.add_argument("--normalize", action="store_true", help="Normalize raw datasets into canonical schemas")
    parser.add_argument("--deduplicate", action="store_true", help="Run conservative deduplication on jobs")
    parser.add_argument("--validate", action="store_true", help="Run schema validation and generate quality report")
    parser.add_argument("--taxonomy", action="store_true", help="Run O*NET 31.0 taxonomy and skill alignment")
    parser.add_argument("--benchmarks", action="store_true", help="Build evaluation benchmark sets")
    parser.add_argument("--manifest", action="store_true", help="Generate dataset and license manifests")
    parser.add_argument("--input-path", type=str, default=None, help="Path to a manually downloaded dataset file to ingest")
    parser.add_argument("--all", action="store_true", help="Run entire end-to-end ingestion pipeline")

    args = parser.parse_args()

    if not any([args.download, args.extract, args.normalize, args.deduplicate, args.validate, args.taxonomy, args.benchmarks, args.manifest, args.all, args.input_path]):
        parser.print_help()
        return 1

    base_dir = Path(__file__).resolve().parent.parent.parent
    mem_monitor = MemoryMonitor()
    start_time = time.time()

    logger.info("==================================================")
    logger.info("CareerSyncAI Data Ingestion Pipeline Starting")
    logger.info("Base Directory: %s", base_dir)
    mem_monitor.check("Pipeline Startup")
    logger.info("==================================================")

    # File paths
    oa_raw = base_dir / "data" / "raw" / "jobs" / "open_apply" / "0.parquet"
    oa_norm = base_dir / "data" / "processed" / "jobs" / "open_apply_normalized.parquet"
    dj_jobs_norm = base_dir / "data" / "processed" / "jobs" / "djinni_jobs_normalized.parquet"
    st_norm = base_dir / "data" / "processed" / "jobs" / "stapply_normalized.parquet"

    jobs_dedup = base_dir / "data" / "processed" / "jobs" / "jobs_deduplicated.parquet"
    jobs_master = base_dir / "data" / "processed" / "jobs" / "consolidated_jobs_master.parquet"
    dedup_rep = base_dir / "data" / "reports" / "deduplication_report.json"
    cross_dedup_rep = base_dir / "data" / "reports" / "cross_dataset_deduplication_report.json"
    rev_queue_js = base_dir / "data" / "reports" / "possible_duplicates_review.json"

    cc_raw = base_dir / "data" / "raw" / "resumes" / "career_corpus" / "CareerCorpus.xlsx"
    cc_norm = base_dir / "data" / "processed" / "resumes" / "career_corpus_normalized.jsonl"
    cand_norm = base_dir / "data" / "processed" / "resumes" / "djinni_candidate_profiles.parquet"
    traj_norm = base_dir / "data" / "processed" / "occupations" / "jobhop_career_trajectories.parquet"

    onet_zip = base_dir / "data" / "raw" / "taxonomies" / "onet" / "db_31_0_text.zip"
    onet_ext = base_dir / "data" / "raw" / "taxonomies" / "onet" / "extracted"
    tax_proc = base_dir / "data" / "processed" / "occupations"
    occ_p = tax_proc / "occupations.parquet"
    skills_p = tax_proc / "technology_skills.parquet"

    qual_rep = base_dir / "data" / "reports" / "data_quality_report.json"
    tax_rep = base_dir / "data" / "reports" / "taxonomy_alignment_report.json"
    tax_audit_rep = base_dir / "data" / "reports" / "taxonomy_quality_audit.json"
    cov_rep = base_dir / "data" / "reports" / "dataset_processing_coverage_report.json"

    # 1. Download
    if args.download or args.all:
        logger.info("--- Step 1: Downloading Raw Datasets ---")
        run_download_step()
        mem_monitor.check("Post-Download")

    # 2. Extract
    if args.extract or args.all:
        logger.info("--- Step 2: Extracting Archives ---")
        if onet_zip.exists():
            safe_extract_zip(onet_zip, onet_ext)
        mem_monitor.check("Post-Extract")

    # 3. Normalize
    if args.normalize or args.all:
        logger.info("--- Step 3: Normalizing Datasets with Streaming Bounded Batches ---")
        run_normalization_step()
        mem_monitor.check("Post-Normalization")

    # 4. Conservative Deduplicate
    if args.deduplicate or args.all:
        logger.info("--- Step 4: Conservative Multi-Tier Cross-Dataset Deduplication ---")
        if oa_norm.exists():
            deduplicate_jobs(oa_norm, jobs_dedup, dedup_rep)

        inputs = []
        if oa_norm.exists():
            inputs.append(("open_apply", oa_norm))
        if dj_jobs_norm.exists():
            inputs.append(("djinni", dj_jobs_norm))
        if st_norm.exists():
            inputs.append(("stapply", st_norm))

        if len(inputs) > 1:
            deduplicate_cross_dataset(inputs, jobs_master, cross_dedup_rep, review_queue_json=rev_queue_js)
        elif oa_norm.exists():
            import shutil
            shutil.copyfile(jobs_dedup, jobs_master)
        mem_monitor.check("Post-Deduplication")

    # 5. Validate & Quality Profile
    if args.validate or args.all:
        logger.info("--- Step 5: Schema Validation & Quality Profiling ---")
        j_eval = jobs_master if jobs_master.exists() else (jobs_dedup if jobs_dedup.exists() else oa_norm)
        run_full_validation(
            j_eval,
            cc_norm,
            tax_proc,
            qual_rep,
            candidates_parquet=cand_norm if cand_norm.exists() else None,
            trajectories_parquet=traj_norm if traj_norm.exists() else None,
        )
        mem_monitor.check("Post-Validation")

    # 6. Taxonomy & Skill Integration
    if args.taxonomy or args.all:
        logger.info("--- Step 6: O*NET 31.0 Verified Taxonomy Alignment & Skill Coverage ---")
        j_eval = jobs_master if jobs_master.exists() else (jobs_dedup if jobs_dedup.exists() else oa_norm)
        if j_eval.exists() and cand_norm.exists() and occ_p.exists() and skills_p.exists():
            run_taxonomy_alignment(j_eval, cand_norm, cc_norm, occ_p, skills_p, tax_rep, quality_audit_path=tax_audit_rep)
        mem_monitor.check("Post-Taxonomy")

    # 7. Evaluation Benchmarks
    if args.benchmarks or args.all:
        logger.info("--- Step 7: Constructing Evaluation Benchmarks ---")
        build_all_benchmarks(base_dir)
        mem_monitor.check("Post-Benchmarks")

    # 8. Manifests & Coverage Report
    if args.manifest or args.all:
        logger.info("--- Step 8: Building Datasets & Licenses Manifests and Coverage Audit ---")
        build_manifests(base_dir)
        generate_coverage_report(base_dir, cov_rep)
        mem_monitor.check("Post-Manifests")

    elapsed = time.time() - start_time
    logger.info("==================================================")
    logger.info("CareerSyncAI Ingestion Pipeline Finished in %.2fs", elapsed)
    logger.info("Measured Process-wide Initial RSS: %.2f MB", mem_monitor.initial_rss)
    logger.info("Measured Process-wide Peak RSS:    %.2f MB", mem_monitor.peak_rss)
    logger.info("==================================================")
    return 0


if __name__ == "__main__":
    sys.exit(main())
