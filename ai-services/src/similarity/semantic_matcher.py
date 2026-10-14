"""Explainable Semantic Similarity Engine for CareerSync AI.

Pluggable facade supporting:
1. Baseline: Sublinear token-frequency cosine matcher (deterministic, zero neural weights)
2. Experimental: Sentence-transformers dense embedding matcher (all-MiniLM-L6-v2)

Provides seamless configuration via SEMANTIC_MATCHER env variable ('baseline' or 'embedding'),
transparent fallback handling, and strictly verifiable evidence extraction.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

from src.similarity.base import BaseSimilarityEngine, SemanticMatchOutput
from src.similarity.baseline_matcher import BaselineSemanticMatcher
from src.similarity.embedding_matcher import SentenceEmbeddingMatcher


class SemanticMatcher(BaseSimilarityEngine):
    """Unified pluggable semantic matcher coordinating baseline and embedding implementations."""

    def __init__(self, default_engine: Optional[str] = None) -> None:
        configured = default_engine or os.getenv("SEMANTIC_MATCHER", "baseline").lower()
        self.default_method = "embedding" if configured in ("embedding", "neural", "sentence_transformers") else "baseline"

        # Initialize engines
        self.baseline_engine = BaselineSemanticMatcher()
        self.embedding_engine = SentenceEmbeddingMatcher(lazy_load=True)

        # Retain legacy attributes for backward compatibility
        self.engine_name = "sentence-transformers/all-MiniLM-L6-v2" if self.default_method == "embedding" else "semantic-cosine-v1"
        self.vector_dimensions = 384

    def match(
        self,
        candidate_profile: Dict[str, Any],
        job_requisition: Dict[str, Any],
        method: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculate semantic similarity score and explainable concept overlap.

        Args:
            candidate_profile: Dict with 'headline', 'skills', 'experience_summary'
            job_requisition: Dict with 'title', 'required_skills', 'preferred_skills', 'description'
            method: Optional override ("baseline" or "embedding")
        """
        target_method = (method or self.default_method).lower()

        if target_method in ("embedding", "sentence_embedding", "neural"):
            output: SemanticMatchOutput = self.embedding_engine.match(candidate_profile, job_requisition)
        else:
            output = self.baseline_engine.match(candidate_profile, job_requisition)

        return output.to_dict()

    def get_active_engine_info(self) -> Dict[str, Any]:
        """Return diagnostic information about active engine and model status."""
        return {
            "default_method": self.default_method,
            "embedding_model_loaded": self.embedding_engine.is_model_loaded(),
            "embedding_model_id": self.embedding_engine.model_id,
            "embedding_model_revision": self.embedding_engine.model_revision,
            "fallback_enabled": self.embedding_engine.fallback_enabled,
            "vector_dimensions": 384,
        }
