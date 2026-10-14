"""Base interfaces and data structures for semantic matching engines.

Defines the pluggable similarity interface conforming to CareerSync AI architecture.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class SemanticMatchOutput:
    """Standardized result of a semantic similarity calculation."""
    raw_similarity: float                # Raw unscaled cosine similarity [0.0, 1.0]
    similarity_index: float              # Normalized 0.0-100.0 presentation index (not a probability)
    semantic_similarity_score: float     # Backward-compatible 0.0-100.0 score
    alignment_grade: str                 # "High", "Moderate", "Low"
    method: str                          # "sentence_embedding", "tf_cosine_baseline", "fallback"
    status: str                          # "ok", "fallback", "disabled"
    matched_key_concepts: List[str]      # Evidence-backed concept overlaps
    missing_or_gap_concepts: List[str]   # Missing required/preferred concepts
    model_info: Dict[str, Any]           # Model ID, revision, dimensions, device
    diagnostics: Dict[str, Any] = field(default_factory=dict)
    fallback_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
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
            "model_info": self.model_info,
            "diagnostics": self.diagnostics,
        }


class BaseSimilarityEngine(ABC):
    """Abstract Base Class for semantic similarity engines."""

    @abstractmethod
    def match(
        self,
        candidate_profile: Dict[str, Any],
        job_requisition: Dict[str, Any]
    ) -> SemanticMatchOutput:
        """Compute similarity between candidate profile and job requisition."""
        pass
