"""
CareerSync AI — Pluggable Semantic Matching Engine.

Defines:
- BaseSemanticMatcher (ABC) for pluggable semantic models
- SublinearTFCosineMatcher: Explainable baseline using 1 + ln(tf) cosine similarity
  with concept overlap diagnostics and stopword filtering
- Future extension hook for neural embeddings (BGE-M3 / Transformers)
"""

from __future__ import annotations

import math
import re
from abc import ABC, abstractmethod
from collections import Counter
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SemanticMatchResult:
    similarity_score: float  # 0.0 to 100.0
    alignment_grade: str     # "High" (>=80), "Moderate" (>=55), "Low" (<55)
    matched_concepts: list[str]
    missing_concepts: list[str]
    model_version: str
    confidence: str          # "high", "medium", "low"
    diagnostics: dict[str, Any] = field(default_factory=dict)


class BaseSemanticMatcher(ABC):
    """Abstract interface for semantic matching implementations."""

    @abstractmethod
    def match(
        self,
        *,
        candidate_text: str,
        job_text: str,
        candidate_skills: list[str] | None = None,
        job_skills: list[str] | None = None,
    ) -> SemanticMatchResult:
        """Produce numerical similarity and explainable concept overlap."""
        pass


class SublinearTFCosineMatcher(BaseSemanticMatcher):
    """
    Explainable sublinear term-frequency cosine vector similarity engine.
    Applies 1 + ln(tf) weighting to dampen high-frequency term distortion
    while identifying salient domain concept overlaps.
    """

    STOPWORDS: set[str] = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
        "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
        "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
        "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
        "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
        "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
        "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
        "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
        "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
        "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
        "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
        "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
        "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
        "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
        "they've", "this", "those", "through", "to", "too", "under", "until", "up",
        "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
        "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
        "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
        "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
        "yourself", "yourselves", "role", "looking", "candidate", "responsibilities",
        "requirements", "opportunity", "team", "experience", "work", "years", "skills"
    }

    def __init__(self, model_version: str = "sublinear-tf-cosine-v1") -> None:
        self.model_version = model_version

    def match(
        self,
        *,
        candidate_text: str,
        job_text: str,
        candidate_skills: list[str] | None = None,
        job_skills: list[str] | None = None,
    ) -> SemanticMatchResult:
        # 1. Tokenize corpora
        cand_tokens = self._tokenize(candidate_text)
        job_tokens = self._tokenize(job_text)

        if not cand_tokens or not job_tokens:
            return SemanticMatchResult(
                similarity_score=0.0,
                alignment_grade="Low",
                matched_concepts=[],
                missing_concepts=[],
                model_version=self.model_version,
                confidence="low",
                diagnostics={"reason": "Empty token corpus"},
            )

        # 2. Compute sublinear TF cosine similarity
        cosine_sim = self._compute_cosine(cand_tokens, job_tokens)

        # Document cosine scaling: text similarities above 0.45 represent high domain alignment
        calibrated_score = round(min(100.0, max(0.0, cosine_sim * 1.8 * 100)), 1)

        # 3. Analyze salient concept overlaps
        cand_token_set = set(cand_tokens)
        matched_concepts: list[str] = []
        missing_concepts: list[str] = []

        target_concepts = job_skills or list(dict.fromkeys(job_tokens[:15]))
        for concept in target_concepts:
            concept_tokens = self._tokenize(concept)
            if all(t in cand_token_set for t in concept_tokens if t not in self.STOPWORDS):
                matched_concepts.append(concept)
            else:
                missing_concepts.append(concept)

        # 4. Grade categorization
        if calibrated_score >= 80.0:
            grade = "High"
            confidence = "high"
        elif calibrated_score >= 55.0:
            grade = "Moderate"
            confidence = "medium"
        else:
            grade = "Low"
            confidence = "low"

        return SemanticMatchResult(
            similarity_score=calibrated_score,
            alignment_grade=grade,
            matched_concepts=matched_concepts[:8],
            missing_concepts=missing_concepts[:6],
            model_version=self.model_version,
            confidence=confidence,
            diagnostics={
                "raw_cosine": round(cosine_sim, 4),
                "cand_token_count": len(cand_tokens),
                "job_token_count": len(job_tokens),
            },
        )

    def _tokenize(self, text: str) -> list[str]:
        if not text:
            return []
        raw = re.findall(r"\b[a-zA-Z0-9+#.]{2,}\b", text.lower())
        return [t for t in raw if t not in self.STOPWORDS and not t.isdigit()]

    def _compute_cosine(self, tokens_a: list[str], tokens_b: list[str]) -> float:
        vec_a = Counter(tokens_a)
        vec_b = Counter(tokens_b)

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
