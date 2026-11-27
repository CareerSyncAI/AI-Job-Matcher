"""
CareerSyncAI - Safe Archive Extraction Pipeline
Protects against zip bombs, path traversal attacks, and corrupted files.
"""
from __future__ import annotations

import logging
import zipfile
import tarfile
from pathlib import Path
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ingestion.extract")

MAX_ENTRIES = 5000
MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024  # 500 MB
MAX_INDIVIDUAL_ENTRY_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_COMPRESSION_RATIO = 50.0


class ArchiveSecurityError(Exception):
    """Raised when an archive violates safe extraction constraints."""
    pass


def safe_extract_zip(
    zip_path: Path,
    target_dir: Path,
    max_entries: int = MAX_ENTRIES,
    max_total_bytes: int = MAX_UNCOMPRESSED_BYTES,
) -> list[Path]:
    """Safely extracts a ZIP archive guarding against directory traversal and expansion bombs."""
    if not zip_path.exists():
        raise FileNotFoundError(f"Archive not found: {zip_path}")

    target_dir.mkdir(parents=True, exist_ok=True)
    extracted_files: list[Path] = []

    with zipfile.ZipFile(zip_path, "r") as zf:
        infolist = zf.infolist()
        if len(infolist) > max_entries:
            raise ArchiveSecurityError(f"Archive has {len(infolist)} entries, exceeding safety limit of {max_entries}")

        total_bytes = 0
        target_resolved = target_dir.resolve()

        for info in infolist:
            filename = info.filename.replace("\\", "/")
            # Path traversal check
            if filename.startswith("/") or ":" in filename or ".." in filename.split("/"):
                raise ArchiveSecurityError(f"Suspicious path traversal entry in archive: {filename}")

            if info.file_size > MAX_INDIVIDUAL_ENTRY_BYTES:
                raise ArchiveSecurityError(f"Entry {filename} exceeds individual entry limit ({info.file_size} bytes)")

            total_bytes += info.file_size
            if total_bytes > max_total_bytes:
                raise ArchiveSecurityError(f"Archive uncompressed size exceeds limit of {max_total_bytes} bytes")

            # Check compression ratio
            if info.file_size > 100 * 1024 and info.compress_size > 0:
                ratio = info.file_size / info.compress_size
                if ratio > MAX_COMPRESSION_RATIO:
                    raise ArchiveSecurityError(f"High compression ratio ({ratio:.1f}:1) for entry {filename}")

            # Extract safely
            extracted_path = (target_dir / filename).resolve()
            if not str(extracted_path).startswith(str(target_resolved)):
                raise ArchiveSecurityError(f"Extracted path escapes target root: {extracted_path}")

            if info.is_dir():
                extracted_path.mkdir(parents=True, exist_ok=True)
            else:
                extracted_path.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info) as src, open(extracted_path, "wb") as dst:
                    while chunk := src.read(64 * 1024):
                        dst.write(chunk)
                extracted_files.append(extracted_path)

    logger.info("Safely extracted %d files (%d uncompressed bytes) to %s", len(extracted_files), total_bytes, target_dir)
    return extracted_files


def run_extraction_step(base_dir: Optional[Path] = None) -> dict[str, int]:
    """Extract raw archives into their extracted staging directories."""
    root = base_dir or Path.cwd()
    results = {}

    # 1. O*NET Database 31.0
    onet_zip = root / "data/raw/taxonomies/onet/db_31_0_text.zip"
    onet_target = root / "data/raw/taxonomies/onet/extracted"
    if onet_zip.exists():
        files = safe_extract_zip(onet_zip, onet_target)
        results["onet_31_0"] = len(files)
    else:
        logger.warning("O*NET 31.0 archive not found at %s", onet_zip)

    return results


if __name__ == "__main__":
    run_extraction_step()
