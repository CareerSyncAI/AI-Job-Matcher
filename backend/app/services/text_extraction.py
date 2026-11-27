"""
Synchronous text extraction for resume files (PDF and DOCX).
Used inline during resume ingestion when ENABLE_WORKER=false.
"""
from __future__ import annotations

import io
import logging
import re
import zipfile
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger(__name__)


# Recognized hyphenated compound terms that must preserve their hyphens across line breaks
KNOWN_HYPHENATED_COMPOUNDS: frozenset[str] = frozenset({
    "cross-functional",
    "built-in",
    "end-to-end",
    "full-stack",
    "front-end",
    "back-end",
    "client-side",
    "server-side",
    "real-time",
    "open-source",
    "state-of-the-art",
    "user-friendly",
    "multi-tenant",
    "part-time",
    "full-time",
    "cost-effective",
    "data-driven",
    "test-driven",
    "high-level",
    "low-level",
    "high-availability",
    "low-latency",
    "object-oriented",
    "fast-paced",
    "third-party",
    "large-scale",
    "production-ready",
    "hands-on",
    "scale-out",
    "scale-up",
    "well-known",
    "micro-frontends",
    "self-motivated",
    "mission-critical",
    "auto-scaling",
    "zero-downtime",
    "event-driven",
    "domain-driven",
    "cloud-native",
    "peer-to-peer",
    "machine-learning",
    "multi-threaded",
    "cross-platform",
    "cross-browser",
    "high-throughput",
    "low-overhead",
    "user-centric",
    "service-oriented",
    "clean-code",
    "test-first",
})

# Recognized single unhyphenated terms that should be rejoined when split across line breaks
KNOWN_SINGLE_WORDS: frozenset[str] = frozenset({
    "microservices",
    "microservice",
    "infrastructure",
    "database",
    "databases",
    "workflow",
    "workflows",
    "codebase",
    "codebases",
    "framework",
    "frameworks",
    "lifecycle",
    "backend",
    "frontend",
    "standalone",
    "dashboard",
    "dashboards",
    "pipeline",
    "pipelines",
    "bandwidth",
    "benchmark",
    "benchmarks",
    "multithreading",
    "throughput",
    "timeline",
    "milestone",
    "milestones",
    "teamwork",
    "architecture",
    "architectures",
    "performance",
    "development",
    "developer",
    "developers",
    "engineering",
    "engineer",
    "engineers",
    "implementation",
    "implementations",
    "optimization",
    "optimizations",
    "collaboration",
    "configuration",
    "configurations",
    "experience",
    "experiences",
    "responsible",
    "responsibilities",
    "management",
    "distributed",
    "application",
    "applications",
    "environment",
    "environments",
    "continuous",
    "integration",
    "deployment",
    "monitoring",
    "scalability",
    "specification",
    "specifications",
    "maintenance",
    "troubleshooting",
    "requirements",
    "conceptual",
    "production",
    "repository",
    "repositories",
    "kubernetes",
    "javascript",
    "typescript",
    "postgresql",
})


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


class ScannedDocumentError(DocumentSecurityError):
    """Raised when a PDF document contains pages with images but no extractable text layer (scanned document)."""
    pass


def is_scanned_pdf(path: Path | str) -> bool:
    """Diagnostic check whether a PDF appears to be a scanned image document without extractable text."""
    p = Path(path)
    if not p.exists():
        return False
    try:
        _extract_pdf(p)
        return False
    except ScannedDocumentError:
        return True
    except Exception:
        return False


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
    has_images = False
    page_count = 0

    # --- Primary: pdfplumber (layout-preserving) ---
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(str(path)) as pdf:
            page_count = len(pdf.pages)
            if page_count > limit:
                raise PDFPageLimitExceededError(page_count, limit)
            for page in pdf.pages:
                if getattr(page, "images", None) and len(page.images) > 0:
                    has_images = True
                page_text = page.extract_text(layout=True) or page.extract_text() or ""
                text_pages.append(page_text)

        raw_text = "\n\n".join(text_pages)
        normalized = _normalize(raw_text)
        clean_chars = len(normalized.strip())
        clean_words = len(normalized.strip().split())

        # Scanned PDF check: document has pages and image content, but text layer is absent or near-empty
        if page_count > 0 and has_images and (clean_chars < 50 and clean_words < 10):
            raise ScannedDocumentError(
                f"PDF file '{path.name}' contains {page_count} page(s) with image content but no extractable text layer (scanned document)."
            )

        if clean_chars >= 50 or clean_words >= 10:
            return normalized
        if not has_images and clean_chars == 0:
            return ""
    except ImportError:
        pass
    except (PDFPageLimitExceededError, ScannedDocumentError):
        raise
    except Exception as exc:
        logger.debug("pdfplumber failed, trying pypdf: %s", exc)

    # --- Fallback: pypdf ---
    text_pages = []
    has_images = False
    try:
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(str(path))
        page_count = len(reader.pages)
        if page_count > limit:
            raise PDFPageLimitExceededError(page_count, limit)
        for page in reader.pages:
            if getattr(page, "images", None) and len(page.images) > 0:
                has_images = True
            text_pages.append(page.extract_text() or "")

        raw_text = "\n\n".join(text_pages)
        normalized = _normalize(raw_text)
        clean_chars = len(normalized.strip())
        clean_words = len(normalized.strip().split())

        if page_count > 0 and has_images and (clean_chars < 50 and clean_words < 10):
            raise ScannedDocumentError(
                f"PDF file '{path.name}' contains {page_count} page(s) with image content but no extractable text layer (scanned document)."
            )

        if clean_chars >= 50 or clean_words >= 10:
            return normalized
        if not has_images and clean_chars == 0:
            return ""
    except (PDFPageLimitExceededError, ScannedDocumentError):
        raise
    except Exception as exc:
        logger.warning("pypdf also failed for %s: %s", path.name, exc)

    if page_count > 0 and has_images:
        raise ScannedDocumentError(
            f"PDF file '{path.name}' contains {page_count} page(s) with image content but no extractable text layer (scanned document)."
        )

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


