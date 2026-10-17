"""
Synchronous text extraction for resume files (PDF and DOCX).
Used inline during resume ingestion when ENABLE_WORKER=false.
"""
from __future__ import annotations

import io
import logging
import zipfile
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class DocumentSecurityError(Exception):
    """Base exception for document processing security violations."""
    pass


class PDFPageLimitExceededError(DocumentSecurityError):
    """Raised when a PDF document exceeds the allowable page count limit."""

    def __init__(self, page_count: int, max_pages: int):
        super().__init__(f"PDF contains {page_count} pages, which exceeds the maximum limit of {max_pages} pages.")
        self.page_count = page_count
        self.max_pages = max_pages


class DOCXSecurityError(DocumentSecurityError):
    """Raised when a DOCX archive violates security or structure constraints (zip bomb, excessive entries, etc.)."""
    pass


def validate_docx_archive(
    source: Path | str | io.BytesIO | bytes,
    *,
    max_zip_entries: int | None = None,
    max_uncompressed_bytes: int | None = None,
    max_entry_bytes: int | None = None,
    max_compression_ratio: float | None = None,
) -> None:
    """Validate DOCX ZIP archive bounds without decompressing content into memory.

    Guards against ZIP bombs, path traversal entries, XML entity expansion payloads,
    and malformed archives.
    """
    settings = get_settings()
    max_entries = max_zip_entries if max_zip_entries is not None else settings.docx_max_zip_entries
    max_uncompressed = max_uncompressed_bytes if max_uncompressed_bytes is not None else settings.docx_max_uncompressed_bytes
    max_entry = max_entry_bytes if max_entry_bytes is not None else settings.docx_max_entry_bytes
    max_ratio = max_compression_ratio if max_compression_ratio is not None else settings.docx_max_compression_ratio

    try:
        if isinstance(source, bytes):
            zf = zipfile.ZipFile(io.BytesIO(source))
        elif isinstance(source, (io.BytesIO, io.BufferedIOBase)):
            source.seek(0)
            zf = zipfile.ZipFile(source)
        else:
            zf = zipfile.ZipFile(str(source))
    except (zipfile.BadZipFile, zipfile.LargeZipFile, Exception) as exc:
        raise DOCXSecurityError(f"Malformed or unreadable DOCX ZIP archive: {exc}") from exc

    with zf:
        infolist = zf.infolist()
        if len(infolist) > max_entries:
            raise DOCXSecurityError(
                f"DOCX archive entry count ({len(infolist)}) exceeds maximum limit of {max_entries}."
            )

        total_uncompressed = 0
        has_document_xml = False
        has_content_types = False
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
            elif filename == "[Content_Types].xml":
                has_content_types = True

            # Check individual uncompressed entry size
            if info.file_size > max_entry:
                raise DOCXSecurityError(
                    f"DOCX archive member {filename} uncompressed size ({info.file_size} bytes) "
                    f"exceeds limit of {max_entry} bytes."
                )

            total_uncompressed += info.file_size
            if total_uncompressed > max_uncompressed:
                raise DOCXSecurityError(
                    f"DOCX archive total uncompressed size exceeds maximum limit of {max_uncompressed} bytes."
                )

            # Check compression ratio for entries with significant size (avoid false positives on tiny files)
            if info.file_size > 100 * 1024:
                if info.compress_size == 0:
                    raise DOCXSecurityError(
                        f"DOCX archive member {filename} has invalid zero compressed size for non-empty entry."
                    )
                ratio = info.file_size / info.compress_size
                if ratio > max_ratio:
                    raise DOCXSecurityError(
                        f"DOCX archive member {filename} compression ratio ({ratio:.1f}:1) "
                        f"exceeds safety threshold of {max_ratio}:1 (potential zip bomb)."
                    )

        if not has_document_xml:
            raise DOCXSecurityError("DOCX archive is missing required document structure (no word/document.xml).")


def extract_text_from_file(file_path: Path, mime_type: str, raise_security_exceptions: bool = False) -> str:
    """Extract plain text from a PDF or DOCX file.

    Tries pdfplumber → pypdf for PDFs, python-docx for DOCX.
    Returns empty string on failure (caller handles as partial_extraction).
    """
    try:
        if mime_type == "application/pdf":
            return _extract_pdf(file_path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return _extract_docx(file_path)
    except DocumentSecurityError as sec_exc:
        logger.warning("Document security policy rejected file %s: %s", file_path.name, sec_exc)
        if raise_security_exceptions:
            raise
    except Exception as exc:
        logger.warning("Text extraction failed for %s: %s", file_path.name, exc)
    return ""


def _extract_pdf(path: Path, max_pages: int | None = None) -> str:
    """PDF extraction: pdfplumber first, pypdf fallback with early page-count check."""
    settings = get_settings()
    limit = max_pages if max_pages is not None else settings.max_pdf_pages
    text_pages: list[str] = []

    # --- Primary: pdfplumber (layout-preserving) ---
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(str(path)) as pdf:
            page_count = len(pdf.pages)
            if page_count > limit:
                raise PDFPageLimitExceededError(page_count, limit)
            for page in pdf.pages:
                page_text = page.extract_text(layout=True) or page.extract_text() or ""
                text_pages.append(page_text)
        if any(t.strip() for t in text_pages):
            return _normalize("\n\n".join(text_pages))
    except ImportError:
        pass
    except PDFPageLimitExceededError:
        raise
    except Exception as exc:
        logger.debug("pdfplumber failed, trying pypdf: %s", exc)

    # --- Fallback: pypdf ---
    try:
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(str(path))
        page_count = len(reader.pages)
        if page_count > limit:
            raise PDFPageLimitExceededError(page_count, limit)
        for page in reader.pages:
            text_pages.append(page.extract_text() or "")
        return _normalize("\n\n".join(text_pages))
    except PDFPageLimitExceededError:
        raise
    except Exception as exc:
        logger.warning("pypdf also failed for %s: %s", path.name, exc)

    return ""


def _extract_docx(path: Path) -> str:
    """DOCX extraction using python-docx after bounded ZIP archive validation."""
    validate_docx_archive(path)
    try:
        import docx  # type: ignore
        doc = docx.Document(str(path))
        text_blocks: list[str] = []
        for p in doc.paragraphs:
            content = p.text.strip()
            if content:
                text_blocks.append(content)
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    unique_cells = []
                    for c in row_cells:
                        if not unique_cells or c != unique_cells[-1]:
                            unique_cells.append(c)
                    text_blocks.append(" | ".join(unique_cells))
        return _normalize("\n".join(text_blocks))
    except ImportError:
        logger.warning("python-docx not installed; DOCX extraction unavailable")
    except Exception as exc:
        logger.warning("DOCX extraction failed for %s: %s", path.name, exc)
    return ""


def _normalize(text: str) -> str:
    """Clean up common encoding artifacts and collapse excessive whitespace."""
    import re
    # Unicode ligatures and smart quotes
    text = (
        text.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\xa0", " ")
    )
    # Collapse 3+ blank lines → 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
