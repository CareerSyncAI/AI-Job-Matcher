"""Check evidence parity through the API with both semantic engines."""

from types import SimpleNamespace

import numpy as np
import pytest

from src.api.app import semantic_matcher

SKILL = "FastAPI"


@pytest.fixture
def match_both(client, monkeypatch):
    engine = semantic_matcher.embedding_engine
    model = SimpleNamespace(
        encode=lambda chunks, **kwargs: np.ones((len(chunks), 1), dtype=np.float32)
    )
    monkeypatch.setattr(engine, "_model", model)
    monkeypatch.setattr(engine, "_get_tokenizer", lambda: None)

    def match(profile):
        results = []
        for method, expected_method in (("baseline", "tf_cosine_baseline"), ("embedding", "sentence_embedding")):
            response = client.post("/api/v1/ai/semantic-match", json={
                "method": method,
                "candidate_profile": profile,
                "job_requisition": {
                    "title": "Backend Engineer", "required_skills": [SKILL], "preferred_skills": ["Docker"],
                },
            })
            assert response.status_code == 200
            result = response.json()
            assert result["method"] == expected_method
            assert result["status"] == "ok"
            results.append(result)

        baseline, embedding = results
        for key in ("matched_key_concepts", "missing_or_gap_concepts", "evidence_status", "evidence_breakdown"):
            assert baseline[key] == embedding[key]
        assert [row["category"] for row in baseline["evidence_breakdown"]] == ["required", "preferred"]
        return baseline["evidence_breakdown"]

    return match


@pytest.mark.parametrize(
    ("profile", "status", "verification", "quote"),
    [
        ({"headline": "Built APIs using FastAPI"}, "supported", "demonstrated_context", "Built APIs using FastAPI"),
        ({"experience_summary": "Maintained FastAPI services."}, "supported", "demonstrated_context", "Maintained FastAPI services."),
        ({"sections": {"experience": "Deployed FastAPI services."}}, "supported", "demonstrated_context", "Deployed FastAPI services."),
        ({"sections": {"projects": "Built a FastAPI project."}}, "supported", "demonstrated_context", "Built a FastAPI project."),
        ({"skills": [" FastAPI ", "fastapi"]}, "supported", "declared_skill_token", "Declared skill item: 'FastAPI'"),
        ({"sections": {"projects": "No experience with FastAPI."}}, "not_detected", "explicit_negation", "No experience with FastAPI."),
        ({"skills": [SKILL], "sections": {"experience": "No experience with FastAPI."}},
         "insufficient_information", "conflicting_declaration_and_negation", "No experience with FastAPI."),
        ({"experience_summary": "No experience with FastAPI", "sections": {"projects": "Built APIs using FastAPI."}},
         "insufficient_information", "conflicting_mentions", "Built APIs using FastAPI."),
        ({"experience_summary": "Previously had no experience with FastAPI", "sections": {"projects": "Later built APIs using FastAPI."}},
         "supported", "demonstrated_after_historical_gap", "Later built APIs using FastAPI."),
        ({"sections": {"experience": "The team built APIs using FastAPI."}},
         "insufficient_information", "third_party_experience", "The team built APIs using FastAPI."),
        ({"sections": {"projects": 'Job advert: "Deploy services using FastAPI".'}},
         "insufficient_information", "quoted_mention", 'Job advert: "Deploy services using FastAPI".'),
        ({"sections": {"projects": "Learning FastAPI."}},
         "insufficient_information", "learning_intent", "Learning FastAPI."),
        ({"headline": "Built Python APIs", "sections": {"projects": "FastAPI"}},
         "insufficient_information", "unqualified_mention", "FastAPI"),
        ({"experience_summary": "Built services using FastAPI.", "sections": {"projects": " "}},
         "supported", "demonstrated_context", "Built services using FastAPI."),
        ({"sections": {"experience": "Managed payroll for several regional offices."}}, "not_detected", "unmentioned", None),
        ({}, "insufficient_information", "insufficient_material", None),
    ],
)
def test_evidence_parity(match_both, profile, status, verification, quote):
    required, _ = match_both(profile)
    assert required["requirement"] == SKILL
    assert required["status"] == status
    assert required["verification_type"] == verification
    assert required["evidence_quote"] == quote
    assert required["is_confirmed_gap"] is False


def test_duplicate_profile_text_does_not_turn_sparse_evidence_into_absence(match_both):
    original = match_both({"headline": "Built FastAPI"})
    duplicated = match_both({
        "headline": "Built FastAPI",
        "experience_summary": "Built FastAPI",
        "sections": {"experience": "Built FastAPI", "projects": "BUILT  FASTAPI"},
    })
    assert duplicated == original
    assert duplicated[1]["verification_type"] == "insufficient_material"
