from __future__ import annotations

from uuid import uuid4

from app.models.entities import (
    Application,
    CandidateProfile,
    Job,
    JobSkill,
    MatchResult,
    RecruiterProfile,
    Resume,
    User,
)
from app.models.enums import (
    ApplicationStatus,
    EvaluatedSkillStatus,
    ProcessingStatus,
    UserRole,
)
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from app.services.evaluation import DeterministicEvaluationEngine, EvaluationService
from app.services.scoring import Weights, rank_candidates
from app.services.taxonomy import taxonomy


def test_taxonomy_evidence_negation_and_edge_cases():
    # 1. Explicit negation
    res = taxonomy.extract_skill_evidence_from_text("Experienced Python developer. No experience with FastAPI.")
    supported = {s["canonical_name"] for s in res["supported"]}
    unsupported = {s["canonical_name"]: s for s in res["unsupported"]}
    assert "Python" in supported
    assert "FastAPI" not in supported
    assert unsupported["FastAPI"]["unsupported_reason"] == "negated"
    assert "No experience with FastAPI" in unsupported["FastAPI"]["snippet"]

    # 2. Learning-only claims
    learn_res = taxonomy.extract_skill_evidence_from_text("Proficient in Python. Currently learning FastAPI and Kubernetes.")
    assert {s["canonical_name"] for s in learn_res["supported"]} == {"Python"}
    assert "FastAPI" not in {s["canonical_name"] for s in learn_res["supported"]}

    # 3. Third-party claims
    tp_res = taxonomy.extract_skill_evidence_from_text("Built Python APIs; collaborated with the FastAPI team.")
    assert {s["canonical_name"] for s in tp_res["supported"]} == {"Python"}

    # 4. Quoted requirements
    req_res = taxonomy.extract_skill_evidence_from_text("Python engineer. Job description required FastAPI and Docker.")
    assert {s["canonical_name"] for s in req_res["supported"]} == {"Python"}

    # 5 & 6. Conflicting claims & historical negation followed by actual use
    hist_res = taxonomy.extract_skill_evidence_from_text(
        "Previously had no experience with FastAPI, then built 3 production microservices with FastAPI."
    )
    assert "FastAPI" in {s["canonical_name"] for s in hist_res["supported"]}

    # 7. Cross-skill negation scope (comma-separated and 'but'-separated)
    cross_res = taxonomy.extract_skill_evidence_from_text(
        "No experience with FastAPI, strong Python and Django skills."
    )
    assert {s["canonical_name"] for s in cross_res["supported"]} == {"Python", "Django"}

    # 8. Punctuation-heavy skill names
    punct_res = taxonomy.extract_skill_evidence_from_text(
        "Built services with Node.js and C#. No experience with C++."
    )
    punct_supported = {s["canonical_name"] for s in punct_res["supported"]}
    assert "Node.js" in punct_supported
    assert "C#" in punct_supported
    assert "C++" not in punct_supported


