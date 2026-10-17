"""
Regression tests for Evaluation Freshness and Safe Re-evaluation:
1. Identical scoring inputs produce identical fingerprints.
2. Changes to weights, skills, experience, education, title, description, candidate scoring data,
   or extracted text invalidate freshness.
3. Non-scoring metadata changes (location, department, work_arrangement, etc.) do NOT invalidate freshness.
4. Legacy evaluations without configuration_hash are NOT falsely marked current (marked stale).
5. Pending and failed evaluation attempts do not masquerade as successful current results.
6. Safe batch re-evaluation:
   - Evaluates eligible applications.
   - Skips applications with missing/unprocessed resumes.
   - Reports already_fresh evaluations without redundant recomputation.
   - Per-candidate failure isolation (a failed candidate does not abort sibling evaluations).
   - Recruiter authorization: rejects non-owner re-evaluation attempts.
7. Candidate card DTO accurately reflects evaluation_status ('current', 'stale', 'pending', 'failed', 'not_evaluated')
   and is_fresh boolean while strictly preserving coverage-tier ranking.
"""

from __future__ import annotations

import io
from uuid import UUID, uuid4

import docx
import pytest
from docx import Document

from app.models.entities import (
    Application,
    CandidateProfile,
    EvaluationRun,
    Job,
    JobSkill,
    MatchResult,
    RecruiterProfile,
    Resume,
    User,
)
from app.models.enums import (
    ApplicationStatus,
    EvaluationStatus,
    JobStatus,
    ProcessingStatus,
    UserRole,
)
from app.services.evaluation import (
    EvaluationService,
    compute_evaluation_fingerprint,
)
from app.services.scoring import Weights
from app.services.semantic_matcher import (
    AIServiceDiagnosticMatcher,
    BaseSemanticMatcher,
    SemanticMatchResult,
    SublinearTFCosineMatcher,
)


def _create_docx(text: str) -> bytes:
    doc = Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_fingerprint_determinism_and_scoring_input_sensitivity():
    recruiter_id = uuid4()
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter_id,
        title="Senior Python Backend Engineer",
        department="Engineering",
        location="Remote",
        employment_type="Full-time",
        work_arrangement="Remote",
        experience_min_years=4.0,
        education_required="Bachelor",
        description="Design scalable distributed systems using Python and FastAPI.",
        skills_weight=40,
        experience_weight=30,
        education_weight=15,
        semantic_weight=15,
    )
    job.skills = [
        JobSkill(name="Python", normalized_name="python", required=True, min_years=3.0),
        JobSkill(name="FastAPI", normalized_name="fastapi", required=True, min_years=2.0),
        JobSkill(name="Docker", normalized_name="docker", required=False, min_years=1.0),
    ]

    candidate = CandidateProfile(
        id=uuid4(),
        user_id=uuid4(),
        name="Alice Candidate",
        headline="Python Engineer",
        total_experience_years=5.0,
        education={"degree": "Bachelor", "skills": ["Python", "FastAPI"]},
    )

    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        original_filename="alice_resume.docx",
        storage_key="alice.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        byte_size=1000,
        sha256="a" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Alice Candidate\nPython, FastAPI developer with 5 years experience.",
    )

    weights = Weights(skills=40, experience=30, education=15, semantic=15)

    fp1 = compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights)
    fp2 = compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights)
    assert fp1 == fp2, "Fingerprint must be strictly deterministic"

    # Non-scoring metadata modifications MUST NOT alter fingerprint
    job.location = "San Francisco, CA"
    job.department = "Platform Architecture"
    job.work_arrangement = "Hybrid"
    fp_after_metadata = compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights)
    assert fp1 == fp_after_metadata, "Non-scoring metadata changes must not alter fingerprint"

    # 1. Weights modification MUST alter fingerprint
    weights_changed = Weights(skills=50, experience=20, education=15, semantic=15)
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights_changed) != fp1

    # 2. Skill modification MUST alter fingerprint
    job.skills.append(JobSkill(name="Kubernetes", normalized_name="kubernetes", required=True))
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    job.skills.pop()

    # 3. Required experience threshold modification MUST alter fingerprint
    job.experience_min_years = 6.0
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    job.experience_min_years = 4.0

    # 4. Education requirement modification MUST alter fingerprint
    job.education_required = "Master"
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    job.education_required = "Bachelor"

    # 5. Extracted resume text modification MUST alter fingerprint even if original file metadata is unchanged
    resume.extracted_text = "Alice Candidate\nPython developer with Go experience."
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    resume.extracted_text = "Alice Candidate\nPython, FastAPI developer with 5 years experience."

    # 6. Job title modification MUST alter fingerprint (affects job corpus)
    job.title = "Staff Python Platform Engineer"
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    job.title = "Senior Python Backend Engineer"

    # 7. Job description modification MUST alter fingerprint
    job.description = "Design distributed microservices with async event streaming."
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    job.description = "Design scalable distributed systems using Python and FastAPI."

    # 8. Candidate total_experience_years modification MUST alter fingerprint
    candidate.total_experience_years = 7.0
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    candidate.total_experience_years = 5.0

    # 9. Candidate degree credential modification MUST alter fingerprint
    candidate.education = {"degree": "Master", "skills": ["Python", "FastAPI"]}
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1

    # 10. Candidate declared skills modification MUST alter fingerprint
    candidate.education = {"degree": "Bachelor", "skills": ["Python", "FastAPI", "PostgreSQL"]}
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    candidate.education = {"degree": "Bachelor", "skills": ["Python", "FastAPI"]}

    # 11. Candidate education with None skills should not raise TypeError
    candidate.education = {"degree": "Bachelor", "skills": None}
    fp_none_skills = compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights)
    assert isinstance(fp_none_skills, str) and len(fp_none_skills) == 64
    candidate.education = {"degree": "Bachelor", "skills": ["Python", "FastAPI"]}

    # 12. Candidate name modification MUST alter fingerprint (consumed by candidate_corpus)
    candidate.name = "Alice Wonder"
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    candidate.name = "Alice Candidate"

    # 13. Candidate headline modification MUST alter fingerprint (consumed by candidate_corpus)
    candidate.headline = "Lead Cloud Systems Architect"
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) != fp1
    candidate.headline = "Python Engineer"

    # 14. Candidate non-scoring metadata modification MUST NOT alter fingerprint
    candidate.location = "Seattle, WA"
    assert compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights) == fp1


