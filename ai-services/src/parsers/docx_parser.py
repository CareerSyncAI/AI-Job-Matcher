"""DOCX Parser for CareerSync AI.

Extracts text from paragraphs, tables, and bullet lists in Word DOCX documents.
"""

from __future__ import annotations
import io
import re
from typing import Dict, List

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


class DOCXParser:
    """Extracts text structures from DOCX binary streams."""

    def parse_stream(self, stream: io.BytesIO) -> Dict[str, any]:
        """Extract text from paragraphs and embedded tables in a DOCX document."""
        if not HAS_DOCX:
            raise ImportError("python-docx is not installed.")

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
