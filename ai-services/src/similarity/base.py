"""Base interfaces and data structures for semantic matching engines.

Defines the pluggable similarity interface conforming to CareerSync AI architecture.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SemanticMatchOutput:
    """Standardized result of a semantic similarity calculation."""
    raw_similarity: float                # Raw unscaled cosine similarity [0.0, 1.0]
    similarity_index: float              # Normalized 0.0-100.0 presentation index (not a probability)
    semantic_similarity_score: float     # Backward-compatible 0.0-100.0 score
    alignment_grade: str                 # "High", "Moderate", "Low"
    method: str                          # "sentence_embedding", "tf_cosine_baseline", "fallback"
    status: str                          # "ok", "fallback", "disabled"
    matched_key_concepts: list[str]      # Evidence-backed concept overlaps
    missing_or_gap_concepts: list[str]   # Missing required/preferred concepts
    model_info: dict[str, Any]           # Model ID, revision, dimensions, device
    diagnostics: dict[str, Any] = field(default_factory=dict)
    fallback_reason: str | None = None
    evidence_status: dict[str, list[str]] = field(
        default_factory=lambda: {"supported": [], "not_detected": [], "insufficient_information": []}
    )
    evidence_breakdown: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert output to standard dictionary matching API schemas."""
        return {
            "raw_similarity": round(self.raw_similarity, 4),
            "similarity_index": round(self.similarity_index, 1),
            "semantic_similarity_score": round(self.semantic_similarity_score, 1),
            "alignment_grade": self.alignment_grade,
            "method": self.method,
            "status": self.status,
            "fallback_reason": self.fallback_reason,
            "matched_key_concepts": self.matched_key_concepts,
            "missing_or_gap_concepts": self.missing_or_gap_concepts,
            "evidence_status": self.evidence_status,
            "evidence_breakdown": self.evidence_breakdown,
            "model_info": self.model_info,
            "diagnostics": self.diagnostics,
        }


class BaseSimilarityEngine(ABC):
    """Abstract Base Class for semantic similarity engines."""

    @abstractmethod
    def match(
        self,
        candidate_profile: dict[str, Any],
        job_requisition: dict[str, Any]
    ) -> SemanticMatchOutput:
        """Compute similarity between candidate profile and job requisition."""