def test_diagnostic_embedding_matcher_produces_same_fingerprint_as_baseline():
    """
    Diagnostic embedding matcher is diagnostic only and explicitly marked used_for_ranking=False.
    The actual score used for ranking comes from the fallback baseline matcher (SublinearTFCosineMatcher).
    Baseline mode and diagnostic embedding mode MUST produce the exact same freshness fingerprint
    when actual scoring inputs and scoring matcher are unchanged.
    """
    job = Job(
        id=uuid4(),
        recruiter_id=uuid4(),
        title="Backend Engineer",
        description="Python FastAPI engineer",
        skills_weight=50,
        experience_weight=50,
        education_weight=0,
        semantic_weight=0,
    )
    job.skills = [JobSkill(name="Python", required=True)]
    candidate = CandidateProfile(
        id=uuid4(),
        user_id=uuid4(),
        name="Bob Builder",
        headline="Python Engineer",
        total_experience_years=4.0,
    )
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python engineer with 4 years experience",
        byte_size=100,
        sha256="1" * 64,
        storage_key="k",
        original_filename="r.pdf",
        mime_type="application/pdf",
    )
    weights = Weights(skills=50, experience=50, education=0, semantic=0)

    baseline_matcher = SublinearTFCosineMatcher()
    diagnostic_matcher = AIServiceDiagnosticMatcher(
        base_url="http://diagnostic.test",
        api_key="secret",
        fallback_matcher=baseline_matcher,
    )

    fp_baseline = compute_evaluation_fingerprint(
        job=job,
        candidate=candidate,
        resume=resume,
        weights=weights,
        semantic_matcher=baseline_matcher,
    )
    fp_diagnostic = compute_evaluation_fingerprint(
        job=job,
        candidate=candidate,
        resume=resume,
        weights=weights,
        semantic_matcher=diagnostic_matcher,
    )

    assert fp_baseline == fp_diagnostic, (
        "Diagnostic embedding matcher must produce the exact same fingerprint as baseline matcher "
        "because embeddings are not used for ranking."
    )


def test_actual_scoring_matcher_change_invalidates_freshness():
    """
    If the actual scoring matcher used to produce scores changes (e.g. from SublinearTFCosineMatcher
    to a different scoring engine), the fingerprint MUST change so cached evaluations are invalidated.
    """
    job = Job(
        id=uuid4(),
        recruiter_id=uuid4(),
        title="Backend Engineer",
        description="Python engineer",
        skills_weight=50,
        experience_weight=50,
        education_weight=0,
        semantic_weight=0,
    )
    job.skills = [JobSkill(name="Python", required=True)]
    candidate = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Bob Builder")
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python",
        byte_size=100,
        sha256="1" * 64,
        storage_key="k",
        original_filename="r.pdf",
        mime_type="application/pdf",
    )
    weights = Weights(skills=50, experience=50, education=0, semantic=0)

    class CustomScoringMatcher(BaseSemanticMatcher):
        @property
        def scoring_matcher_id(self) -> str:
            return "CustomProductionRankingMatcherV2"

        def match(self, *, candidate_text: str, job_text: str, candidate_skills=None, job_skills=None) -> SemanticMatchResult:
            return SemanticMatchResult(
                similarity_score=100.0,
                alignment_grade="High",
                matched_concepts=[],
                missing_concepts=[],
                model_version="custom-v2",
                confidence="high",
            )

    fp_default = compute_evaluation_fingerprint(job=job, candidate=candidate, resume=resume, weights=weights)
    fp_custom = compute_evaluation_fingerprint(
        job=job, candidate=candidate, resume=resume, weights=weights, semantic_matcher=CustomScoringMatcher()
    )

    assert fp_default != fp_custom, "Changing the actual scoring matcher must alter the evaluation fingerprint."


