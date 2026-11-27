"""
CareerSyncAI - Data Ingestion Configuration & Checkpoint Manager
Defines processing limits, batch sizes, sampling seeds, and checkpoint state
for deterministic, resumable, bounded-memory dataset ingestion.
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.config")


@dataclass
class DatasetCoverageSpec:
    dataset_id: str
    name: str
    category: str  # "jobs", "resumes", "trajectories", "taxonomies"
    raw_path: str
    total_available_rows: int
    default_processing_limit: int
    batch_size: int = 5000
    deterministic_seed: int = 42
    record_type: str = "job_posting"
    license_id: str = "Unknown"
    commercial_status: str = "Evaluation Only"


# Authoritative ground-truth availability and processing limits
DATASET_SPECS: dict[str, DatasetCoverageSpec] = {
    "stapply_jobs": DatasetCoverageSpec(
        dataset_id="stapply_jobs",
        name="Stapply Open Job Data (Master Aggregated Archive)",
        category="jobs",
        raw_path="C:/Users/Hit/Desktop/SGP 5TH Sem/all.parquet",
        total_available_rows=8001916,
        default_processing_limit=30000,
        batch_size=5000,
        record_type="job_posting",
        license_id="Commercial-Clearance-Required-Employer-Content",
        commercial_status="Scraper open-source; job text copyright of hiring employers. Commercial clearance required.",
    ),
    "open_apply_jobs": DatasetCoverageSpec(
        dataset_id="open_apply_jobs",
        name="Open Apply Jobs (Partition 0)",
        category="jobs",
        raw_path="data/raw/jobs/open_apply/0.parquet",
        total_available_rows=37265,
        default_processing_limit=5000,
        batch_size=5000,
        record_type="job_posting",
        license_id="MIT-Packaging-Employer-Text",
        commercial_status="Packaging MIT; job descriptions copyright of hiring employers.",
    ),
    "djinni_jobs": DatasetCoverageSpec(
        dataset_id="djinni_jobs",
        name="Djinni English Job Descriptions",
        category="jobs",
        raw_path="data/raw/jobs/djinni/djinni_jobs_en.parquet",
        total_available_rows=141897,
        default_processing_limit=15000,
        batch_size=5000,
        record_type="job_posting",
        license_id="MIT",
        commercial_status="MIT License (Lang-UK / ACL 2024 UNLP collection).",
    ),
    "djinni_candidates": DatasetCoverageSpec(
        dataset_id="djinni_candidates",
        name="Djinni English Candidate Profiles",
        category="resumes",
        raw_path="data/raw/resumes/djinni/djinni_candidates_en.parquet",
        total_available_rows=210250,
        default_processing_limit=15000,
        batch_size=5000,
        record_type="candidate_profile",
        license_id="MIT",
        commercial_status="MIT License (anonymized profiles).",
    ),
    "career_corpus": DatasetCoverageSpec(
        dataset_id="career_corpus",
        name="CareerCorpus Anonymized Resumes",
        category="resumes",
        raw_path="data/raw/resumes/career_corpus/CareerCorpus.xlsx",
        total_available_rows=302,
        default_processing_limit=302,
        batch_size=302,
        record_type="annotated_resume",
        license_id="CC-BY-4.0",
        commercial_status="CC BY 4.0 (Chowdhury et al., 2025, Mendeley Data).",
    ),
    "jobhop_trajectories": DatasetCoverageSpec(
        dataset_id="jobhop_trajectories",
        name="JobHop v2 Career Trajectories",
        category="trajectories",
        raw_path="data/raw/taxonomies/jobhop/JobHop_v2_train.parquet",
        total_available_rows=1594827,
        default_processing_limit=25000,
        batch_size=5000,
        record_type="career_trajectory",
        license_id="CC-BY-4.0",
        commercial_status="CC BY 4.0 (Ghent University AIDA / IEEE BigData 2025).",
    ),
    "onet_occupations": DatasetCoverageSpec(
        dataset_id="onet_occupations",
        name="O*NET 31.0 Standard Occupational Classification (SOC)",
        category="occupations_taxonomy",
        raw_path="data/raw/taxonomies/onet/extracted/db_31_0_text/Occupation Data.txt",
        total_available_rows=1016,
        default_processing_limit=1016,
        batch_size=1016,
        record_type="soc_occupation",
        license_id="CC-BY-4.0",
        commercial_status="CC BY 4.0 (USDOL/ETA trademark attribution required).",
    ),
    "onet_technology_skills": DatasetCoverageSpec(
        dataset_id="onet_technology_skills",
        name="O*NET 31.0 Software & Technology Skills Table",
        category="technology_skills_taxonomy",
        raw_path="data/raw/taxonomies/onet/extracted/db_31_0_text/Software Skills.txt",
        total_available_rows=31821,
        default_processing_limit=31821,
        batch_size=5000,
        record_type="technology_skill",
        license_id="CC-BY-4.0",
        commercial_status="CC BY 4.0 (USDOL/ETA trademark attribution required).",
    ),
}


class CheckpointManager:
    """Tracks completed ingestion batches for idempotent resumption without reprocessing."""

    def __init__(self, checkpoint_path: Path):
        self.checkpoint_path = checkpoint_path
        self.state: dict[str, Any] = self._load()

    def _load(self) -> dict[str, Any]:
        if self.checkpoint_path.exists():
            try:
                with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning("Failed to load checkpoint file %s: %s", self.checkpoint_path, e)
        return {
            "version": "1.0.0",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "datasets": {},
        }

    def save(self) -> None:
        self.checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
        self.state["last_updated"] = datetime.now(timezone.utc).isoformat()
        temp_file = self.checkpoint_path.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2)
        temp_file.replace(self.checkpoint_path)

    def record_progress(
        self,
        dataset_id: str,
        processed_rows: int,
        total_available: int,
        rejections: int,
        rejection_reasons: dict[str, int],
        completed_batches: int,
        output_file: str,
    ) -> None:
        self.state["datasets"][dataset_id] = {
            "last_processed_at": datetime.now(timezone.utc).isoformat(),
            "total_available_rows": total_available,
            "processed_rows": processed_rows,
            "remaining_unprocessed_rows": max(0, total_available - processed_rows),
            "rejections": rejections,
            "rejection_reasons": rejection_reasons,
            "completed_batches": completed_batches,
            "output_file": output_file,
            "status": "completed" if processed_rows >= total_available else "partial",
        }
        self.save()

    def get_progress(self, dataset_id: str) -> Optional[dict[str, Any]]:
        return self.state.get("datasets", {}).get(dataset_id)
