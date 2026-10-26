"""Layout-Aware PDF Parser for CareerSync AI.

Extracts continuous, normalized text streams and tables from PDF documents
with dual-engine fallback (pdfplumber -> pypdf) for maximum resilience.
"""

from __future__ import annotations

import io
import os
import re
from typing import Any

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    pypdf = None  # pyright: ignore[reportConstantRedefinition]
    HAS_PYPDF = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    pdfplumber = None  # pyright: ignore[reportConstantRedefinition]
    HAS_PDFPLUMBER = False


class PDFPageLimitExceeded(ValueError):
    """Raised when PDF exceeds allowable page count."""

    def __init__(self, page_count: int, max_pages: int):
        super().__init__(f"Document contains {page_count} pages, which exceeds the limit of {max_pages} pages.")
        self.page_count = page_count
        self.max_pages = max_pages


class PDFParser:
    """Extracts text and layout elements from PDF binary streams."""

    def __init__(self, max_pages: int | None = None):
        if max_pages is not None:
            self.max_pages = max_pages
        else:
            self.max_pages = int(os.getenv("MAX_PDF_PAGES", os.getenv("CAREERSYNC_MAX_PDF_PAGES", "15")))
        if HAS_PDFPLUMBER:
            self.engine = "pdfplumber"
        elif HAS_PYPDF:
            self.engine = "pypdf"
        else:
            self.engine = "none"

    def parse_stream(self, stream: io.BytesIO) -> dict[str, Any]:
        """Extract clean text, page count, and diagnostic metadata from a PDF stream."""
        warnings: list[str] = []
        extracted_pages: list[str] = []

        if HAS_PDFPLUMBER and pdfplumber is not None:
            try:
                stream.seek(0)
                with pdfplumber.open(stream) as pdf:
                    page_count = len(pdf.pages)
                    if page_count > self.max_pages:
                        raise PDFPageLimitExceeded(page_count, self.max_pages)
                    if page_count == 0:
                        warnings.append("Document contains 0 pages.")
                    for p_num, page in enumerate(pdf.pages, start=1):
                        # Extract text using layout preservation
                        text = page.extract_text(layout=True)
                        if not text:
                            # Fallback without strict layout
                            text = page.extract_text() or ""
                        if not text.strip():
                            warnings.append(f"Page {p_num} returned empty text stream (may be scanned image).")
                        extracted_pages.append(text)
            except PDFPageLimitExceeded:
                raise
            except Exception as plumber_err:
                warnings.append(f"pdfplumber error ({plumber_err!s}), attempting pypdf fallback.")
                extracted_pages = []

        # Fallback to pypdf if pdfplumber was unavailable or failed
        if not extracted_pages:
            if not HAS_PYPDF or pypdf is None:
                raise ValueError("Neither pdfplumber nor pypdf is installed to extract PDF text.")
            try:
                stream.seek(0)
                reader = pypdf.PdfReader(stream)
                page_count = len(reader.pages)
                if page_count > self.max_pages:
                    raise PDFPageLimitExceeded(page_count, self.max_pages)
                for _p_num, page in enumerate(reader.pages, start=1):
                    p_text = page.extract_text() or ""
                    extracted_pages.append(p_text)
            except PDFPageLimitExceeded:
                raise
            except Exception as pypdf_err:
                raise ValueError(f"Failed to extract PDF text with both engines: {pypdf_err!s}") from pypdf_err

        # Normalize extracted text
        full_raw_text = "\n\n".join(extracted_pages)
        normalized_text = self._normalize_text(full_raw_text)

        return {
            "text": normalized_text,
            "page_count": len(extracted_pages),
            "engine_used": self.engine,
            "warnings": warnings,
            "char_count": len(normalized_text)
        }

    def _normalize_text(self, text: str) -> str:
        """Cleans multi-byte quotes, ligatures, and uneven whitespace."""
        # Replace common Unicode ligatures
        text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("’", "'").replace("“", '"').replace("”", '"')
        # Replace non-breaking spaces
        text = text.replace("\xa0", " ")
        # Collapse excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