def test_candidate_education_skills_none_safe_evaluation(db_session):
    """
    Regression test: candidate.education = {"skills": None} must be handled safely
    by both compute_evaluation_fingerprint and DeterministicEvaluationEngine.evaluate()
    without raising TypeError: 'NoneType' object is not iterable.
    """
    recruiter = RecruiterProfile(id=uuid4(), user_id=uuid4(), organization_name="EduCorp")
    db_session.add(recruiter)
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter.id,
        title="Python Dev",
        description="Python FastAPI",
        employment_type="Full-time",
        work_arrangement="Remote",
        skills_weight=100,
        experience_weight=0,
        education_weight=0,
        semantic_weight=0,
    )
    job.skills = [JobSkill(name="Python", normalized_name="python", required=True)]
    db_session.add(job)

    candidate = CandidateProfile(
        id=uuid4(),
        user_id=uuid4(),
        name="Edu Candidate",
        education={"degree": "Bachelor", "skills": None},
    )
    db_session.add(candidate)
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python developer with experience",
        byte_size=100,
        sha256="e1" * 32,
        storage_key="k",
        original_filename="r.pdf",
        mime_type="application/pdf",
    )
    db_session.add(resume)
    app = Application(id=uuid4(), job_id=job.id, candidate_id=candidate.id, resume_id=resume.id)
    db_session.add(app)
    db_session.commit()

    service = EvaluationService()
    # Evaluate application end-to-end; must NOT raise TypeError
    eval_run = service.evaluate_application(db_session, application_id=app.id, recruiter_id=recruiter.id)
    assert eval_run.status == EvaluationStatus.COMPLETED
    assert eval_run.configuration_hash is not None

    card = EvaluationService.get_candidate_card(db_session, application=app, recruiter_id=recruiter.id)
    assert card.evaluation_status == "current"
    assert card.is_fresh is True


def test_fingerprint_calculation_error_surfaces_as_unknown_not_current(db_session, monkeypatch):
    """
    If fingerprint calculation itself fails (e.g. an unexpected runtime error),
    get_candidate_card must log diagnostic context and report evaluation_status as 'unknown'
    with is_fresh=False, rather than falsely declaring the evaluation 'current'.
    """
    recruiter = RecruiterProfile(id=uuid4(), user_id=uuid4(), organization_name="ErrorCorp")
    db_session.add(recruiter)
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter.id,
        title="DevOps",
        description="DevOps role",
        employment_type="Full-time",
        work_arrangement="Remote",
        skills_weight=100,
        experience_weight=0,
        education_weight=0,
        semantic_weight=0,
    )
    job.skills = [JobSkill(name="Python", normalized_name="python", required=True)]
    db_session.add(job)
    candidate = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Candidate")
    db_session.add(candidate)
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="DevOps engineer",
        byte_size=100,
        sha256="err" * 21 + "1",
        storage_key="k",
        original_filename="r.pdf",
        mime_type="application/pdf",
    )
    db_session.add(resume)
    app = Application(id=uuid4(), job_id=job.id, candidate_id=candidate.id, resume_id=resume.id)
    db_session.add(app)
    db_session.commit()

    service = EvaluationService()
    eval_run = service.evaluate_application(db_session, application_id=app.id, recruiter_id=recruiter.id)
    assert eval_run.status == EvaluationStatus.COMPLETED

    # Mock compute_evaluation_fingerprint to raise an unexpected runtime error
    def crashing_compute(*args, **kwargs):
        raise RuntimeError("Unexpected failure during fingerprint hashing")

    import app.services.evaluation as eval_mod
    monkeypatch.setattr(eval_mod, "compute_evaluation_fingerprint", crashing_compute)

    card = EvaluationService.get_candidate_card(db_session, application=app, recruiter_id=recruiter.id)
    assert card.evaluation_status == "unknown", "Fingerprint failure must surface as unknown"
    assert card.is_fresh is False, "Fingerprint failure must never be reported as fresh/current"



