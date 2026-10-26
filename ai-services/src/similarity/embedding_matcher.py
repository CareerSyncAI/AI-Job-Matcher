"""Pretrained Sentence Embedding Matcher for CareerSync AI.

Uses sentence-transformers/all-MiniLM-L6-v2 with:
- Tokenizer-aware sliding window chunking with configurable overlap (default 40 tokens)
- Section boundary preservation ([Headline], [Skills], [Experience], etc.)
- Elimination of silent 3-chunk limits (full-document coverage with safety ceiling)
- Thread-safe lazy singleton loading for model and tokenizer
- Configurable cache, device, and revision
- Safe fallback to BaselineSemanticMatcher when disabled or unavailable
- Preserved v1.1.0 contract: clamped `raw_similarity` in [0.0, 1.0] for backend compatibility
- Explicit disclosure of unconstrained `unclamped_raw_cosine` in diagnostics [-1.0, 1.0]
- Three-way evidence status semantics: supported, not_detected, insufficient_information
- Verbatim quote extraction directly from source text without optimistic claims
- Explicit diagnostics for identified chunks, processed chunks, coverage ratio, and omitted sections
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from typing import Any

import numpy as np

from src.similarity.base import BaseSimilarityEngine, SemanticMatchOutput
from src.similarity.baseline_matcher import BaselineSemanticMatcher

logger = logging.getLogger("careersync.similarity.embedding")


class SentenceEmbeddingMatcher(BaseSimilarityEngine):
    """Computes semantic similarity using local sentence-transformers embeddings."""

    DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
    DEFAULT_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
    DEFAULT_DIMENSIONS = 384

    # Tokenizer-aware parameters:
    # MiniLM-L6-v2 context limit is 256 wordpiece tokens.
    # 180 tokens per chunk leaves a safe 76-token margin for special tokens ([CLS], [SEP]),
    # section prefixes ([Job Requisition], [Profile Header]), and model-specific framing without silent truncation.
    MAX_TOKENS_PER_CHUNK = 200
    OVERLAP_TOKENS = 40
    MAX_CHUNKS_PER_DOC = 64  # Generous safety ceiling (~12,800 tokens / 50 pages) to prevent DoS
    MAX_CHARS_PER_CHUNK = 500  # Retained as legacy alias for backwards compatibility

    def __init__(
        self,
        model_id: str | None = None,
        model_revision: str | None = None,
        cache_dir: str | None = None,
        device: str | None = None,
        fallback_enabled: bool | None = None,
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
        self._tokenizer = None
        self._load_lock = threading.Lock()
        self._tokenizer_lock = threading.Lock()
        self._load_failed = False
        self._load_error_msg: str | None = None
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

                kwargs: dict[str, Any] = {"device": self.device}
                if self.cache_dir:
                    kwargs["cache_folder"] = self.cache_dir
                if self.model_revision:
                    kwargs["revision"] = self.model_revision

                model = SentenceTransformer(self.model_id, **kwargs)
                dim = getattr(model, "get_embedding_dimension", lambda: self.DEFAULT_DIMENSIONS)()
                self.vector_dimensions = int(dim)
                self._model = model

                # Cache tokenizer from model if present
                if hasattr(model, "tokenizer") and model.tokenizer is not None:
                    self._tokenizer = model.tokenizer
                    try:
                        self._tokenizer.model_max_length = 100_000
                    except Exception:
                        pass

                logger.info(f"Model '{self.model_id}' loaded successfully. Vector dim: {self.vector_dimensions}")
                return self._model
            except Exception as exc:
                self._load_failed = True
                self._load_error_msg = f"{type(exc).__name__}: {exc!s}"
                logger.error(f"Failed to load embedding model '{self.model_id}': {self._load_error_msg}")
                raise RuntimeError(self._load_error_msg) from exc

    def _get_tokenizer(self) -> Any:
        """Retrieve tokenizer: from loaded model, from transformers cache, or fallback."""
        if self._tokenizer is not None:
            return self._tokenizer

        if self._model is not None and hasattr(self._model, "tokenizer") and self._model.tokenizer is not None:
            self._tokenizer = self._model.tokenizer
            try:
                self._tokenizer.model_max_length = 100_000
            except Exception:
                pass
            return self._tokenizer

        with self._tokenizer_lock:
            if self._tokenizer is not None:
                return self._tokenizer

            try:
                from transformers import AutoTokenizer
                kwargs: dict[str, Any] = {}
                if self.cache_dir:
                    kwargs["cache_dir"] = self.cache_dir
                if self.model_revision:
                    kwargs["revision"] = self.model_revision
                tok = AutoTokenizer.from_pretrained(self.model_id, **kwargs)
                try:
                    tok.model_max_length = 100_000
                except Exception:
                    pass
                self._tokenizer = tok
                return self._tokenizer
            except Exception as exc:
                logger.warning(f"Could not load Hugging Face tokenizer for '{self.model_id}': {exc}. Using whitespace fallback.")
                return None

    def match(
        self,
        candidate_profile: dict[str, Any],
        job_requisition: dict[str, Any]
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
            # 1. Prepare structured, tokenizer-aware chunks with diagnostic records
            cand_meta = self._chunk_candidate_profile_detailed(candidate_profile)
            job_meta = self._chunk_job_requisition_detailed(job_requisition)

            cand_chunks = cand_meta["chunks"]
            job_chunks = job_meta["chunks"]
            cand_tokens = cand_meta["total_tokens"]
            job_tokens = job_meta["total_tokens"]
            cand_truncated = cand_meta["truncated"]
            job_truncated = job_meta["truncated"]

            # Edge case: empty input from candidate or job
            if not cand_chunks or not job_chunks:
                duration_ms = (time.perf_counter() - start_time) * 1000
                req_skills = job_requisition.get("required_skills", []) or []
                pref_skills = job_requisition.get("preferred_skills", []) or []
                all_skills = req_skills + pref_skills

                return SemanticMatchOutput(
                    raw_similarity=0.0,
                    similarity_index=0.0,
                    semantic_similarity_score=0.0,
                    alignment_grade="Low",
                    method=self.method_name,
                    status="ok",
                    fallback_reason=None,
                    matched_key_concepts=[],
                    missing_or_gap_concepts=all_skills[:5],
                    evidence_status={
                        "supported": [],
                        "not_detected": [],
                        "insufficient_information": all_skills,
                    },
                    evidence_breakdown=[
                        {
                            "requirement": s,
                            "category": "required" if s in req_skills else "preferred",
                            "status": "insufficient_information",
                            "evidence_quote": None,
                            "verification_type": "insufficient_material",
                            "is_confirmed_gap": False,
                            "note": "Document lacks sufficient readable content for evaluation."
                        }
                        for s in all_skills
                    ],
                    model_info={
                        "engine": self.model_id,
                        "model_id": self.model_id,
                        "model_revision": self.model_revision,
                        "vector_dimensions": self.vector_dimensions,
                        "device": self.device,
                        "offline_compatible": True
                    },
                    diagnostics={
                        "unclamped_raw_cosine": 0.0,
                        "raw_cosine_clamped": 0.0,
                        "raw_similarity_definition": "Clamped cosine similarity [0.0, 1.0] for v1.1.0 contract compatibility.",
                        "unclamped_cosine_definition": "Unbounded mathematical cosine similarity in [-1.0, 1.0].",
                        "similarity_index_definition": "Calibrated 0-100 alignment index for recruiter UI presentation; not a hiring probability.",
                        "candidate_tokens_total": cand_tokens,
                        "job_tokens_total": job_tokens,
                        "candidate_chunks_identified": cand_meta["total_identified"],
                        "candidate_chunks_processed": cand_meta["processed_count"],
                        "job_chunks_identified": job_meta["total_identified"],
                        "job_chunks_processed": job_meta["processed_count"],
                        "candidate_chunks_count": cand_meta["processed_count"],
                        "job_chunks_count": job_meta["processed_count"],
                        "chunks_processed": 0,
                        "truncated": False,
                        "coverage_ratio": 1.0,
                        "omitted_sections": [],
                        "latency_ms": round(duration_ms, 2)
                    }
                )

            # 2. Encode all chunks via SentenceTransformer (in memory)
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
            # sim_matrix shape: (len(cand_chunks), len(job_chunks))
            sim_matrix = np.dot(cand_embeddings, job_embeddings.T)

            # Pooled cross-chunk alignment:
            # - max_sim_cand_to_job: for every job chunk, what is the best matching resume chunk? (60% weight)
            # - max_sim_job_to_cand: for every candidate chunk, what is the best matching job chunk? (40% weight)
            max_sim_cand_to_job = float(np.mean(np.max(sim_matrix, axis=0)))
            max_sim_job_to_cand = float(np.mean(np.max(sim_matrix, axis=1)))
            pooled_sim = 0.6 * max_sim_cand_to_job + 0.4 * max_sim_job_to_cand

            # Unclamped true mathematical cosine similarity [-1.0, 1.0]
            unclamped_raw_cosine = float(pooled_sim)

            # Strictly clamp raw cosine between 0.0 and 1.0 for v1.1.0 backend validator contract
            raw_sim = round(float(max(0.0, min(1.0, pooled_sim))), 4)

            # Normalized presentation index [0.0 - 100.0] for UI display
            similarity_index = round(raw_sim * 100.0, 1)

            # Determine alignment grade based on dense embedding distribution
            if raw_sim >= 0.70:
                grade = "High"
            elif raw_sim >= 0.45:
                grade = "Moderate"
            else:
                grade = "Low"

            # 4. Extract verifiable concepts with 3-way evidence status and authentic verbatim quotes
            cand_skills = candidate_profile.get("skills", []) or []
            cand_headline = candidate_profile.get("headline", "") or ""
            cand_summary = candidate_profile.get("experience_summary", "") or ""
            sections = candidate_profile.get("sections") or {}
            all_cand_section_text = " ".join(sections.values()) if isinstance(sections, dict) else ""
            full_cand_text = f"{cand_headline} {' '.join(cand_skills)} {cand_summary} {all_cand_section_text}".lower()
            cand_skills_set = set(s.lower() for s in cand_skills)

            job_req_skills = job_requisition.get("required_skills", []) or []
            job_pref_skills = job_requisition.get("preferred_skills", []) or []

            matched_concepts: list[str] = []
            missing_concepts: list[str] = []
            evidence_breakdown: list[dict[str, Any]] = []

            has_substantive_text = len(full_cand_text.strip()) >= 20
            all_req_skills_categorized = (
                [("required", s) for s in job_req_skills] +
                [("preferred", s) for s in job_pref_skills]
            )

            for category, s in all_req_skills_categorized:
                s_lower = s.lower()
                if s_lower in cand_skills_set or s_lower in full_cand_text:
                    matched_concepts.append(s)
                    # Extract authentic verbatim text quote from candidate materials
                    raw_quote = (
                        self._find_verbatim_quote(s, cand_summary) or
                        self._find_verbatim_quote(s, all_cand_section_text) or
                        self._find_verbatim_quote(s, cand_headline)
                    )
                    evidence_breakdown.append({
                        "requirement": s,
                        "category": category,
                        "status": "supported",
                        "evidence_quote": raw_quote or f"Declared skill item: '{s}'",
                        "verification_type": "verbatim_text_quote" if raw_quote else "declared_skill_token",
                        "is_confirmed_gap": False,
                        "note": "Direct mention verified in candidate source text. Profoundness/seniority requires recruiter review.",
                    })
                elif not has_substantive_text:
                    missing_concepts.append(s)
                    evidence_breakdown.append({
                        "requirement": s,
                        "category": category,
                        "status": "insufficient_information",
                        "evidence_quote": None,
                        "verification_type": "insufficient_material",
                        "is_confirmed_gap": False,
                        "note": "Candidate profile contains insufficient text to evaluate requirement.",
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
                        "note": "Not detected in candidate profile. Absence of mention is not proof of candidate deficiency.",
                    })

            evidence_status = {
                "supported": [e["requirement"] for e in evidence_breakdown if e["status"] == "supported"],
                "not_detected": [e["requirement"] for e in evidence_breakdown if e["status"] == "not_detected"],
                "insufficient_information": [e["requirement"] for e in evidence_breakdown if e["status"] == "insufficient_information"],
            }

            duration_ms = (time.perf_counter() - start_time) * 1000

            total_chunks = len(cand_chunks) + len(job_chunks)
            # Mathematically sound coverage ratio (never claims 1.0 if any chunk was discarded)
            if cand_truncated:
                effective_coverage = cand_meta["coverage_ratio"]
            elif job_truncated:
                effective_coverage = job_meta["coverage_ratio"]
            else:
                effective_coverage = 1.0

            omitted = cand_meta["omitted_sections"] + job_meta["omitted_sections"]

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
                    "engine": self.model_id,
                    "model_id": self.model_id,
                    "model_revision": self.model_revision,
                    "vector_dimensions": self.vector_dimensions,
                    "device": self.device,
                    "offline_compatible": True
                },
                diagnostics={
                    "unclamped_raw_cosine": round(unclamped_raw_cosine, 4),
                    "raw_cosine_clamped": round(raw_sim, 4),
                    "raw_similarity_definition": "Clamped cosine similarity [0.0, 1.0] for v1.1.0 contract compatibility.",
                    "unclamped_cosine_definition": "Unbounded mathematical cosine similarity in [-1.0, 1.0]. Negative values indicate opposing vectors.",
                    "similarity_index_definition": "Calibrated 0-100 alignment index for recruiter UI presentation; not a hiring probability.",
                    "candidate_tokens_total": cand_tokens,
                    "job_tokens_total": job_tokens,
                    "candidate_chunks_identified": cand_meta["total_identified"],
                    "candidate_chunks_processed": cand_meta["processed_count"],
                    "job_chunks_identified": job_meta["total_identified"],
                    "job_chunks_processed": job_meta["processed_count"],
                    "candidate_chunks_count": cand_meta["processed_count"],
                    "job_chunks_count": job_meta["processed_count"],
                    "chunks_processed": total_chunks,
                    "truncated": cand_truncated or job_truncated,
                    "coverage_ratio": effective_coverage,
                    "omitted_sections": omitted,
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

    def _chunk_candidate_profile_detailed(self, profile: dict[str, Any]) -> dict[str, Any]:
        """Produce structured, tokenizer-aware chunks with complete diagnostic metadata."""
        headline = (profile.get("headline", "") or "").strip()
        skills = profile.get("skills", []) or []
        summary = (profile.get("experience_summary", "") or "").strip()
        sections_dict = profile.get("sections") if isinstance(profile.get("sections"), dict) else {}

        chunk_records: list[tuple[str, str]] = []  # (chunk_text, section_name)
        total_tokens = 0

        # Chunk 1: Header / Identity & Key Skills
        header_parts = []
        if headline:
            header_parts.append(f"Headline: {headline}")
        if skills:
            header_parts.append(f"Key Skills: {', '.join(skills)}")
        header_text = ". ".join(header_parts).strip()
        if header_text:
            h_chunks, h_tokens = self._chunk_text_by_tokens(header_text, prefix="[Profile Header]")
            for c in h_chunks:
                chunk_records.append((c, "header"))
            total_tokens += h_tokens

        # Chunk 2+: Sections (if provided as structured sections)
        if sections_dict:
            for sec_name, sec_content in sections_dict.items():
                if not sec_content or not isinstance(sec_content, str):
                    continue
                content_clean = sec_content.strip()
                if not content_clean:
                    continue
                sec_chunks, sec_tokens = self._chunk_text_by_tokens(
                    content_clean, prefix=f"[{sec_name.title()}]"
                )
                for c in sec_chunks:
                    chunk_records.append((c, sec_name))
                total_tokens += sec_tokens
        elif summary:
            # Fallback to experience_summary
            sum_chunks, sum_tokens = self._chunk_text_by_tokens(
                summary, prefix="[Experience Summary]"
            )
            for c in sum_chunks:
                chunk_records.append((c, "experience_summary"))
            total_tokens += sum_tokens

        total_identified = len(chunk_records)
        if total_identified > self.MAX_CHUNKS_PER_DOC:
            processed_records = chunk_records[:self.MAX_CHUNKS_PER_DOC]
            discarded_records = chunk_records[self.MAX_CHUNKS_PER_DOC:]
            truncated = True
            omitted_sections = sorted(list(set(sec for _, sec in discarded_records)))
            coverage_ratio = round(len(processed_records) / max(1, total_identified), 4)
        else:
            processed_records = chunk_records
            truncated = False
            omitted_sections = []
            coverage_ratio = 1.0

        chunks = [c for c, _ in processed_records]
        return {
            "chunks": chunks,
            "truncated": truncated,
            "total_tokens": total_tokens,
            "total_identified": total_identified,
            "processed_count": len(chunks),
            "coverage_ratio": coverage_ratio,
            "omitted_sections": omitted_sections,
        }

    def _chunk_candidate_profile(self, profile: dict[str, Any]) -> tuple[list[str], bool, int]:
        """Backward-compatible tuple interface (chunks, truncated, total_tokens)."""
        res = self._chunk_candidate_profile_detailed(profile)
        return res["chunks"], res["truncated"], res["total_tokens"]

    def _chunk_job_requisition_detailed(self, requisition: dict[str, Any]) -> dict[str, Any]:
        """Produce structured, tokenizer-aware chunks for job requisition with metadata."""
        title = (requisition.get("title", "") or "").strip()
        req_skills = requisition.get("required_skills", []) or []
        pref_skills = requisition.get("preferred_skills", []) or []
        desc = (requisition.get("description", "") or "").strip()

        chunk_records: list[tuple[str, str]] = []
        total_tokens = 0

        # Header Chunk: Role and Required/Preferred Skills
        header_parts = []
        if title:
            header_parts.append(f"Job Title: {title}")
        if req_skills:
            header_parts.append(f"Required Skills: {', '.join(req_skills)}")
        if pref_skills:
            header_parts.append(f"Preferred Skills: {', '.join(pref_skills)}")

        header_text = ". ".join(header_parts).strip()
        if header_text:
            h_chunks, h_tokens = self._chunk_text_by_tokens(header_text, prefix="[Job Requisition]")
            for c in h_chunks:
                chunk_records.append((c, "header"))
            total_tokens += h_tokens

        # Description Chunks
        if desc:
            d_chunks, d_tokens = self._chunk_text_by_tokens(desc, prefix="[Job Description]")
            for c in d_chunks:
                chunk_records.append((c, "description"))
            total_tokens += d_tokens

        total_identified = len(chunk_records)
        if total_identified > self.MAX_CHUNKS_PER_DOC:
            processed_records = chunk_records[:self.MAX_CHUNKS_PER_DOC]
            discarded_records = chunk_records[self.MAX_CHUNKS_PER_DOC:]
            truncated = True
            omitted_sections = sorted(list(set(sec for _, sec in discarded_records)))
            coverage_ratio = round(len(processed_records) / max(1, total_identified), 4)
        else:
            processed_records = chunk_records
            truncated = False
            omitted_sections = []
            coverage_ratio = 1.0

        chunks = [c for c, _ in processed_records]
        return {
            "chunks": chunks,
            "truncated": truncated,
            "total_tokens": total_tokens,
            "total_identified": total_identified,
            "processed_count": len(chunks),
            "coverage_ratio": coverage_ratio,
            "omitted_sections": omitted_sections,
        }

    def _chunk_job_requisition(self, requisition: dict[str, Any]) -> tuple[list[str], bool, int]:
        """Backward-compatible tuple interface (chunks, truncated, total_tokens)."""
        res = self._chunk_job_requisition_detailed(requisition)
        return res["chunks"], res["truncated"], res["total_tokens"]

    def _chunk_text_by_tokens(
        self,
        text: str,
        prefix: str = "",
        max_tokens: int | None = None,
        overlap_tokens: int | None = None
    ) -> tuple[list[str], int]:
        """Sliding-window tokenizer-aware chunking preserving section context."""
        text = text.strip()
        if not text:
            return [], 0

        max_tok = max_tokens or self.MAX_TOKENS_PER_CHUNK
        overlap = overlap_tokens or self.OVERLAP_TOKENS
        step = max(1, max_tok - overlap)

        tokenizer = self._get_tokenizer()

        # Tokenizer path (Hugging Face BertTokenizer / AutoTokenizer)
        if tokenizer is not None and hasattr(tokenizer, "encode") and hasattr(tokenizer, "decode"):
            try:
                token_ids: list[int] = tokenizer.encode(text, add_special_tokens=False)
                total_tokens = len(token_ids)

                if total_tokens <= max_tok:
                    chunk_body = tokenizer.decode(token_ids, skip_special_tokens=True).strip()
                    full_chunk = f"{prefix} {chunk_body}".strip() if prefix else chunk_body
                    return [full_chunk], total_tokens

                chunks = []
                start = 0
                while start < total_tokens:
                    end = min(start + max_tok, total_tokens)
                    window_ids = token_ids[start:end]
                    chunk_body = tokenizer.decode(window_ids, skip_special_tokens=True).strip()
                    if chunk_body:
                        full_chunk = f"{prefix} {chunk_body}".strip() if prefix else chunk_body
                        chunks.append(full_chunk)
                    if end >= total_tokens:
                        break
                    start += step

                return chunks, total_tokens
            except Exception as exc:
                logger.warning(f"Tokenizer encoding error ({exc}). Falling back to word windowing.")

        # Fallback path: Whitespace token approximation
        words = text.split()
        total_tokens = int(len(words) * 1.3)  # Standard ~1.3 subword tokens per word heuristic
        words_per_chunk = max(1, int(max_tok / 1.3))
        words_overlap = max(1, int(overlap / 1.3))
        step_words = max(1, words_per_chunk - words_overlap)

        if len(words) <= words_per_chunk:
            full_chunk = f"{prefix} {text}".strip() if prefix else text
            return [full_chunk], total_tokens

        chunks = []
        start_w = 0
        while start_w < len(words):
            end_w = min(start_w + words_per_chunk, len(words))
            chunk_body = " ".join(words[start_w:end_w]).strip()
            if chunk_body:
                full_chunk = f"{prefix} {chunk_body}".strip() if prefix else chunk_body
                chunks.append(full_chunk)
            if end_w >= len(words):
                break
            start_w += step_words

        return chunks, total_tokens
