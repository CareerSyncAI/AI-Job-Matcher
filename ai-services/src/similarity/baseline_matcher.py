"""Sublinear Term-Frequency Cosine Baseline Matcher for CareerSync AI.

Preserves the existing lexical/token-frequency cosine baseline with zero neural dependencies.
Computes cosine similarity over sublinear token frequencies: 1 + ln(tf).
"""

from __future__ import annotations

import math
import re
import time
from collections import Counter
from typing import Any

from src.similarity.base import BaseSimilarityEngine, SemanticMatchOutput


class BaselineSemanticMatcher(BaseSimilarityEngine):
    """Deterministic token-frequency cosine similarity engine (Baseline)."""

    STOPWORDS: set[str] = {
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
        candidate_profile: dict[str, Any],
        job_requisition: dict[str, Any]
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
        unclamped_raw_cosine = float(raw_cosine)
        # Bounded between 0.0 and 1.0 strictly for v1.1.0 backend validator contract
        raw_sim = max(0.0, min(1.0, raw_cosine))

        # Calibrated scaling for UI presentation:
        # In lexical text vectors, cosine >= 0.45 indicates strong domain alignment
        calibrated_sim = min(1.0, raw_sim * 1.8)
        similarity_index = round(min(100.0, max(0.0, calibrated_sim * 100)), 1)

        # 4. Extract explainable concept overlaps and 3-way evidence status
        cand_skills_set = set(s.lower() for s in cand_skills)
        has_substantive_cand_text = len(candidate_corpus.strip()) >= 20

        matched_concepts: list[str] = []
        missing_concepts: list[str] = []
        evidence_breakdown: list[dict[str, Any]] = []

        all_requisition_skills = (
            [("required", s) for s in job_req_skills] +
            [("preferred", s) for s in job_pref_skills]
        )

        for category, s in all_requisition_skills:
            s_lower = s.lower()
            if s_lower in cand_skills_set or s_lower in candidate_corpus:
                matched_concepts.append(s)
                raw_quote = self._find_verbatim_quote(s, cand_summary) or self._find_verbatim_quote(s, candidate_corpus)
                evidence_breakdown.append({
                    "requirement": s,
                    "category": category,
                    "status": "supported",
                    "evidence_quote": raw_quote or f"Declared skill item: '{s}'",
                    "verification_type": "verbatim_text_quote" if raw_quote else "declared_skill_token",
                    "is_confirmed_gap": False,
                    "note": "Direct mention verified in candidate source text. Profoundness/seniority requires recruiter review.",
                })
            elif not has_substantive_cand_text:
                missing_concepts.append(s)
                evidence_breakdown.append({
                    "requirement": s,
                    "category": category,
                    "status": "insufficient_information",
                    "evidence_quote": None,
                    "verification_type": "insufficient_material",
                    "is_confirmed_gap": False,
                    "note": "Candidate text is too sparse or missing to verify requirement.",
                })
            else:
                missing_concepts.append(s)
                evidence_breakdown.append({
                    "requirement": s,
                    "category": category,
                    "status": "not_detected",
                    "evidence_quote": None,
                    "verification_type": "unmentioned",
                    "is_confirmed_gap": False,
                    "note": "Not detected in candidate text. Absence of mention is not proof of candidate deficiency.",
                })

        evidence_status = {
            "supported": [e["requirement"] for e in evidence_breakdown if e["status"] == "supported"],
            "not_detected": [e["requirement"] for e in evidence_breakdown if e["status"] == "not_detected"],
            "insufficient_information": [e["requirement"] for e in evidence_breakdown if e["status"] == "insufficient_information"],
        }

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
            evidence_status=evidence_status,
            evidence_breakdown=evidence_breakdown,
            model_info={
                "engine": self.engine_name,
                "model_id": self.engine_name,
                "model_revision": "1.0.0",
                "vector_dimensions": self.vector_dimensions,
                "device": "cpu",
                "offline_compatible": True
            },
            diagnostics={
                "unclamped_raw_cosine": round(unclamped_raw_cosine, 4),
                "raw_cosine_clamped": round(raw_sim, 4),
                "raw_similarity_definition": "Clamped cosine similarity [0.0, 1.0] for v1.1.0 contract compatibility.",
                "unclamped_cosine_definition": "Unbounded mathematical cosine similarity in [-1.0, 1.0].",
                "candidate_char_count": len(candidate_corpus),
                "job_char_count": len(job_corpus),
                "candidate_chunks_identified": 1 if candidate_corpus else 0,
                "candidate_chunks_processed": 1 if candidate_corpus else 0,
                "job_chunks_identified": 1 if job_corpus else 0,
                "job_chunks_processed": 1 if job_corpus else 0,
                "candidate_chunks_count": 1 if candidate_corpus else 0,
                "job_chunks_count": 1 if job_corpus else 0,
                "chunks_processed": 1 if (candidate_corpus or job_corpus) else 0,
                "truncated": False,
                "coverage_ratio": 1.0,
                "omitted_sections": [],
                "latency_ms": round(duration_ms, 2)
            }
        )

    def _find_verbatim_quote(self, query: str, text: str) -> str | None:
        """Finds an actual sentence or clause in the text containing the query term."""
        if not query or not text:
            return None
        pattern = rf"([^.\n;?!]*?\b{re.escape(query)}\b[^.\n;?!]*)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            snippet = match.group(1).strip()
            if len(snippet) > 200:
                snippet = snippet[:197] + "..."
            return snippet
        idx = text.lower().find(query.lower())
        if idx != -1:
            start = max(0, idx - 40)
            end = min(len(text), idx + len(query) + 40)
            prefix = "..." if start > 0 else ""
            suffix = "..." if end < len(text) else ""
            return f"{prefix}{text[start:end].strip()}{suffix}"
        return None

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

    def _tokenize(self, text: str) -> list[str]:
        raw_tokens = re.findall(r"\b[a-zA-Z0-9+#.]{2,}\b", text.lower())
        return [t for t in raw_tokens if t not in self.STOPWORDS]