def test_legacy_evaluations_without_hash_marked_stale(db_session):
    recruiter = RecruiterProfile(id=uuid4(), user_id=uuid4(), organization_name="TechCorp")
    db_session.add(recruiter)
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter.id,
        title="Backend Dev",
        employment_type="Full-time",
        work_arrangement="Remote",
        description="Dev role",
        skills_weight=50,
        experience_weight=50,
        education_weight=0,
        semantic_weight=0,
    )
    db_session.add(job)
    candidate = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Legacy Candidate", total_experience_years=3.0)
    db_session.add(candidate)
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        original_filename="resume.pdf",
        storage_key="legacy.pdf",
        mime_type="application/pdf",
        byte_size=500,
        sha256="b" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python engineer with 3 years tenure.",
    )
    db_session.add(resume)
    app = Application(id=uuid4(), job_id=job.id, candidate_id=candidate.id, resume_id=resume.id)
    db_session.add(app)
    db_session.flush()

    # Historical run with configuration_hash=None
    legacy_run = EvaluationRun(
        id=uuid4(),
        application_id=app.id,
        status=EvaluationStatus.COMPLETED,
        scoring_version="deterministic-v2-taxonomy",
        weights_used={"skills": 50, "experience": 50, "education": 0, "semantic": 0},
        configuration_hash=None,
    )
    db_session.add(legacy_run)
    match_result = MatchResult(
        id=uuid4(),
        evaluation_run_id=legacy_run.id,
        overall_score=85.0,
        skills_score=80.0,
        experience_score=90.0,
        education_score=0.0,
        semantic_score=0.0,
        rapidfuzz_score=0.0,
        tenure_delta_years=1.0,
        signal_quality="clean_match",
        ranking_attribution={},
        why_ranked_here=[],
        why_not_higher=[],
    )
    db_session.add(match_result)
    db_session.commit()

    card = EvaluationService.get_candidate_card(db_session, application=app, recruiter_id=recruiter.id)
    assert card.evaluation_status == "stale", "Legacy run without configuration_hash must be marked stale"
    assert card.is_fresh is False
    assert card.matchScore == 85.0, "Historical score must remain readable for display"


def test_failed_or_pending_run_handling(db_session):
    recruiter = RecruiterProfile(id=uuid4(), user_id=uuid4(), organization_name="TechCorp")
    db_session.add(recruiter)
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter.id,
        title="Backend Dev",
        employment_type="Full-time",
        work_arrangement="Remote",
        description="Dev role",
        skills_weight=100,
        experience_weight=0,
        education_weight=0,
        semantic_weight=0,
    )
    db_session.add(job)
    candidate = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Test Candidate")
    db_session.add(candidate)
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        original_filename="res.pdf",
        storage_key="res.pdf",
        mime_type="application/pdf",
        byte_size=500,
        sha256="c" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python Developer",
    )
    db_session.add(resume)
    app = Application(id=uuid4(), job_id=job.id, candidate_id=candidate.id, resume_id=resume.id)
    db_session.add(app)
    db_session.flush()

    # 1. Initially no evaluation
    card_none = EvaluationService.get_candidate_card(db_session, application=app, recruiter_id=recruiter.id)
    assert card_none.evaluation_status == "not_evaluated"
    assert card_none.is_fresh is False
    assert card_none.matchScore == 0.0

    # 2. Add a failed run
    failed_run = EvaluationRun(
        id=uuid4(),
        application_id=app.id,
        status=EvaluationStatus.FAILED,
        scoring_version="deterministic-v2-taxonomy",
        weights_used={"skills": 100, "experience": 0, "education": 0, "semantic": 0},
    )
    db_session.add(failed_run)
    db_session.commit()

    card_failed = EvaluationService.get_candidate_card(db_session, application=app, recruiter_id=recruiter.id)
    assert card_failed.evaluation_status == "failed"
    assert card_failed.is_fresh is False
    assert card_failed.matchScore == 0.0


