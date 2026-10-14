from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.services.evaluation import EvaluationService
from app.services.semantic_matcher import AIServiceDiagnosticMatcher, SublinearTFCosineMatcher


class _Response:
    def __init__(self, payload: object) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> object:
        return self.payload


class _Client:
    def __init__(self, response: _Response | None = None, error: Exception | None = None, **_: object) -> None:
        self.response = response
        self.error = error

    def __enter__(self) -> _Client:
        return self

    def __exit__(self, *_: object) -> None:
        return None

    def post(self, *_: object, **__: object) -> _Response:
        if self.error:
            raise self.error
        assert self.response is not None
        return self.response


def _service_payload(*, status: str = "ok") -> dict[str, object]:
    return {
        "semantic_similarity_score": 73.0,
        "raw_similarity": 0.73,
        "similarity_index": 73.0,
        "method": "sentence_embedding" if status == "ok" else "fallback",
        "status": status,
        "fallback_reason": "model unavailable" if status == "fallback" else None,
        "model_info": {
            "model_id": "sentence-transformers/all-MiniLM-L6-v2",
            "model_revision": "1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
        },
        "diagnostics": {"chunks_processed": 2, "truncated": False},
    }


def _matcher(factory):
    return AIServiceDiagnosticMatcher(
        base_url="http://ai-service.test",
        api_key="test-key",
        client_factory=factory,
    )


def test_embedding_diagnostic_response_preserves_baseline_score():
    matcher = _matcher(lambda **kwargs: _Client(response=_Response(_service_payload()), **kwargs))
    baseline = SublinearTFCosineMatcher().match(
        candidate_text="Python FastAPI Docker", job_text="Python FastAPI cloud", job_skills=["Python", "FastAPI"]
    )

    result = matcher.match(
        candidate_text="Python FastAPI Docker",
        job_text="Python FastAPI cloud",
        job_skills=["Python", "FastAPI"],
    )

    assert result.similarity_score == baseline.similarity_score
    assert result.diagnostics["ai_service"]["status"] == "ok"
    assert result.diagnostics["ai_service"]["raw_similarity"] == 0.73
    assert result.diagnostics["ai_service"]["used_for_ranking"] is False


def test_ai_service_fallback_is_visible_without_changing_score():
    matcher = _matcher(lambda **kwargs: _Client(response=_Response(_service_payload(status="fallback")), **kwargs))
    result = matcher.match(candidate_text="Python", job_text="Python", job_skills=["Python"])

    assert result.diagnostics["ai_service"]["status"] == "fallback"
    assert result.diagnostics["ai_service"]["fallback_reason"] == "model unavailable"
    assert result.diagnostics["ai_service"]["used_for_ranking"] is False


def test_ai_service_failure_and_malformed_response_are_explicit():
    unavailable = _matcher(lambda **kwargs: _Client(error=httpx.ConnectError("offline"), **kwargs))
    unavailable_result = unavailable.match(candidate_text="Python", job_text="Python")
    assert unavailable_result.diagnostics["ai_service"]["status"] == "error"
    assert unavailable_result.diagnostics["ai_service"]["reason"] == "ConnectError"

    malformed = _matcher(lambda **kwargs: _Client(response=_Response({"status": "ok"}), **kwargs))
    malformed_result = malformed.match(candidate_text="Python", job_text="Python")
    assert malformed_result.diagnostics["ai_service"]["status"] == "error"
    assert malformed_result.diagnostics["ai_service"]["reason"] == "ValueError"


def test_ai_service_is_not_called_for_empty_input():
    def fail_if_called(**kwargs):
        raise AssertionError("Empty text must not invoke the AI service")

    result = _matcher(fail_if_called).match(candidate_text="", job_text="Python")
    assert result.diagnostics["ai_service"] == {
        "requested_method": "embedding",
        "status": "not_requested",
        "reason": "empty_input",
    }


def test_backend_uses_baseline_by_default_and_opt_in_diagnostic_matcher(monkeypatch):
    monkeypatch.delenv("CAREERSYNC_SEMANTIC_MATCHER", raising=False)
    get_settings.cache_clear()
    assert isinstance(EvaluationService().engine.semantic_matcher, SublinearTFCosineMatcher)

    monkeypatch.setenv("CAREERSYNC_SEMANTIC_MATCHER", "embedding")
    get_settings.cache_clear()
    assert isinstance(EvaluationService().engine.semantic_matcher, AIServiceDiagnosticMatcher)
    get_settings.cache_clear()