def _resolve_hyphen_break(match: re.Match[str]) -> str:
    """Resolve a word broken across line breaks by a hyphen.

    Preserves legitimate hyphenated compound words while rejoining syllables of single words.
    """
    p1 = match.group(1)
    p2 = match.group(2)
    p1_lower = p1.lower()
    p2_lower = p2.lower()
    compound = f"{p1_lower}-{p2_lower}"
    joined = f"{p1_lower.replace('-', '')}{p2_lower}"

    if compound in KNOWN_HYPHENATED_COMPOUNDS:
        return f"{p1}-{p2}"
    if joined in KNOWN_SINGLE_WORDS:
        return f"{p1.replace('-', '')}{p2}"

    # Proper noun or technical term compound (e.g. Java-Python, Linux-Unix)
    if p1[0].isupper() and p2[0].isupper() and len(p1) > 2 and len(p2) > 2:
        return f"{p1}-{p2}"

    # Common hyphenation prefixes forming valid compound words
    if p1_lower in {"cross", "multi", "inter", "self", "pre", "post", "non", "sub", "auto", "semi", "co"}:
        if joined in KNOWN_SINGLE_WORDS:
            return f"{p1}{p2}"
        return f"{p1}-{p2}"

    # Default to rejoining split syllables (e.g. deve-loper -> developer, experi-ence -> experience)
    return f"{p1}{p2}"


def _normalize(text: str) -> str:
    """Clean up common encoding artifacts, repair split words, and normalize whitespace."""
    if not text:
        return ""

    # 1. Unicode ligatures and smart quotes
    text = (
        text.replace("\ufb00", "ff")
        .replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\ufb03", "ffi")
        .replace("\ufb04", "ffl")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201a", "'")
        .replace("\u201b", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u201e", '"')
        .replace("\u201f", '"')
        .replace("\u2013", "-")
        .replace("\u2014", " -- ")
        .replace("\u2015", "-")
        .replace("\u2212", "-")
        .replace("\xa0", " ")
        .replace("\u200b", "")
        .replace("\u200c", "")
        .replace("\u200d", "")
        .replace("\ufeff", "")
    )

    # 2. Protect URLs during normalization
    url_placeholders: list[str] = []

    def _protect_url(m: re.Match[str]) -> str:
        idx = len(url_placeholders)
        url_placeholders.append(m.group(0))
        return f"__URL_PLACEHOLDER_{idx}__"

    text = re.sub(r"https?://[^\s]+|www\.[^\s]+", _protect_url, text)

    # 3. Preserve dates split across line breaks (e.g. "2020-\n2023" -> "2020 - 2023")
    text = re.sub(r"(\b\d{4})\s*-\s*\n\s*(\d{4}\b)", r"\1 - \2", text)
    text = re.sub(
        r"(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\s*-\s*\n\s*([A-Za-z0-9]+)",
        r"\1 - \2",
        text,
    )

    # 4. Preserve parenthetical / em-dash separators that have whitespace before hyphen
    text = re.sub(r"(\S+)\s+(?:--?|—|–)\s*\n\s*(\S+)", r"\1 - \2", text)

    # 5. Resolve hyphenated split words vs legitimate compound words across line breaks
    text = re.sub(r"((?:\b[A-Za-z]{2,}-)*[A-Za-z]{2,})-\s*\n\s*([A-Za-z]{2,}\b)", _resolve_hyphen_break, text)

    # 6. Repair broken line wraps within sentences (line continues with lowercase letter)
    text = re.sub(r"([A-Za-z0-9,])\s*\n\s*([a-z])", r"\1 \2", text)

    # 7. Restore protected URLs
    for idx, url in enumerate(url_placeholders):
        text = text.replace(f"__URL_PLACEHOLDER_{idx}__", url)

    # 8. Collapse per-line horizontal whitespace and clean blank lines
    cleaned_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    text = "\n".join(cleaned_lines)

    # Collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
