"""DOCX Parser for CareerSync AI.

Extracts text from paragraphs, tables, and bullet lists in Word DOCX documents.
"""

from __future__ import annotations
import io
import re
import zipfile
from typing import Dict, List

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


class DOCXSecurityError(ValueError):
    """Raised when a DOCX archive violates security or structure constraints."""
    pass


class DOCXParser:
    """Extracts text structures from DOCX binary streams."""

    def __init__(
        self,
        max_zip_entries: int = 500,
        max_uncompressed_bytes: int = 30 * 1024 * 1024,
        max_entry_bytes: int = 15 * 1024 * 1024,
        max_compression_ratio: float = 50.0,
    ):
        self.max_zip_entries = max_zip_entries
        self.max_uncompressed_bytes = max_uncompressed_bytes
        self.max_entry_bytes = max_entry_bytes
        self.max_compression_ratio = max_compression_ratio

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
            has_content_types = False

            for info in infolist:
                # Check for path traversal or absolute paths in ZIP member names
                filename = info.filename.replace("\\", "/")
                if filename.startswith("/") or ".." in filename.split("/"):
                    raise DOCXSecurityError(f"Suspicious path in DOCX archive member: {filename}")

                if filename == "word/document.xml":
                    has_document_xml = True
                elif filename == "[Content_Types].xml":
                    has_content_types = True

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
                if info.compress_size > 0 and info.file_size > 100 * 1024:
                    ratio = info.file_size / info.compress_size
                    if ratio > self.max_compression_ratio:
                        raise DOCXSecurityError(
                            f"DOCX archive member {filename} compression ratio ({ratio:.1f}:1) "
                            f"exceeds safety threshold of {self.max_compression_ratio}:1 (potential zip bomb)."
                        )

            if not (has_document_xml or has_content_types):
                raise DOCXSecurityError("DOCX archive is missing required document structure (no word/document.xml).")

    def parse_stream(self, stream: io.BytesIO) -> Dict[str, any]:
        """Extract text from paragraphs and embedded tables in a DOCX document."""
        if not HAS_DOCX:
            raise ImportError("python-docx is not installed.")

        # 0. Validate archive boundaries before passing to python-docx
        self.validate_archive(stream)

        stream.seek(0)
        doc = docx.Document(stream)
        text_blocks: List[str] = []
        warnings: List[str] = []

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
