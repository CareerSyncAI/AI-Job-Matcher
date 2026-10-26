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
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import httpx


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

    @property
    def scoring_matcher_id(self) -> str:
        """Stable identifier of the semantic matcher that actually produces ranking scores."""
        return self.__class__.__name__


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

    @property
    def scoring_matcher_id(self) -> str:
        return "SublinearTFCosineMatcher"

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


class AIServiceDiagnosticMatcher(BaseSemanticMatcher):
    """Calls the agreed AI-service endpoint without changing ranking semantics.

    The backend has no approved embedding-to-ranking score mapping. Therefore
    the deterministic matcher remains the returned scoring component while a
    successful or failed embedding request is retained as diagnostics.
    """

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        timeout_seconds: float = 15.0,
        fallback_matcher: BaseSemanticMatcher | None = None,
        client_factory: Callable[..., Any] = httpx.Client,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.fallback_matcher = fallback_matcher or SublinearTFCosineMatcher()
        self.client_factory = client_factory

    @property
    def scoring_matcher_id(self) -> str:
        """The diagnostic matcher delegates ranking scores to its fallback matcher."""
        if hasattr(self.fallback_matcher, "scoring_matcher_id"):
            return self.fallback_matcher.scoring_matcher_id
        return self.fallback_matcher.__class__.__name__

    def match(
        self,
        *,
        candidate_text: str,
        job_text: str,
        candidate_skills: list[str] | None = None,
        job_skills: list[str] | None = None,
    ) -> SemanticMatchResult:
        baseline = self.fallback_matcher.match(
            candidate_text=candidate_text,
            job_text=job_text,
            candidate_skills=candidate_skills,
            job_skills=job_skills,
        )
        diagnostics = dict(baseline.diagnostics)

        if not candidate_text.strip() or not job_text.strip():
            diagnostics["ai_service"] = {
                "requested_method": "embedding",
                "status": "not_requested",
                "reason": "empty_input",
            }
            return self._with_diagnostics(baseline, diagnostics)

        payload = {
            "candidate_profile": {
                "headline": "",
                "skills": candidate_skills or [],
                "experience_summary": candidate_text,
            },
            "job_requisition": {
                "title": "Candidate-job semantic comparison",
                "required_skills": job_skills or [],
                "preferred_skills": [],
                "description": job_text,
            },
            "method": "embedding",
        }
        try:
            with self.client_factory(timeout=self.timeout_seconds) as client:
                response = client.post(
                    f"{self.base_url}/api/v1/ai/semantic-match",
                    json=payload,
                    headers={"X-AI-Service-Key": self.api_key},
                )
            response.raise_for_status()
            service_result = response.json()
            self._validate_service_result(service_result)
            diagnostics["ai_service"] = {
                "requested_method": "embedding",
                "status": service_result["status"],
                "method": service_result["method"],
                "raw_similarity": service_result["raw_similarity"],
                "similarity_index": service_result["similarity_index"],
                "fallback_reason": service_result.get("fallback_reason"),
                "model_info": service_result["model_info"],
                "diagnostics": service_result.get("diagnostics", {}),
                "used_for_ranking": False,
            }
        except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
            diagnostics["ai_service"] = {
                "requested_method": "embedding",
                "status": "error",
                "reason": type(exc).__name__,
                "used_for_ranking": False,
            }
        return self._with_diagnostics(baseline, diagnostics)

    @staticmethod
    def _validate_service_result(result: Any) -> None:
        if not isinstance(result, dict):
            raise ValueError("Semantic service response must be an object.")
        if result.get("status") not in {"ok", "fallback", "disabled"}:
            raise ValueError("Semantic service returned an unsupported status.")
        if not isinstance(result.get("method"), str):
            raise ValueError("Semantic service response is missing method.")
        raw_similarity = result.get("raw_similarity")
        similarity_index = result.get("similarity_index")
        compatibility_score = result.get("semantic_similarity_score")
        if not isinstance(raw_similarity, (int, float)) or not 0.0 <= raw_similarity <= 1.0:
            raise ValueError("Semantic service raw_similarity must be in [0, 1].")
        if not isinstance(similarity_index, (int, float)) or not 0.0 <= similarity_index <= 100.0:
            raise ValueError("Semantic service similarity_index must be in [0, 100].")
        if not isinstance(compatibility_score, (int, float)) or not 0.0 <= compatibility_score <= 100.0:
            raise ValueError("Semantic service semantic_similarity_score must be in [0, 100].")
        if not isinstance(result.get("model_info"), dict):
            raise ValueError("Semantic service response is missing model_info.")

    @staticmethod
    def _with_diagnostics(
        result: SemanticMatchResult, diagnostics: dict[str, Any]
    ) -> SemanticMatchResult:
        return SemanticMatchResult(
            similarity_score=result.similarity_score,
            alignment_grade=result.alignment_grade,
            matched_concepts=result.matched_concepts,
            missing_concepts=result.missing_concepts,
            model_version=result.model_version,
            confidence=result.confidence,
            diagnostics=diagnostics,
        )
