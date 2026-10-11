"""
Synchronous text extraction for resume files (PDF and DOCX).
Used inline during resume ingestion when ENABLE_WORKER=false.
"""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: Path, mime_type: str) -> str:
    """Extract plain text from a PDF or DOCX file.

    Tries pdfplumber → pypdf for PDFs, python-docx for DOCX.
    Returns empty string on failure (caller handles as partial_extraction).
    """
    try:
        if mime_type == "application/pdf":
            return _extract_pdf(file_path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return _extract_docx(file_path)
    except Exception as exc:
        logger.warning("Text extraction failed for %s: %s", file_path, exc)
    return ""


def _extract_pdf(path: Path) -> str:
    """PDF extraction: pdfplumber first, pypdf fallback."""
    text_pages: list[str] = []

    # --- Primary: pdfplumber (layout-preserving) ---
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=True) or page.extract_text() or ""
                text_pages.append(page_text)
        if any(t.strip() for t in text_pages):
            return _normalize("\n\n".join(text_pages))
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("pdfplumber failed, trying pypdf: %s", exc)

    # --- Fallback: pypdf ---
    try:
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(str(path))
        for page in reader.pages:
            text_pages.append(page.extract_text() or "")
        return _normalize("\n\n".join(text_pages))
    except Exception as exc:
        logger.warning("pypdf also failed for %s: %s", path, exc)

    return ""


def _extract_docx(path: Path) -> str:
    """DOCX extraction using python-docx, including paragraphs and tables."""
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
        logger.warning("DOCX extraction failed for %s: %s", path, exc)
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
