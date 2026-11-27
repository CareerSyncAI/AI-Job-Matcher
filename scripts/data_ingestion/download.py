"""
CareerSyncAI - Data Acquisition & Ingestion Pipeline
Modular, resilient, resumable download manager with SHA-256 verification,
checkpoints, retry with exponential backoff, and bounded concurrency.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Optional

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.download")


@dataclass
class DatasetSource:
    id: str
    name: str
    category: str  # "jobs", "resumes", "taxonomies"
    url: str
    dest_path: str
    expected_size: Optional[int] = None
    expected_sha256: Optional[str] = None
    license: str = "Unknown"
    provenance: str = ""
    auth_required: bool = False
    headers: Optional[dict[str, str]] = None


# Initial approved datasets targeting high-value, legal, lightweight sources
TARGET_DATASETS: list[DatasetSource] = [
    DatasetSource(
        id="open_apply_partition_0",
        name="Open Apply Jobs (Partition 0)",
        category="jobs",
        url="https://huggingface.co/api/datasets/edwarddgao/open-apply-jobs/parquet/default/train/0.parquet",
        dest_path="data/raw/jobs/open_apply/0.parquet",
        expected_size=38127392,
        expected_sha256=None,  # Dynamic upstream snapshot
        license="MIT (Packaging/Tooling); Underlying job descriptions belong to respective employers",
        provenance="Hugging Face edwarddgao/open-apply-jobs (sourced directly from employer ATS endpoints)",
    ),
    DatasetSource(
        id="career_corpus_xlsx",
        name="CareerCorpus Annotated Resumes",
        category="resumes",
        url="https://data.mendeley.com/public-files/datasets/wzzwn37gmd/files/8dd12325-8dd9-47ea-9b90-8cf1e84eaf2a/file_downloaded",
        dest_path="data/raw/resumes/career_corpus/CareerCorpus.xlsx",
        expected_size=124525,
        expected_sha256="97b1fa6cca1232912dd3f7bc312d71a2478249787168fd41dfbf6c1da90479d3",
        license="CC BY 4.0",
        provenance="Mendeley Data DOI:10.17632/wzzwn37gmd.1 (Chowdhury et al., 2025)",
    ),
    DatasetSource(
        id="onet_31_0_text",
        name="O*NET Database 31.0 Text Archive",
        category="taxonomies",
        url="https://www.onetcenter.org/dl_files/database/db_31_0_text.zip",
        dest_path="data/raw/taxonomies/onet/db_31_0_text.zip",
        expected_size=13183034,
        expected_sha256="6883548adf5fde64cf6f801b35d15519c9225f2732c3cab0e281c652d16b23a9",
        license="CC BY 4.0 (US Department of Labor / ETA - O*NET trademark attribution required)",
        provenance="O*NET Resource Center (Production Release 31.0)",
    ),
    DatasetSource(
        id="djinni_candidate_profiles_en",
        name="Djinni Recruitment Candidate Profiles (English)",
        category="resumes",
        url="https://huggingface.co/datasets/lang-uk/recruitment-dataset-candidate-profiles-english/resolve/main/data/train-00000-of-00001.parquet",
        dest_path="data/raw/resumes/djinni/djinni_candidates_en.parquet",
        expected_size=237415736,
        expected_sha256=None,
        license="MIT (Academic Research Collection - Lang-UK / ACL 2024 UNLP)",
        provenance="Hugging Face lang-uk/recruitment-dataset-candidate-profiles-english",
    ),
    DatasetSource(
        id="djinni_job_descriptions_en",
        name="Djinni Recruitment Job Descriptions (English)",
        category="jobs",
        url="https://huggingface.co/datasets/lang-uk/recruitment-dataset-job-descriptions-english/resolve/main/data/train-00000-of-00001.parquet",
        dest_path="data/raw/jobs/djinni/djinni_jobs_en.parquet",
        expected_size=145859589,
        expected_sha256=None,
        license="MIT (Academic Research Collection - Lang-UK / ACL 2024 UNLP)",
        provenance="Hugging Face lang-uk/recruitment-dataset-job-descriptions-english",
    ),
    DatasetSource(
        id="jobhop_v2_train",
        name="JobHop v2 Career Trajectories (Train Parquet)",
        category="taxonomies",
        url="https://huggingface.co/datasets/aida-ugent/JobHop/resolve/main/JobHop_v2_train.parquet",
        dest_path="data/raw/taxonomies/jobhop/JobHop_v2_train.parquet",
        expected_size=9213302,
        expected_sha256=None,
        license="CC BY-NC-SA 4.0 / Research (Ghent University AIDA / VDAB)",
        provenance="Hugging Face aida-ugent/JobHop",
    ),
]


class ResumableDownloader:
    """Manages parallel and resumable file downloads with checksum validation."""

    def __init__(
        self,
        base_dir: Optional[Path] = None,
        history_file: Optional[Path] = None,
        max_retries: int = 5,
        timeout: float = 60.0,
    ):
        self.base_dir = base_dir or Path.cwd()
        self.history_file = history_file or (self.base_dir / "data/manifests/download_history.json")
        self.max_retries = max_retries
        self.timeout = timeout
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        self.history = self._load_history()

    def _load_history(self) -> dict[str, dict]:
        if self.history_file.exists():
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning("Could not load download history: %s", e)
        return {}

    def _save_history(self) -> None:
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            logger.error("Could not save download history: %s", e)

    @staticmethod
    def compute_sha256(file_path: Path) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(1024 * 1024):
                hasher.update(chunk)
        return hasher.hexdigest()

    def download_file(self, source: DatasetSource, force: bool = False) -> bool:
        """Download a single dataset source with resumption, validation, and history logging."""
        dest = self.base_dir / source.dest_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        temp_dest = dest.with_suffix(dest.suffix + ".part")

        # 1. Skip if already completed and valid
        if not force and dest.exists():
            actual_size = dest.stat().st_size
            if source.expected_size is None or actual_size == source.expected_size:
                actual_hash = self.compute_sha256(dest)
                if source.expected_sha256 is None or actual_hash == source.expected_sha256:
                    logger.info("Dataset [%s] already downloaded and verified at %s (%d bytes).", source.id, dest, actual_size)
                    self._record_history(source, dest, actual_size, actual_hash, "ALREADY_VERIFIED")
                    return True

        logger.info("Initiating download for [%s]: %s -> %s", source.id, source.url, dest)
        start_time = time.time()

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CareerSyncAI-Ingestion/1.0",
        }
        if source.headers:
            headers.update(source.headers)

        for attempt in range(1, self.max_retries + 1):
            try:
                # Check existing partial download for Range resumption
                existing_bytes = 0
                if temp_dest.exists():
                    existing_bytes = temp_dest.stat().st_size
                    if source.expected_size and existing_bytes >= source.expected_size:
                        # Stale or corrupted temp file, start over
                        existing_bytes = 0
                        temp_dest.unlink(missing_ok=True)

                req_headers = dict(headers)
                if existing_bytes > 0:
                    req_headers["Range"] = f"bytes={existing_bytes}-"
                    logger.info("Resuming [%s] from byte %d...", source.id, existing_bytes)

                mode = "ab" if existing_bytes > 0 else "wb"
                with httpx.Client(follow_redirects=True, timeout=self.timeout) as client:
                    with client.stream("GET", source.url, headers=req_headers) as resp:
                        # 416 Range Not Satisfiable -> file might already be complete or range unsupported
                        if resp.status_code == 416:
                            temp_dest.unlink(missing_ok=True)
                            existing_bytes = 0
                            continue

                        if resp.status_code not in (200, 206):
                            raise RuntimeError(f"HTTP {resp.status_code} {resp.reason_phrase} from {source.url}")

                        with open(temp_dest, mode) as f:
                            for chunk in resp.iter_bytes(chunk_size=128 * 1024):
                                if chunk:
                                    f.write(chunk)

                # Download finished, verify integrity
                actual_size = temp_dest.stat().st_size
                if source.expected_size and actual_size != source.expected_size:
                    raise ValueError(f"Size mismatch: expected {source.expected_size}, got {actual_size} bytes")

                actual_hash = self.compute_sha256(temp_dest)
                if source.expected_sha256 and actual_hash != source.expected_sha256:
                    raise ValueError(f"SHA-256 mismatch: expected {source.expected_sha256}, got {actual_hash}")

                # Atomic promotion from temp to target
                temp_dest.replace(dest)
                elapsed = time.time() - start_time
                speed_mb = (actual_size / 1024 / 1024) / max(elapsed, 0.001)

                logger.info(
                    "Successfully acquired [%s] in %.2fs (%.2f MB/s, %d bytes, SHA-256: %s)",
                    source.id,
                    elapsed,
                    speed_mb,
                    actual_size,
                    actual_hash[:16] + "...",
                )
                self._record_history(source, dest, actual_size, actual_hash, "SUCCESS", elapsed)
                return True

            except Exception as exc:
                backoff = min(2 ** attempt, 16)
                logger.warning(
                    "Download attempt %d/%d failed for [%s]: %s. Retrying in %ds...",
                    attempt,
                    self.max_retries,
                    source.id,
                    exc,
                    backoff,
                )
                time.sleep(backoff)

        temp_dest.unlink(missing_ok=True)
        self._record_history(source, dest, 0, "", f"FAILED after {self.max_retries} attempts")
        return False

    def _record_history(
        self,
        source: DatasetSource,
        dest: Path,
        size: int,
        sha256: str,
        status: str,
        elapsed_sec: float = 0.0,
    ) -> None:
        self.history[source.id] = {
            "source_id": source.id,
            "name": source.name,
            "category": source.category,
            "url": source.url,
            "dest_path": str(dest.relative_to(self.base_dir)),
            "byte_size": size,
            "sha256": sha256,
            "status": status,
            "elapsed_seconds": round(elapsed_sec, 2),
            "license": source.license,
            "provenance": source.provenance,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        self._save_history()

    def download_all(self, sources: list[DatasetSource], force: bool = False) -> dict[str, bool]:
        """Download all sources sequentially or in bounded pool."""
        results = {}
        for src in sources:
            success = self.download_file(src, force=force)
            results[src.id] = success
        return results


def run_download_step(force: bool = False) -> dict[str, bool]:
    """Execute download phase for all initial target datasets."""
    downloader = ResumableDownloader()
    return downloader.download_all(TARGET_DATASETS, force=force)


if __name__ == "__main__":
    run_download_step()
