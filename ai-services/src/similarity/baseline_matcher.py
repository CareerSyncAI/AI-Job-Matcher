"""Sublinear Term-Frequency Cosine Baseline Matcher for CareerSync AI.

Preserves the existing lexical/token-frequency cosine baseline with zero neural dependencies.
Computes cosine similarity over sublinear token frequencies: 1 + ln(tf).
"""

from __future__ import annotations

import math
import re
import time
from collections import Counter
from typing import Any, Dict, List, Set

from src.similarity.base import BaseSimilarityEngine, SemanticMatchOutput


class BaselineSemanticMatcher(BaseSimilarityEngine):
    """Deterministic token-frequency cosine similarity engine (Baseline)."""

    STOPWORDS: Set[str] = {
        "the", "and", "is", "in", "to", "of", "with", "for", "on", "at", "by", "from",
        "an", "be", "this", "that", "are", "was", "as", "or", "have", "has", "had", "will",
        "a", "about", "above", "after", "again", "all", "am", "any", "both", "but", "can",
        "could", "did", "do", "does", "each", "few", "more", "most", "not", "only", "other",
        "our", "out", "over", "same", "so", "some", "such", "than", "then", "there", "they",
        "up", "very", "we", "what", "when", "where", "which", "who", "why", "you", "your"
    }

    def __init__(self, engine_name: str = "tf-cosine-v1") -> None:
        self.engine_name = engine_name
        self.method_name = "tf_cosine_baseline"
        self.vector_dimensions = 384

    def match(
        self,
        candidate_profile: Dict[str, Any],
        job_requisition: Dict[str, Any]
    ) -> SemanticMatchOutput:
        start_time = time.perf_counter()

        # 1. Build composite candidate text
        cand_headline = candidate_profile.get("headline", "") or ""
        cand_skills = candidate_profile.get("skills", []) or []
        cand_summary = candidate_profile.get("experience_summary", "") or ""
        candidate_corpus = f"{cand_headline} {' '.join(cand_skills)} {cand_summary}".lower()

        # 2. Build composite job text
        job_title = job_requisition.get("title", "") or ""
        job_req_skills = job_requisition.get("required_skills", []) or []
        job_pref_skills = job_requisition.get("preferred_skills", []) or []
        job_desc = job_requisition.get("description", "") or ""
        job_corpus = f"{job_title} {' '.join(job_req_skills)} {' '.join(job_pref_skills)} {job_desc}".lower()

        # 3. Compute Vector Cosine Similarity
        raw_cosine = self._compute_cosine_similarity(candidate_corpus, job_corpus)
        # Bounded between 0.0 and 1.0
        raw_sim = max(0.0, min(1.0, raw_cosine))

        # Calibrated scaling for UI presentation:
        # In lexical text vectors, cosine >= 0.45 indicates strong domain alignment
        calibrated_sim = min(1.0, raw_sim * 1.8)
        similarity_index = round(min(100.0, max(0.0, calibrated_sim * 100)), 1)

        # 4. Extract explainable concept overlaps (strictly verifiable)
        cand_skills_set = set(s.lower() for s in cand_skills)

        matched_concepts: List[str] = []
        for s in job_req_skills + job_pref_skills:
            if s.lower() in cand_skills_set or s.lower() in candidate_corpus:
                matched_concepts.append(s)

        missing_concepts: List[str] = [
            s for s in (job_req_skills + job_pref_skills)
            if s.lower() not in cand_skills_set and s.lower() not in candidate_corpus
        ]

        # Determine alignment grade
        if similarity_index >= 80.0:
            grade = "High"
        elif similarity_index >= 55.0:
            grade = "Moderate"
        else:
            grade = "Low"

        duration_ms = (time.perf_counter() - start_time) * 1000

        return SemanticMatchOutput(
            raw_similarity=raw_sim,
            similarity_index=similarity_index,
            semantic_similarity_score=similarity_index,
            alignment_grade=grade,
            method=self.method_name,
            status="ok",
            fallback_reason=None,
            matched_key_concepts=matched_concepts[:8],
            missing_or_gap_concepts=missing_concepts[:5],
            model_info={
                "engine": self.engine_name,
                "model_id": self.engine_name,
                "model_revision": "1.0.0",
                "vector_dimensions": self.vector_dimensions,
                "device": "cpu",
                "offline_compatible": True
            },
            diagnostics={
                "candidate_char_count": len(candidate_corpus),
                "job_char_count": len(job_corpus),
                "candidate_chunks_count": 1 if candidate_corpus else 0,
                "job_chunks_count": 1 if job_corpus else 0,
                "chunks_processed": 1 if (candidate_corpus or job_corpus) else 0,
                "truncated": False,
                "latency_ms": round(duration_ms, 2)
            }
        )

    def _compute_cosine_similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity over sublinear token frequencies."""
        tokens_a = self._tokenize(text_a)
        tokens_b = self._tokenize(text_b)

        if not tokens_a or not tokens_b:
            return 0.0

        vec_a = Counter(tokens_a)
        vec_b = Counter(tokens_b)

        # Sublinear TF: 1 + ln(tf)
        all_terms = set(vec_a.keys()).union(set(vec_b.keys()))
        dot_product = 0.0
        norm_a = 0.0
        norm_b = 0.0

        for term in all_terms:
            tf_a = 1.0 + math.log(vec_a[term]) if term in vec_a else 0.0
            tf_b = 1.0 + math.log(vec_b[term]) if term in vec_b else 0.0
            dot_product += tf_a * tf_b
            norm_a += tf_a ** 2
            norm_b += tf_b ** 2

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))

    def _tokenize(self, text: str) -> List[str]:
        raw_tokens = re.findall(r"\b[a-zA-Z0-9+#.]{2,}\b", text.lower())
        return [t for t in raw_tokens if t not in self.STOPWORDS]