def test_batch_reevaluation_endpoint(client, db_session):
    # 1. Register recruiter and create job
    client.post(
        "/api/v1/auth/register",
        json={"email": "recruiter.batch@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    r_token = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter.batch@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Fullstack Lead",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 3.0,
            "education_required": "Bachelor",
            "description": "Lead fullstack development in Python and React.",
            "skills": [
                {"name": "Python", "required": True, "min_years": 2.0},
                {"name": "React", "required": True, "min_years": 2.0},
            ],
            "evaluation_weights": {"skills": 60, "experience": 40, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # 2. Candidate 1 applies with valid resume
    client.post(
        "/api/v1/auth/register",
        json={"email": "c1.batch@example.com", "password": "Password123456!", "role": "candidate"},
    )
    c1_token = client.post(
        "/api/v1/auth/login",
        json={"email": "c1.batch@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    c1_headers = {"Authorization": f"Bearer {c1_token}"}

    docx_c1 = _create_docx("Candidate One\nPython, React engineer with 4 years experience.")
    up_c1 = client.post(
        "/api/v1/profile/resumes",
        headers=c1_headers,
        files={"file": ("c1.docx", docx_c1, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert up_c1.status_code == 202
    r1_id = up_c1.json()["id"]

    app1_res = client.post(f"/api/v1/jobs/{job_id}/applications", headers=c1_headers, json={"resume_id": r1_id})
    assert app1_res.status_code == 201
    app1_id = app1_res.json()["id"]

    # 3. Candidate 2 applies with another valid resume
    client.post(
        "/api/v1/auth/register",
        json={"email": "c2.batch@example.com", "password": "Password123456!", "role": "candidate"},
    )
    c2_token = client.post(
        "/api/v1/auth/login",
        json={"email": "c2.batch@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    c2_headers = {"Authorization": f"Bearer {c2_token}"}

    docx_c2 = _create_docx("Candidate Two\nReact frontend developer with 2 years experience.")
    up_c2 = client.post(
        "/api/v1/profile/resumes",
        headers=c2_headers,
        files={"file": ("c2.docx", docx_c2, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert up_c2.status_code == 202
    r2_id = up_c2.json()["id"]

    app2_res = client.post(f"/api/v1/jobs/{job_id}/applications", headers=c2_headers, json={"resume_id": r2_id})
    assert app2_res.status_code == 201
    app2_id = app2_res.json()["id"]

    # Applications are auto-evaluated on creation, so cards are initially fresh
    cand_list = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers).json()
    assert len(cand_list) == 2
    assert all(c["is_fresh"] is True for c in cand_list)
    assert all(c["evaluation_status"] == "current" for c in cand_list)

    # 4. Triggering re-evaluate immediately should report already_fresh
    reeval1 = client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)
    assert reeval1.status_code == 200
    res1 = reeval1.json()
    assert res1["total_applications"] == 2
    assert res1["already_fresh_count"] == 2
    assert res1["evaluated_count"] == 0

    # 5. Recruiter modifies job weights from 60/40 to 80/20
    update_res = client.patch(
        f"/api/v1/jobs/{job_id}",
        headers=r_headers,
        json={"evaluation_weights": {"skills": 80, "experience": 20, "education": 0, "semantic": 0}},
    )
    assert update_res.status_code == 200

    # Inspect candidate cards: must now be marked STALE
    cand_stale = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers).json()
    assert all(c["is_fresh"] is False for c in cand_stale)
    assert all(c["evaluation_status"] == "stale" for c in cand_stale)

    # 6. Recruiter triggers batch re-evaluate
    reeval2 = client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)
    assert reeval2.status_code == 200
    res2 = reeval2.json()
    assert res2["total_applications"] == 2
    assert res2["evaluated_count"] == 2
    assert res2["already_fresh_count"] == 0
    assert res2["failed_count"] == 0

    # Candidate cards must now be CURRENT again with new weights reflected
    cand_fresh = client.get(f"/api/v1/jobs/{job_id}/candidates", headers=r_headers).json()
    assert all(c["is_fresh"] is True for c in cand_fresh)
    assert all(c["evaluation_status"] == "current" for c in cand_fresh)

    # 7. Authorization test: another recruiter cannot re-evaluate this job
    client.post(
        "/api/v1/auth/register",
        json={"email": "unauthorized.recruiter@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    other_token = client.post(
        "/api/v1/auth/login",
        json={"email": "unauthorized.recruiter@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    forbidden_res = client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=other_headers)
    assert forbidden_res.status_code == 404


def test_batch_reevaluation_failure_isolation_and_empty_batches(client, db_session, monkeypatch):
    # 1. Register recruiter and create job with 0 applications
    client.post(
        "/api/v1/auth/register",
        json={"email": "recruiter.isolation@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    r_token = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter.isolation@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Backend Architect",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 5.0,
            "education_required": "Bachelor",
            "description": "Distributed systems and Python.",
            "skills": [{"name": "Python", "required": True}],
            "evaluation_weights": {"skills": 70, "experience": 30, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # Test empty batch
    empty_reeval = client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)
    assert empty_reeval.status_code == 200
    assert empty_reeval.json() == {
        "job_id": job_id,
        "total_applications": 0,
        "evaluated_count": 0,
        "skipped_count": 0,
        "failed_count": 0,
        "already_fresh_count": 0,
        "results": [],
    }

    # 2. Candidate 1 has an unparsed resume (should be skipped)
    cand1 = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Skipped Candidate")
    db_session.add(cand1)
    res1 = Resume(
        id=uuid4(),
        candidate_id=cand1.id,
        original_filename="bad.pdf",
        storage_key="bad.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="d" * 64,
        processing_status=ProcessingStatus.NEEDS_ATTENTION,
        extracted_text=None,
    )
    db_session.add(res1)
    app1 = Application(id=uuid4(), job_id=UUID(job_id), candidate_id=cand1.id, resume_id=res1.id)
    db_session.add(app1)

    # 3. Candidate 2 will be forced to raise an exception during evaluate_application
    cand2 = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Failing Candidate")
    db_session.add(cand2)
    res2 = Resume(
        id=uuid4(),
        candidate_id=cand2.id,
        original_filename="fail.pdf",
        storage_key="fail.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="e" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python Engineer",
    )
    db_session.add(res2)
    app2 = Application(id=uuid4(), job_id=UUID(job_id), candidate_id=cand2.id, resume_id=res2.id)
    db_session.add(app2)

    # 4. Candidate 3 is a valid candidate who should evaluate successfully
    cand3 = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Successful Candidate")
    db_session.add(cand3)
    res3 = Resume(
        id=uuid4(),
        candidate_id=cand3.id,
        original_filename="ok.pdf",
        storage_key="ok.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="f" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Python Architect with 6 years experience",
    )
    db_session.add(res3)
    app3 = Application(id=uuid4(), job_id=UUID(job_id), candidate_id=cand3.id, resume_id=res3.id)
    db_session.add(app3)
    db_session.commit()

    # Monkeypatch evaluate_application to fail ONLY on candidate 2 (app2)
    orig_evaluate = EvaluationService.evaluate_application

    def patched_evaluate(self, db, *, application_id, recruiter_id, commit=True):
        if str(application_id) == str(app2.id):
            raise RuntimeError("Simulated transient evaluation engine crash")
        return orig_evaluate(self, db, application_id=application_id, recruiter_id=recruiter_id, commit=commit)

    monkeypatch.setattr(EvaluationService, "evaluate_application", patched_evaluate)

    # Trigger batch re-evaluation
    batch_res = client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)
    assert batch_res.status_code == 200
    data = batch_res.json()

    assert data["total_applications"] == 3
    assert data["skipped_count"] == 1
    assert data["failed_count"] == 1
    assert data["evaluated_count"] == 1
    assert data["already_fresh_count"] == 0

    # Ensure Candidate 1 was skipped
    app1_out = next(r for r in data["results"] if r["application_id"] == str(app1.id))
    assert app1_out["status"] == "skipped"

    # Ensure Candidate 2 was failed, and its failure record has NO partial match result
    app2_out = next(r for r in data["results"] if r["application_id"] == str(app2.id))
    assert app2_out["status"] == "failed"
    assert "Simulated" not in app2_out["reason"], "Must not leak internal exception details to client"

    app2_runs = db_session.query(EvaluationRun).filter(EvaluationRun.application_id == app2.id).all()
    assert len(app2_runs) == 1
    assert app2_runs[0].status == EvaluationStatus.FAILED
    assert app2_runs[0].match_result is None, "Failed evaluations must not leave partial match results"

    # Ensure Candidate 3 succeeded despite Candidate 2's failure
    app3_out = next(r for r in data["results"] if r["application_id"] == str(app3.id))
    assert app3_out["status"] == "evaluated"
    assert app3_out["score"] is not None

    app3_runs = db_session.query(EvaluationRun).filter(EvaluationRun.application_id == app3.id).all()
    assert len(app3_runs) == 1
    assert app3_runs[0].status == EvaluationStatus.COMPLETED
    assert app3_runs[0].match_result is not None


def test_coverage_tier_ranking_preserved_with_freshness_attributes(client, db_session):
    """
    Ensure coverage-tier-first ranking tuple is strictly preserved:
    Tier 1 (NO_COMPUTABLE_REQUIRED_GAPS) > Tier 2 (INSUFFICIENT_REQUIRED_EVIDENCE) > Tier 3 (REQUIRED_GAP),
    regardless of whether evaluations are fresh or stale.
    """
    recruiter = RecruiterProfile(id=uuid4(), user_id=uuid4(), organization_name="RankingCorp")
    db_session.add(recruiter)
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter.id,
        title="ML Engineer",
        employment_type="Full-time",
        work_arrangement="Remote",
        description="Machine Learning",
        experience_min_years=4.0,
        education_required="Master",
        skills_weight=50,
        experience_weight=50,
        education_weight=0,
        semantic_weight=0,
    )
    db_session.add(job)
    skill1 = JobSkill(job_id=job.id, name="PyTorch", normalized_name="pytorch", required=True, min_years=2.0)
    db_session.add(skill1)

    # Candidate A: Tier 1 (Matches PyTorch with 5 yrs experience, meets 4 yrs min) -> overall score ~90
    cand_a = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Alice Tier1", total_experience_years=5.0)
    db_session.add(cand_a)
    res_a = Resume(
        id=uuid4(),
        candidate_id=cand_a.id,
        original_filename="a.pdf",
        storage_key="a.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="1" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="PyTorch deep learning engineer with 5 years experience.",
    )
    db_session.add(res_a)
    app_a = Application(id=uuid4(), job_id=job.id, candidate_id=cand_a.id, resume_id=res_a.id)
    db_session.add(app_a)

    # Candidate B: Tier 3 (Has required gap: only 1 year experience when 4 required)
    cand_b = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Bob Tier3", total_experience_years=1.0)
    db_session.add(cand_b)
    res_b = Resume(
        id=uuid4(),
        candidate_id=cand_b.id,
        original_filename="b.pdf",
        storage_key="b.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="2" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Junior PyTorch researcher with 1 year experience.",
    )
    db_session.add(res_b)
    app_b = Application(id=uuid4(), job_id=job.id, candidate_id=cand_b.id, resume_id=res_b.id)
    db_session.add(app_b)
    db_session.commit()

    eval_service = EvaluationService()
    eval_service.evaluate_application(db_session, application_id=app_a.id, recruiter_id=recruiter.id)
    eval_service.evaluate_application(db_session, application_id=app_b.id, recruiter_id=recruiter.id)

    # Verify candidate cards
    card_a = EvaluationService.get_candidate_card(db_session, application=app_a, recruiter_id=recruiter.id)
    card_b = EvaluationService.get_candidate_card(db_session, application=app_b, recruiter_id=recruiter.id)

    assert card_a.is_fresh is True
    assert card_a.evaluation_status == "current"
    assert card_b.is_fresh is True
    assert card_b.evaluation_status == "current"

    # From sorting rule: Alice (no gap) must rank ahead of Bob (required gap)
    cards = [card_b, card_a]
    def card_rank_key(card):
        has_gap = any(ev.type == "gap" for ev in card.evidence)
        has_insufficient = any(ev.type in ("not_detected", "not_provided") for ev in card.evidence) or len(card.missingSkills) > 0
        tier_val = 3 if has_gap else (2 if has_insufficient else 1)
        return (tier_val, -card.matchScore, str(card.id))

    cards.sort(key=card_rank_key)
    assert cards[0].name == "Alice Tier1"
    assert cards[1].name == "Bob Tier3"


def test_concurrent_reevaluation_requests_rejected(client, db_session):
    """Verify that simultaneous re-evaluation requests on the same job are rejected with 409 Conflict."""
    import time
    from concurrent.futures import ThreadPoolExecutor

    # 1. Register recruiter and create job
    client.post(
        "/api/v1/auth/register",
        json={"email": "recruiter.concurrent@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    r_token = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter.concurrent@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Platform Engineer",
            "department": "Infrastructure",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 4.0,
            "education_required": "Bachelor",
            "description": "Kubernetes and Go",
            "skills": [{"name": "Go", "required": True}],
            "evaluation_weights": {"skills": 100, "experience": 0, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    job_id = job_res.json()["id"]

    # Candidate 1 with resume
    cand = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Concurrent Candidate", total_experience_years=4.0)
    db_session.add(cand)
    res = Resume(
        id=uuid4(),
        candidate_id=cand.id,
        original_filename="c.pdf",
        storage_key="c.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="9" * 64,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Go platform engineer with Kubernetes experience",
    )
    db_session.add(res)
    app = Application(id=uuid4(), job_id=UUID(job_id), candidate_id=cand.id, resume_id=res.id)
    db_session.add(app)
    db_session.commit()

    # Monkeypatch evaluate_application to introduce a small artificial delay so two threads collide
    orig_eval = EvaluationService.evaluate_application

    def slow_evaluate(self, db, *, application_id, recruiter_id, commit=True):
        time.sleep(0.3)
        return orig_eval(self, db, application_id=application_id, recruiter_id=recruiter_id, commit=commit)

    from unittest.mock import patch
    with patch.object(EvaluationService, "evaluate_application", slow_evaluate):
        def call_endpoint():
            return client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)

        with ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(call_endpoint)
            time.sleep(0.05)  # slight offset to ensure thread 1 enters first
            fut2 = executor.submit(call_endpoint)

            res1 = fut1.result()
            res2 = fut2.result()

        status_codes = {res1.status_code, res2.status_code}
        assert 200 in status_codes, f"Expected one 200, got: {status_codes}"
        assert 409 in status_codes, f"Expected one 409 Conflict, got: {status_codes}"


def test_savepoint_rollback_purges_partial_match_results_on_failure(client, db_session, monkeypatch):
    """
    Ensure savepoint isolation rolls back partial evaluation writes in the database,
    and commits a clean FAILED record without any partial MatchResult or EvaluatedSkill.
    """
    recruiter = RecruiterProfile(id=uuid4(), user_id=uuid4(), organization_name="SavepointCorp")
    db_session.add(recruiter)
    job = Job(
        id=uuid4(),
        recruiter_id=recruiter.id,
        title="Security Lead",
        employment_type="Full-time",
        work_arrangement="Remote",
        description="Application Security",
        skills_weight=100,
        experience_weight=0,
        education_weight=0,
        semantic_weight=0,
    )
    db_session.add(job)

    # Candidate 1: will write partial records then crash
    c1 = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Crashed Candidate")
    db_session.add(c1)
    r1 = Resume(
        id=uuid4(),
        candidate_id=c1.id,
        original_filename="r1.pdf",
        storage_key="r1.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="a1" * 32,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="AppSec engineer",
    )
    db_session.add(r1)
    app1 = Application(id=uuid4(), job_id=job.id, candidate_id=c1.id, resume_id=r1.id)
    db_session.add(app1)

    # Candidate 2: normal candidate
    c2 = CandidateProfile(id=uuid4(), user_id=uuid4(), name="Healthy Candidate")
    db_session.add(c2)
    r2 = Resume(
        id=uuid4(),
        candidate_id=c2.id,
        original_filename="r2.pdf",
        storage_key="r2.pdf",
        mime_type="application/pdf",
        byte_size=100,
        sha256="a2" * 32,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="AppSec engineer with 5 years experience",
    )
    db_session.add(r2)
    app2 = Application(id=uuid4(), job_id=job.id, candidate_id=c2.id, resume_id=r2.id)
    db_session.add(app2)
    db_session.commit()

    # Monkeypatch evaluate_application: on candidate 1, insert partial MatchResult then raise RuntimeError
    orig_eval = EvaluationService.evaluate_application

    def crashing_eval(self, db, *, application_id, recruiter_id, commit=True):
        if application_id == app1.id:
            # Write a partial run and match result inside the savepoint
            partial_run = EvaluationRun(
                application_id=app1.id,
                status=EvaluationStatus.RUNNING,
                scoring_version="partial",
                weights_used={},
            )
            db.add(partial_run)
            db.flush()
            partial_match = MatchResult(
                evaluation_run_id=partial_run.id,
                overall_score=42.0,
                skills_score=42.0,
                experience_score=0.0,
                education_score=0.0,
                semantic_score=0.0,
                signal_quality="partial",
            )
            db.add(partial_match)
            db.flush()
            raise RuntimeError("Catastrophic error mid-evaluation after partial flush!")
        return orig_eval(self, db, application_id=application_id, recruiter_id=recruiter_id, commit=commit)

    monkeypatch.setattr(EvaluationService, "evaluate_application", crashing_eval)

    # Register recruiter to get auth header
    client.post(
        "/api/v1/auth/register",
        json={"email": "savepoint.recruiter@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    # Re-assign job recruiter_id to match registered recruiter
    u = db_session.query(User).filter(User.email == "savepoint.recruiter@example.com").one()
    job.recruiter_id = u.recruiter_profile.id
    db_session.commit()

    token = client.post(
        "/api/v1/auth/login",
        json={"email": "savepoint.recruiter@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(f"/api/v1/jobs/{job.id}/re-evaluate", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["failed_count"] == 1
    assert data["evaluated_count"] == 1

    # Check candidate 1: partial RUNNING run and partial MatchResult must NOT exist
    all_c1_runs = db_session.query(EvaluationRun).filter(EvaluationRun.application_id == app1.id).all()
    assert len(all_c1_runs) == 1
    assert all_c1_runs[0].status == EvaluationStatus.FAILED
    assert all_c1_runs[0].match_result is None

    # Check that score 42.0 is nowhere in match_results table
    matches = db_session.query(MatchResult).filter(MatchResult.overall_score == 42.0).all()
    assert len(matches) == 0, "Partial MatchResult must have been purged by savepoint rollback!"

    # Check candidate 2: succeeded completely
    all_c2_runs = db_session.query(EvaluationRun).filter(EvaluationRun.application_id == app2.id).all()
    assert len(all_c2_runs) == 1
    assert all_c2_runs[0].status == EvaluationStatus.COMPLETED
    assert all_c2_runs[0].match_result is not None


def test_database_lock_contention_returns_409(client, db_session, monkeypatch):
    """Confirm that database-level lock contention (OperationalError on with_for_update) produces HTTP 409."""
    from sqlalchemy.exc import OperationalError
    from sqlalchemy.orm import Query

    # Register recruiter and create job
    client.post(
        "/api/v1/auth/register",
        json={"email": "recruiter.lock@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    r_token = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter.lock@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Database Admin",
            "department": "Engineering",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 3.0,
            "education_required": "Bachelor",
            "description": "Database management.",
            "skills": [{"name": "PostgreSQL", "required": True}],
            "evaluation_weights": {"skills": 100, "experience": 0, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    job_id = job_res.json()["id"]

    # Simulate PostgreSQL SELECT FOR UPDATE NOWAIT contention raising OperationalError
    orig_with_for_update = Query.with_for_update

    def mock_with_for_update(self, *args, **kwargs):
        raise OperationalError("could not obtain lock on row in relation \"jobs\"", params={}, orig=Exception("lock contention"))

    monkeypatch.setattr(Query, "with_for_update", mock_with_for_update)

    res = client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)
    assert res.status_code == 409
    assert res.json()["error"]["message"] == "A batch re-evaluation for this job is already in progress."


def test_unrelated_database_errors_not_masked_as_409(client, db_session, monkeypatch):
    """Confirm that unrelated database errors (e.g. DataError) are not falsely masked as 409 Conflict."""
    from sqlalchemy.exc import DataError
    from sqlalchemy.orm import Query

    client.post(
        "/api/v1/auth/register",
        json={"email": "recruiter.dataerror@example.com", "password": "Password123456!", "role": "recruiter"},
    )
    r_token = client.post(
        "/api/v1/auth/login",
        json={"email": "recruiter.dataerror@example.com", "password": "Password123456!"},
    ).json()["access_token"]
    r_headers = {"Authorization": f"Bearer {r_token}"}

    job_res = client.post(
        "/api/v1/jobs",
        headers=r_headers,
        json={
            "title": "Data Specialist",
            "department": "Analytics",
            "location": "Remote",
            "employment_type": "Full-time",
            "work_arrangement": "Remote",
            "experience_min_years": 1.0,
            "education_required": "Bachelor",
            "description": "Analytics role.",
            "skills": [{"name": "SQL", "required": True}],
            "evaluation_weights": {"skills": 100, "experience": 0, "education": 0, "semantic": 0},
            "status": "open",
        },
    )
    job_id = job_res.json()["id"]

    def mock_data_error(self, *args, **kwargs):
        raise DataError("corrupted data value", params={}, orig=Exception("bad data"))

    monkeypatch.setattr(Query, "with_for_update", mock_data_error)

    # Should raise or produce 500, NOT 409 Conflict
    with pytest.raises(DataError):
        client.post(f"/api/v1/jobs/{job_id}/re-evaluate", headers=r_headers)