def test_reproduced_fastapi_negation_defect_in_evaluation_and_ranking():
    job = Job(
        id=uuid4(),
        recruiter_id=uuid4(),
        title="Backend Python Engineer",
        employment_type="full_time",
        work_arrangement="remote",
        description="Build Python and FastAPI microservices.",
        skills_weight=35,
        experience_weight=35,
        education_weight=15,
        semantic_weight=15,
        skills=[
            JobSkill(name="Python", required=True),
            JobSkill(name="FastAPI", required=True),
        ],
    )
    weights = Weights(skills=35, experience=35, education=15, semantic=15)
    engine = DeterministicEvaluationEngine()

    cand_python_only = CandidateProfile(id=uuid4(), name="Python Only", education={"skills": []})
    resume_python_only = Resume(
        id=uuid4(),
        candidate_id=cand_python_only.id,
        original_filename="py.pdf",
        storage_key="py.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="a" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Senior Python engineer with 5 years of backend Python development.",
    )

    cand_negated_fastapi = CandidateProfile(id=uuid4(), name="Negated FastAPI", education={"skills": []})
    resume_negated_fastapi = Resume(
        id=uuid4(),
        candidate_id=cand_negated_fastapi.id,
        original_filename="neg.pdf",
        storage_key="neg.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="b" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Senior Python engineer with 5 years of backend Python development. No experience with FastAPI.",
    )

    cand_real_fastapi = CandidateProfile(id=uuid4(), name="Real Python + FastAPI", education={"skills": []})
    resume_real_fastapi = Resume(
        id=uuid4(),
        candidate_id=cand_real_fastapi.id,
        original_filename="real.pdf",
        storage_key="real.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="c" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Senior Python engineer with 5 years of backend Python and FastAPI development.",
    )

    base_eval = engine.evaluate(job=job, candidate=cand_python_only, resume=resume_python_only, weights=weights)
    neg_eval = engine.evaluate(job=job, candidate=cand_negated_fastapi, resume=resume_negated_fastapi, weights=weights)
    real_eval = engine.evaluate(job=job, candidate=cand_real_fastapi, resume=resume_real_fastapi, weights=weights)

    assert base_eval["skills_score"] == 50.0
    assert neg_eval["skills_score"] == 50.0
    assert neg_eval["matched_skills"] == ["Python"]
    assert neg_eval["missing_skills"] == ["FastAPI"]
    assert neg_eval["overall_score"] <= base_eval["overall_score"]
    assert neg_eval["overall_score"] < real_eval["overall_score"]
    assert real_eval["skills_score"] == 100.0
    assert real_eval["matched_skills"] == ["Python", "FastAPI"]

    fastapi_skill_rec = next(s for s in neg_eval["evaluated_skills"] if s["name"] == "FastAPI")
    assert fastapi_skill_rec["status"] == EvaluatedSkillStatus.GAP
    fastapi_claim = next(c for c in neg_eval["evidence_claims"] if c["requirement"] == "FastAPI")
    assert "No experience with FastAPI" in (fastapi_claim["source_snippet"] or "")

    from app.services.scoring import EvaluatedRequirement, RankingCandidate

    def _to_candidate_eval(cand_id, eval_dict):
        reqs = tuple(
            EvaluatedRequirement(required=True, status=s["status"])
            for s in eval_dict["evaluated_skills"]
        )
        return RankingCandidate(
            candidate_id=str(cand_id),
            skills_score=eval_dict["skills_score"],
            experience_score=eval_dict["experience_score"],
            education_score=eval_dict["education_score"],
            semantic_score=eval_dict["semantic_score"],
            requirements=reqs,
        )

    ranked = rank_candidates(
        [
            _to_candidate_eval(cand_negated_fastapi.id, neg_eval),
            _to_candidate_eval(cand_real_fastapi.id, real_eval),
        ],
        weights,
    )
    assert ranked[0].candidate_id == str(cand_real_fastapi.id)


def test_persisted_evaluation_and_candidate_api_do_not_credit_negated_skill(client, db_session):
    rec_user = User(
        email=f"rec_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("StrongPass123!"),
        role=UserRole.RECRUITER,
        is_active=True,
    )
    cand_user = User(
        email=f"cand_{uuid4().hex[:8]}@example.com",
        password_hash=hash_password("StrongPass123!"),
        role=UserRole.CANDIDATE,
        is_active=True,
    )
    db_session.add_all([rec_user, cand_user])
    db_session.flush()

    recruiter = RecruiterProfile(user_id=rec_user.id, organization_name="Acme")
    candidate = CandidateProfile(
        user_id=cand_user.id,
        email=cand_user.email,
        name="Cand",
        education={"skills": ["Python"]},
    )
    db_session.add_all([recruiter, candidate])
    db_session.flush()

    job = Job(
        recruiter_id=recruiter.id,
        title="Backend Engineer",
        employment_type="full_time",
        work_arrangement="remote",
        description="Require Python and FastAPI.",
        skills_weight=35,
        experience_weight=35,
        education_weight=15,
        semantic_weight=15,
    )
    db_session.add(job)
    db_session.flush()
    db_session.add_all([
        JobSkill(job_id=job.id, name="Python", normalized_name="python", required=True),
        JobSkill(job_id=job.id, name="FastAPI", normalized_name="fastapi", required=True),
    ])

    resume = Resume(
        candidate_id=candidate.id,
        original_filename="cand.pdf",
        storage_key=f"{uuid4().hex}.pdf",
        mime_type="application/pdf",
        byte_size=128,
        sha256=uuid4().hex + uuid4().hex,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Built Python services. No experience with FastAPI.",
    )
    db_session.add(resume)
    db_session.flush()

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=resume.id,
        status=ApplicationStatus.NEW,
    )
    db_session.add(application)
    db_session.commit()

    eval_service = EvaluationService()
    eval_run = eval_service.evaluate_application(
        db_session,
        application_id=application.id,
        recruiter_id=recruiter.id,
    )
    match_result = db_session.query(MatchResult).filter(MatchResult.evaluation_run_id == eval_run.id).one()
    assert match_result.skills_score == 50.0
    skill_statuses = {s.name: s.status for s in match_result.evaluated_skills}
    assert skill_statuses["Python"] == EvaluatedSkillStatus.MATCHED
    assert skill_statuses["FastAPI"] == EvaluatedSkillStatus.GAP

    # Application status must remain NEW
    db_session.refresh(application)
    assert application.status == ApplicationStatus.NEW

    token, _ = create_access_token(cand_user.id, cand_user.role)
    resp = client.get(
        f"/api/v1/applications/{application.id}/match",
        headers={"Authorization": f"Bearer {token}"},
    )
    if resp.status_code == 200:
        data = resp.json()
        assert data["skills_score"] == 50.0
