from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np

from src.similarity.embedding_matcher import (
    SentenceEmbeddingMatcher,
    _BoundedJobEmbeddingCache,
)


class CountingModel:
    def __init__(self, *, delay: float = 0.0) -> None:
        self.calls: list[list[str]] = []
        self.delay = delay

    def encode(self, texts, **kwargs):
        values = list(texts)
        self.calls.append(values)
        if self.delay:
            time.sleep(self.delay)
        return np.asarray(
            [[float(len(text)), float(sum(text.encode("utf-8")) % 997 + 1)] for text in values],
            dtype=np.float32,
        )


def _matcher(model: CountingModel) -> SentenceEmbeddingMatcher:
    matcher = SentenceEmbeddingMatcher(lazy_load=True)
    matcher._model = model
    matcher.vector_dimensions = 2
    return matcher


def test_job_embedding_cache_hits_and_misses():
    model = CountingModel()
    matcher = _matcher(model)

    first = matcher._encode_job_chunks(model, ["[Job] Python API"])
    repeated = matcher._encode_job_chunks(model, ["[Job] Python API"])
    whitespace_variant = matcher._encode_job_chunks(model, ["[Job]  Python API"])
    other_job = matcher._encode_job_chunks(model, ["[Job] Java API"])

    assert len(model.calls) == 3
    np.testing.assert_array_equal(first, repeated)
    assert not np.array_equal(first, whitespace_variant)
    assert not np.array_equal(first, other_job)


def test_job_embedding_cache_is_bounded_lru():
    cache = _BoundedJobEmbeddingCache()
    cache.MAX_ENTRIES = 2
    cache.MAX_BYTES = 4096

    def key(text: str):
        return cache.key("model", "revision", 2, "cpu", text)

    cache.put(key("one"), np.array([1, 0], dtype=np.float32))
    cache.put(key("two"), np.array([0, 1], dtype=np.float32))
    assert cache.get(key("one")) is not None  # Refresh one in the LRU order.
    cache.put(key("three"), np.array([1, 1], dtype=np.float32))

    assert len(cache) == 2
    assert cache.size_bytes <= cache.MAX_BYTES
    assert cache.get(key("two")) is None
    assert cache.get(key("one")) is not None
    assert cache.get(key("three")) is not None


def test_model_identity_is_part_of_job_embedding_cache_key():
    model = CountingModel()
    matcher = _matcher(model)
    text = ["[Job] Python API"]

    original = matcher._encode_job_chunks(model, text)
    matcher.model_revision = "different-revision"
    revised = matcher._encode_job_chunks(model, text)
    matcher.model_id = "another-model"
    matcher._encode_job_chunks(model, text)

    assert len(model.calls) == 3
    np.testing.assert_array_equal(original, revised)


def test_concurrent_job_cache_misses_encode_once_and_return_consistent_vectors():
    model = CountingModel(delay=0.02)
    matcher = _matcher(model)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: matcher._encode_job_chunks(model, ["[Job] shared requisition"]), range(8)))

    assert len(model.calls) == 1
    assert len(matcher._job_embedding_cache) == 1
    for result in results[1:]:
        np.testing.assert_array_equal(results[0], result)


def test_match_keeps_candidate_embeddings_uncached_and_scores_unchanged():
    class MatchModel(CountingModel):
        def get_sentence_embedding_dimension(self):
            return 2

        def encode(self, texts, **kwargs):
            values = list(texts)
            self.calls.append(values)
            rows = []
            for value in values:
                seed = float(sum(value.encode("utf-8")) % 997 + 1)
                rows.append([seed, seed + 1.0])
            vectors = np.asarray(rows, dtype=np.float32)
            return vectors / np.linalg.norm(vectors, axis=1, keepdims=True)

    model = MatchModel()
    matcher = _matcher(model)
    matcher._get_tokenizer = lambda: None
    candidate = {"headline": "Backend Engineer", "skills": ["Python"], "experience_summary": "Builds API services."}
    job = {"title": "Python Engineer", "required_skills": ["Python"], "preferred_skills": [], "description": "Build Python API services."}

    first = matcher.match(candidate, job)
    second = matcher.match({**candidate, "experience_summary": "Writes data pipelines instead."}, job)

    cached_encode_calls = len(model.calls)
    assert cached_encode_calls == 3
    assert model.calls[0] != model.calls[2]  # Resume text is never a cache key/value.

    # Compare the cached outputs with the same inference path bypassing only
    # job-vector reuse; all scores and response behavior must remain identical.
    matcher._encode_job_chunks = lambda active_model, chunks: active_model.encode(
        chunks,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    first_uncached = matcher.match(candidate, job)
    second_uncached = matcher.match({**candidate, "experience_summary": "Writes data pipelines instead."}, job)

    assert first.raw_similarity == first_uncached.raw_similarity
    assert second.raw_similarity == second_uncached.raw_similarity
    # Candidate chunks are encoded for each request; shared job chunks only once.
    assert len(model.calls) == 7
    assert len(matcher._job_embedding_cache) == 2

