"""Pretrained Sentence Embedding Matcher for CareerSync AI.

Uses sentence-transformers/all-MiniLM-L6-v2 with:
- Bounded section chunking (avoiding silent token truncation beyond 256 wordpieces)
- Thread-safe lazy singleton loading
- Configurable cache, device, and revision
- Safe fallback to BaselineSemanticMatcher when disabled or unavailable
- Transparent reporting of model_id, revision, diagnostics, and raw similarity
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from src.similarity.base import BaseSimilarityEngine, SemanticMatchOutput
from src.similarity.baseline_matcher import BaselineSemanticMatcher

logger = logging.getLogger("careersync.similarity.embedding")


class SentenceEmbeddingMatcher(BaseSimilarityEngine):
    """Computes semantic similarity using local sentence-transformers embeddings."""

    DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
    DEFAULT_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
    DEFAULT_DIMENSIONS = 384
    MAX_CHARS_PER_CHUNK = 500  # Safe boundary for MiniLM-L6-v2 256 wordpiece window

    def __init__(
        self,
        model_id: Optional[str] = None,
        model_revision: Optional[str] = None,
        cache_dir: Optional[str] = None,
        device: Optional[str] = None,
        fallback_enabled: Optional[bool] = None,
        lazy_load: bool = True
    ) -> None:
        self.model_id = model_id or os.getenv("EMBEDDING_MODEL_ID", self.DEFAULT_MODEL_ID)
        self.model_revision = model_revision or os.getenv("EMBEDDING_MODEL_REVISION", self.DEFAULT_REVISION)
        self.cache_dir = cache_dir or os.getenv("EMBEDDING_CACHE_DIR")
        self.device = (device or os.getenv("EMBEDDING_DEVICE", "cpu")).lower()

        env_fallback = os.getenv("EMBEDDING_FALLBACK_ENABLED", "true").lower() in ("true", "1", "yes")
        self.fallback_enabled = env_fallback if fallback_enabled is None else fallback_enabled

        self.vector_dimensions = self.DEFAULT_DIMENSIONS
        self.method_name = "sentence_embedding"

        self._model = None
        self._load_lock = threading.Lock()
        self._load_failed = False
        self._load_error_msg: Optional[str] = None
        self._baseline_fallback = BaselineSemanticMatcher()

        if not lazy_load:
            self._ensure_model_loaded()

    def is_model_loaded(self) -> bool:
        """Check whether embedding weights are initialized in memory."""
        return self._model is not None

    def _ensure_model_loaded(self) -> Any:
        """Thread-safe lazy initialization of SentenceTransformer."""
        if self._model is not None:
            return self._model

        if self._load_failed:
            raise RuntimeError(f"Embedding model initialization previously failed: {self._load_error_msg}")

        with self._load_lock:
            if self._model is not None:
                return self._model

            try:
                logger.info(f"Loading embedding model '{self.model_id}' (revision: {self.model_revision}) on {self.device}...")
                from sentence_transformers import SentenceTransformer

                kwargs: Dict[str, Any] = {"device": self.device}
                if self.cache_dir:
                    kwargs["cache_folder"] = self.cache_dir
                if self.model_revision:
                    kwargs["revision"] = self.model_revision

                model = SentenceTransformer(self.model_id, **kwargs)
                dim = getattr(model, "get_embedding_dimension", lambda: self.DEFAULT_DIMENSIONS)()
                self.vector_dimensions = int(dim)
                self._model = model
                logger.info(f"Model '{self.model_id}' loaded successfully. Vector dim: {self.vector_dimensions}")
                return self._model
            except Exception as exc:
                self._load_failed = True
                self._load_error_msg = f"{type(exc).__name__}: {str(exc)}"
                logger.error(f"Failed to load embedding model '{self.model_id}': {self._load_error_msg}")
                raise RuntimeError(self._load_error_msg) from exc

    def match(
        self,
        candidate_profile: Dict[str, Any],
        job_requisition: Dict[str, Any]
    ) -> SemanticMatchOutput:
        start_time = time.perf_counter()

        # Try to load and run embedding model
        try:
            model = self._ensure_model_loaded()
        except Exception as exc:
            if self.fallback_enabled:
                logger.warning(f"Embedding matcher unavailable ({exc}). Using deterministic baseline fallback.")
                fallback_output = self._baseline_fallback.match(candidate_profile, job_requisition)
                fallback_output.method = "fallback"
                fallback_output.status = "fallback"
                fallback_output.fallback_reason = str(exc)
                return fallback_output
            raise

        try:
            # 1. Prepare structured, bounded text chunks
            cand_chunks, cand_truncated, cand_chars = self._chunk_candidate_profile(candidate_profile)
            job_chunks, job_truncated, job_chars = self._chunk_job_requisition(job_requisition)

            if not cand_chunks or not job_chunks:
                # Handle edge cases of empty input
                duration_ms = (time.perf_counter() - start_time) * 1000
                return SemanticMatchOutput(
                    raw_similarity=0.0,
                    similarity_index=0.0,
                    semantic_similarity_score=0.0,
                    alignment_grade="Low",
                    method=self.method_name,
                    status="ok",
                    fallback_reason=None,
                    matched_key_concepts=[],
                    missing_or_gap_concepts=job_requisition.get("required_skills", [])[:5],
                    model_info={
                        "engine": self.model_id,
                        "model_id": self.model_id,
                        "model_revision": self.model_revision,
                        "vector_dimensions": self.vector_dimensions,
                        "device": self.device,
                        "offline_compatible": True
                    },
                    diagnostics={
                        "candidate_char_count": cand_chars,
                        "job_char_count": job_chars,
                        "candidate_chunks_count": len(cand_chunks),
                        "job_chunks_count": len(job_chunks),
                        "chunks_processed": 0,
                        "truncated": False,
                        "latency_ms": round(duration_ms, 2)
                    }
                )

            # 2. Encode chunks via SentenceTransformer
            cand_embeddings = model.encode(
                cand_chunks,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False
            )
            job_embeddings = model.encode(
                job_chunks,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False
            )

            # 3. Compute cosine similarity between normalized embeddings
            # Matrix of shape (len(cand_chunks), len(job_chunks))
            sim_matrix = np.dot(cand_embeddings, job_embeddings.T)

            # Max-pooled cross-chunk alignment + mean background score
            # Primary signal: best alignment of candidate skills/experience to job chunks
            max_sim_cand_to_job = float(np.mean(np.max(sim_matrix, axis=0)))
            max_sim_job_to_cand = float(np.mean(np.max(sim_matrix, axis=1)))
            pooled_sim = 0.6 * max_sim_cand_to_job + 0.4 * max_sim_job_to_cand

            # Strictly clamp raw cosine between 0.0 and 1.0
            raw_sim = float(max(0.0, min(1.0, pooled_sim)))

            # Normalized presentation index [0.0 - 100.0] for UI display
            # Note: This is a normalized alignment index, NOT a hiring probability.
            similarity_index = round(raw_sim * 100.0, 1)

            # Determine alignment grade based on embedding calibration
            # Dense sentence embeddings typically cluster:
            # >= 0.70: High semantic alignment
            # >= 0.45: Moderate alignment
            # <  0.45: Low alignment
            if raw_sim >= 0.70:
                grade = "High"
            elif raw_sim >= 0.45:
                grade = "Moderate"
            else:
                grade = "Low"

            # 4. Extract verifiable concepts (strictly from evidence, no hallucinations)
            cand_skills = candidate_profile.get("skills", []) or []
            cand_headline = candidate_profile.get("headline", "") or ""
            cand_summary = candidate_profile.get("experience_summary", "") or ""
            full_cand_text = f"{cand_headline} {' '.join(cand_skills)} {cand_summary}".lower()
            cand_skills_set = set(s.lower() for s in cand_skills)

            job_req_skills = job_requisition.get("required_skills", []) or []
            job_pref_skills = job_requisition.get("preferred_skills", []) or []
            all_job_skills = job_req_skills + job_pref_skills

            matched_concepts: List[str] = []
            missing_concepts: List[str] = []
            for s in all_job_skills:
                if s.lower() in cand_skills_set or s.lower() in full_cand_text:
                    matched_concepts.append(s)
                else:
                    missing_concepts.append(s)

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
                    "engine": self.model_id,
                    "model_id": self.model_id,
                    "model_revision": self.model_revision,
                    "vector_dimensions": self.vector_dimensions,
                    "device": self.device,
                    "offline_compatible": True
                },
                diagnostics={
                    "candidate_char_count": cand_chars,
                    "job_char_count": job_chars,
                    "candidate_chunks_count": len(cand_chunks),
                    "job_chunks_count": len(job_chunks),
                    "chunks_processed": len(cand_chunks) + len(job_chunks),
                    "truncated": cand_truncated or job_truncated,
                    "latency_ms": round(duration_ms, 2)
                }
            )

        except Exception as exc:
            if self.fallback_enabled:
                logger.warning(f"Error during embedding inference ({exc}). Using deterministic baseline fallback.")
                fallback_output = self._baseline_fallback.match(candidate_profile, job_requisition)
                fallback_output.method = "fallback"
                fallback_output.status = "fallback"
                fallback_output.fallback_reason = f"InferenceError: {exc}"
                return fallback_output
            raise

    def _chunk_candidate_profile(self, profile: Dict[str, Any]) -> Tuple[List[str], bool, int]:
        """Produce bounded text chunks for candidate profile."""
        headline = (profile.get("headline", "") or "").strip()
        skills = profile.get("skills", []) or []
        summary = (profile.get("experience_summary", "") or "").strip()

        chunks: List[str] = []
        truncated = False
        total_chars = len(headline) + sum(len(s) for s in skills) + len(summary)

        # Chunk 1: Identity & Key Skills (only if content exists)
        parts = []
        if headline:
            parts.append(f"Headline: {headline}")
        if skills:
            parts.append(f"Skills: {', '.join(skills)}")
        identity_chunk = ". ".join(parts).strip()
        if identity_chunk:
            if len(identity_chunk) > self.MAX_CHARS_PER_CHUNK:
                identity_chunk = identity_chunk[:self.MAX_CHARS_PER_CHUNK]
                truncated = True
            chunks.append(identity_chunk)

        # Chunk 2+: Experience Summary Chunking
        if summary:
            summary_chunks = self._split_text_to_chunks(summary, self.MAX_CHARS_PER_CHUNK)
            if len(summary_chunks) > 3:  # Bound to max 3 experience chunks
                summary_chunks = summary_chunks[:3]
                truncated = True
            chunks.extend(summary_chunks)

        return chunks, truncated, total_chars

    def _chunk_job_requisition(self, requisition: Dict[str, Any]) -> Tuple[List[str], bool, int]:
        """Produce bounded text chunks for job requisition."""
        title = (requisition.get("title", "") or "").strip()
        req_skills = requisition.get("required_skills", []) or []
        pref_skills = requisition.get("preferred_skills", []) or []
        desc = (requisition.get("description", "") or "").strip()

        chunks: List[str] = []
        truncated = False
        total_chars = len(title) + sum(len(s) for s in req_skills + pref_skills) + len(desc)

        # Chunk 1: Role and Target Requirements (only if content exists)
        parts = []
        if title:
            parts.append(f"Job Title: {title}")
        skills_parts = []
        if req_skills:
            skills_parts.append(f"Required: {', '.join(req_skills)}")
        if pref_skills:
            skills_parts.append(f"Preferred: {', '.join(pref_skills)}")
        if skills_parts:
            parts.append(". ".join(skills_parts))
        header_chunk = ". ".join(parts).strip()
        if header_chunk:
            if len(header_chunk) > self.MAX_CHARS_PER_CHUNK:
                header_chunk = header_chunk[:self.MAX_CHARS_PER_CHUNK]
                truncated = True
            chunks.append(header_chunk)

        # Chunk 2+: Job Description Chunking
        if desc:
            desc_chunks = self._split_text_to_chunks(desc, self.MAX_CHARS_PER_CHUNK)
            if len(desc_chunks) > 3:  # Bound to max 3 description chunks
                desc_chunks = desc_chunks[:3]
                truncated = True
            chunks.extend(desc_chunks)

        return chunks, truncated, total_chars

    def _split_text_to_chunks(self, text: str, max_chars: int) -> List[str]:
        """Splits long text into sentence/boundary-aware chunks."""
        text = text.strip()
        if len(text) <= max_chars:
            return [text]

        chunks = []
        paragraphs = text.split("\n")
        current_chunk = ""

        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if len(current_chunk) + len(p) + 1 <= max_chars:
                current_chunk = f"{current_chunk} {p}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # Split large paragraph by sentences or whitespace
                while len(p) > max_chars:
                    # Find last space within max_chars
                    split_idx = p.rfind(" ", 0, max_chars)
                    if split_idx == -1:
                        split_idx = max_chars
                    chunks.append(p[:split_idx].strip())
                    p = p[split_idx:].strip()
                current_chunk = p

        if current_chunk:
            chunks.append(current_chunk)

        return [c for c in chunks if c]
