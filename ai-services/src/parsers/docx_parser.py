"""DOCX Parser for CareerSync AI.

Extracts text from paragraphs, tables, and bullet lists in Word DOCX documents.
"""

from __future__ import annotations

import io
import os
import re
import zipfile
from typing import Any

try:
    import docx
    HAS_DOCX = True
except ImportError:
    docx = None  # pyright: ignore[reportConstantRedefinition]
    HAS_DOCX = False


class DOCXSecurityError(ValueError):
    """Raised when a DOCX archive violates security or structure constraints."""


class DOCXParser:
    """Extracts text structures from DOCX binary streams."""

    def __init__(
        self,
        max_zip_entries: int | None = None,
        max_uncompressed_bytes: int | None = None,
        max_entry_bytes: int | None = None,
        max_compression_ratio: float | None = None,
    ):
        self.max_zip_entries = (
            max_zip_entries
            if max_zip_entries is not None
            else int(os.getenv("DOCX_MAX_ZIP_ENTRIES", os.getenv("CAREERSYNC_DOCX_MAX_ZIP_ENTRIES", "500")))
        )
        self.max_uncompressed_bytes = (
            max_uncompressed_bytes
            if max_uncompressed_bytes is not None
            else int(os.getenv("DOCX_MAX_UNCOMPRESSED_BYTES", os.getenv("CAREERSYNC_DOCX_MAX_UNCOMPRESSED_BYTES", str(30 * 1024 * 1024))))
        )
        self.max_entry_bytes = (
            max_entry_bytes
            if max_entry_bytes is not None
            else int(os.getenv("DOCX_MAX_ENTRY_BYTES", os.getenv("CAREERSYNC_DOCX_MAX_ENTRY_BYTES", str(15 * 1024 * 1024))))
        )
        self.max_compression_ratio = (
            max_compression_ratio
            if max_compression_ratio is not None
            else float(os.getenv("DOCX_MAX_COMPRESSION_RATIO", os.getenv("CAREERSYNC_DOCX_MAX_COMPRESSION_RATIO", "50.0")))
        )

    def validate_archive(self, stream: io.BytesIO) -> None:
        """Inspects ZIP container bounds before passing to python-docx.

        Guards against ZIP bombs, path traversal, XML entity expansion payloads,
        and malformed archives without decompressing all content into memory.
        """
        stream.seek(0)
        try:
            zf = zipfile.ZipFile(stream)
        except (zipfile.BadZipFile, zipfile.LargeZipFile, Exception) as exc:
            raise DOCXSecurityError(f"Malformed or unreadable DOCX ZIP archive: {exc}") from exc

        with zf:
            infolist = zf.infolist()
            if len(infolist) > self.max_zip_entries:
                raise DOCXSecurityError(
                    f"DOCX archive entry count ({len(infolist)}) exceeds maximum limit of {self.max_zip_entries}."
                )

            total_uncompressed = 0
            has_document_xml = False
            seen_filenames: set[str] = set()

            for info in infolist:
                filename = info.filename.replace("\\", "/")
                if filename in seen_filenames:
                    raise DOCXSecurityError(f"Duplicate entry in DOCX archive: {filename}")
                seen_filenames.add(filename)

                # Check for path traversal, drive prefixes, or absolute paths in ZIP member names
                if filename.startswith("/") or ":" in filename or ".." in filename.split("/"):
                    raise DOCXSecurityError(f"Suspicious path in DOCX archive member: {filename}")

                if filename == "word/document.xml":
                    has_document_xml = True

                # Check individual uncompressed entry size
                if info.file_size > self.max_entry_bytes:
                    raise DOCXSecurityError(
                        f"DOCX archive member {filename} uncompressed size ({info.file_size} bytes) "
                        f"exceeds limit of {self.max_entry_bytes} bytes."
                    )

                total_uncompressed += info.file_size
                if total_uncompressed > self.max_uncompressed_bytes:
                    raise DOCXSecurityError(
                        f"DOCX archive total uncompressed size exceeds maximum limit of {self.max_uncompressed_bytes} bytes."
                    )

                # Check compression ratio for entries with significant size (avoid false positives on tiny files)
                if info.file_size > 100 * 1024:
                    if info.compress_size == 0:
                        raise DOCXSecurityError(
                            f"DOCX archive member {filename} has invalid zero compressed size for non-empty entry."
                        )
                    ratio = info.file_size / info.compress_size
                    if ratio > self.max_compression_ratio:
                        raise DOCXSecurityError(
                            f"DOCX archive member {filename} compression ratio ({ratio:.1f}:1) "
                            f"exceeds safety threshold of {self.max_compression_ratio}:1 (potential zip bomb)."
                        )

            if not has_document_xml:
                raise DOCXSecurityError("DOCX archive is missing required document structure (no word/document.xml).")

    def parse_stream(self, stream: io.BytesIO) -> dict[str, Any]:
        """Extract text from paragraphs and embedded tables in a DOCX document."""
        if not HAS_DOCX or docx is None:
            raise ImportError("python-docx is not installed.")

        # 0. Validate archive boundaries before passing to python-docx
        self.validate_archive(stream)

        try:
            stream.seek(0)
            doc = docx.Document(stream)
        except DOCXSecurityError:
            raise
        except Exception as exc:
            raise DOCXSecurityError(f"Malformed DOCX XML or package structure: {exc}") from exc

        text_blocks: list[str] = []
        warnings: list[str] = []

        # 1. Extract paragraphs
        for p in doc.paragraphs:
            content = p.text.strip()
            if content:
                text_blocks.append(content)

        # 2. Extract tables (resumes frequently format experience/skills in tables)
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    # Deduplicate repeated cell texts caused by merged cells
                    unique_cells = []
                    for c in row_cells:
                        if not unique_cells or c != unique_cells[-1]:
                            unique_cells.append(c)
                    text_blocks.append(" | ".join(unique_cells))

        full_text = "\n".join(text_blocks)
        normalized = self._normalize_text(full_text)

        if not normalized:
            warnings.append("DOCX document contained no extractable text.")

        return {
            "text": normalized,
            "engine_used": "python-docx",
            "warnings": warnings,
            "char_count": len(normalized)
        }

    def _normalize_text(self, text: str) -> str:
        text = text.replace("’", "'").replace("“", '"').replace("”", '"')
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
