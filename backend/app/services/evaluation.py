from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.entities import (
    Application,
    CandidateProfile,
    EvaluatedSkill,
    EvaluationRun,
    EvidenceClaim,
    Job,
    MatchResult,
    RecruiterNote,
    Resume,
)
from app.models.enums import (
    ApplicationStatus,
    EvaluatedSkillStatus,
    EvaluationStatus,
    EvidenceConfidence,
    EvidenceKind,
)
from app.schemas.evaluations import CandidateCardDTO, CandidateEvidenceItem
from app.services.scoring import (
    EvaluatedRequirement,
    Weights,
    calculate_weighted_score,
    education_satisfies,
)
from app.services.semantic_matcher import BaseSemanticMatcher, SublinearTFCosineMatcher
from app.services.taxonomy import taxonomy

logger = logging.getLogger(__name__)


class BaseEvaluationEngine(ABC):
    """Abstract boundary separating deterministic evaluation from future AI-enhanced implementations."""

    @abstractmethod
    def evaluate(
        self,
        *,
        job: Job,
        candidate: CandidateProfile,
        resume: Resume | None,
        weights: Weights,
    ) -> dict[str, Any]:
        """Produce deterministic/explainable scoring factors and evidence items."""
        pass


class DeterministicEvaluationEngine(BaseEvaluationEngine):
    """
    Production-grade deterministic evaluation engine.
    Applies:
    1. Canonical taxonomy skill extraction & contextual disambiguation
    2. Strict transferable skill resolution (no unmapped inferences)
    3. Overlap-free experience tenure calculation
    4. Education degree hierarchy evaluation
    5. Explainable sublinear TF cosine semantic similarity with concept overlap
    6. Verbatim snippet evidence claims with confidence ratings
    """

    def __init__(self, semantic_matcher: BaseSemanticMatcher | None = None) -> None:
        self.semantic_matcher = semantic_matcher or SublinearTFCosineMatcher()

    def evaluate(
        self,
        *,
        job: Job,
        candidate: CandidateProfile,
        resume: Resume | None,
        weights: Weights,
    ) -> dict[str, Any]:
        weights.validate()

        resume_text = (resume.extracted_text or "") if resume else ""

        # 1. Extract skills from resume text using full taxonomy
        extracted_from_resume = taxonomy.extract_skills_from_text(resume_text)
        detected_skills_map = {s["canonical_name"].casefold(): s for s in extracted_from_resume}

        # Also pull explicit skills declared in candidate profile
        candidate_declared_skills: set[str] = set()
        if candidate.education and isinstance(candidate.education, dict):
            for s in candidate.education.get("skills", []):
                if isinstance(s, str):
                    canon = taxonomy.normalize(s) or s
                    candidate_declared_skills.add(canon.casefold())

        # Combine all candidate competencies
        all_candidate_skills = set(detected_skills_map.keys()).union(candidate_declared_skills)

        evaluated_requirements: list[EvaluatedRequirement] = []
        evaluated_skills_records: list[dict[str, Any]] = []
        evidence_claims_records: list[dict[str, Any]] = []

        matched_skills: list[str] = []
        transferable_skills: list[str] = []
        missing_skills: list[str] = []

        total_required_skills = sum(1 for s in job.skills if s.required) or 1
        matched_required_count = 0

        # Evaluate each skill in the job requisition
        for job_skill in job.skills:
            skill_canon = taxonomy.normalize(job_skill.name) or job_skill.name
            skill_norm = skill_canon.casefold()

            if skill_norm in all_candidate_skills:
                # Direct match found
                matched_skills.append(job_skill.name)
                if job_skill.required:
                    matched_required_count += 1

                status_val = EvaluatedSkillStatus.MATCHED
                evaluated_requirements.append(
                    EvaluatedRequirement(required=job_skill.required, status=status_val)
                )
                evaluated_skills_records.append({
                    "name": job_skill.name,
                    "status": status_val,
                    "evidence_ref": "direct_match",
                })

                snippet_info = detected_skills_map.get(skill_norm)
                if snippet_info:
                    snippet_text = snippet_info.get("snippet")
                    char_start = snippet_info.get("character_start")
                    char_end = snippet_info.get("character_end")
                    confidence = EvidenceConfidence.HIGH
                    evidence_kind = EvidenceKind.DIRECT
                    claim_text = f"Directly matched skill from resume: {job_skill.name}"
                else:
                    snippet_text = None
                    char_start = None
                    char_end = None
                    confidence = EvidenceConfidence.MEDIUM
                    evidence_kind = EvidenceKind.DIRECT
                    claim_text = f"Skill '{job_skill.name}' declared in candidate profile credentials"

                evidence_claims_records.append({
                    "claim_type": "skill_match",
                    "claim_text": claim_text,
                    "source_snippet": snippet_text,
                    "source_section": "skills",
                    "character_start": char_start,
                    "character_end": char_end,
                    "confidence": confidence,
                    "evidence_kind": evidence_kind,
                    "type": "matched",
                    "requirement": f"{job_skill.name} Requirement",
                    "claim": f"Documented proficiency in {job_skill.name}.",
                })

            else:
                # Check for explicit transferable mapping
                transferable_match = None
                for c_skill in all_candidate_skills:
                    if taxonomy.is_transferable(c_skill, skill_canon):
                        transferable_match = c_skill
                        break

                if transferable_match:
                    transferable_skills.append(job_skill.name)
                    status_val = EvaluatedSkillStatus.TRANSFERABLE
                    evaluated_requirements.append(
                        EvaluatedRequirement(required=job_skill.required, status=status_val)
                    )
                    evaluated_skills_records.append({
                        "name": job_skill.name,
                        "status": status_val,
                        "evidence_ref": f"transferable_from:{transferable_match}",
                    })
                    snippet_info = detected_skills_map.get(transferable_match.casefold())
                    snippet_text = snippet_info.get("snippet") if snippet_info else None
                    char_start = snippet_info.get("character_start") if snippet_info else None
                    char_end = snippet_info.get("character_end") if snippet_info else None

                    evidence_claims_records.append({
                        "claim_type": "transferable_skill",
                        "claim_text": f"Transferable skill recognized for {job_skill.name} via {transferable_match.title()}",
                        "source_snippet": snippet_text,
                        "source_section": "skills",
                        "character_start": char_start,
                        "character_end": char_end,
                        "confidence": EvidenceConfidence.MEDIUM,
                        "evidence_kind": EvidenceKind.INFERRED,
                        "type": "transferable",
                        "requirement": f"{job_skill.name} Requirement",
                        "claim": f"Transferable adjacent competency detected ({transferable_match.title()}).",
                    })
                else:
                    # Missing mention: status is NOT_DETECTED, not GAP (preserves Uncertainty First principle)
                    missing_skills.append(job_skill.name)
                    status_val = EvaluatedSkillStatus.NOT_DETECTED
                    evaluated_requirements.append(
                        EvaluatedRequirement(required=job_skill.required, status=status_val)
                    )
                    evaluated_skills_records.append({
                        "name": job_skill.name,
                        "status": status_val,
                        "evidence_ref": None,
                    })
                    evidence_claims_records.append({
                        "claim_type": "not_detected",
                        "claim_text": f"No direct or transferable evidence detected for '{job_skill.name}'",
                        "source_snippet": None,
                        "source_section": "skills",
                        "character_start": None,
                        "character_end": None,
                        "confidence": EvidenceConfidence.LOW,
                        "evidence_kind": EvidenceKind.DIRECT,
                        "type": "not_detected",
                        "requirement": f"{job_skill.name} Requirement",
                        "claim": f"No documented evidence of '{job_skill.name}' found in provided documents.",
                        "details": f"Requirement '{job_skill.name}' ({'required' if job_skill.required else 'preferred'}) was not detected in candidate resume or credentials.",
                    })

        # Calculate skills score with both required and preferred skills contribution
        required_job_skills = [s for s in job.skills if s.required]
        preferred_job_skills = [s for s in job.skills if not s.required]

        if required_job_skills and preferred_job_skills:
            req_matched = matched_required_count + 0.5 * sum(1 for s in transferable_skills if any(js.name == s and js.required for js in job.skills))
            pref_matched = (len(matched_skills) - matched_required_count) + 0.5 * sum(1 for s in transferable_skills if any(js.name == s and not js.required for js in job.skills))
            req_ratio = req_matched / len(required_job_skills)
            pref_ratio = pref_matched / len(preferred_job_skills)
            skills_score = round(min(max((0.80 * req_ratio + 0.20 * pref_ratio) * 100, 0.0), 100.0), 1)
        elif required_job_skills:
            req_matched = matched_required_count + 0.5 * sum(1 for s in transferable_skills if any(js.name == s and js.required for js in job.skills))
            skills_score = round(min(max((req_matched / len(required_job_skills)) * 100, 0.0), 100.0), 1)
        elif preferred_job_skills:
            pref_matched = len(matched_skills) + 0.5 * len(transferable_skills)
            skills_score = round(min(max((pref_matched / len(preferred_job_skills)) * 100, 0.0), 100.0), 1)
        else:
            skills_score = 100.0

        # 2. Experience Score
        candidate_years = float(candidate.total_experience_years or 0.0)
        required_years = float(job.experience_min_years or 0.0)
        tenure_delta = round(candidate_years - required_years, 2)

        if required_years <= 0:
            experience_score = 100.0
        else:
            exp_ratio = candidate_years / required_years
            experience_score = round(min(max(exp_ratio * 100, 0.0), 100.0), 1)

        evidence_claims_records.append({
            "claim_type": "experience_matched" if tenure_delta >= 0 else "experience_gap",
            "claim_text": f"{candidate_years} years vs required {required_years} years",
            "source_snippet": None,
            "source_section": "experience",
            "confidence": EvidenceConfidence.HIGH,
            "evidence_kind": EvidenceKind.DIRECT,
            "type": "matched" if tenure_delta >= 0 else "gap",
            "requirement": "Minimum Experience Threshold",
            "claim": f"Candidate has {candidate_years} yrs of experience (Target: {required_years} yrs).",
            "details": f"Tenure satisfies requirement ({candidate_years} yrs >= {required_years} yrs)." if tenure_delta >= 0 else f"Deficit of {abs(tenure_delta)} yrs against target requirement.",
        })

        # 3. Education Score (no invented "Bachelor" default)
        candidate_degree = None
        if candidate.education and isinstance(candidate.education, dict):
            candidate_degree = candidate.education.get("degree")

        required_degree = job.education_required or "Any"

        if required_degree == "Any":
            education_score = 100.0
            edu_status = "matched"
            edu_details = "Job accepts any educational background."
        elif not candidate_degree or candidate_degree in ("Not Specified", "None", ""):
            education_score = 40.0
            edu_status = "not_provided"
            edu_details = f"Education credential not provided or detected; required: {required_degree}."
        elif education_satisfies(candidate_degree, required_degree):
            education_score = 100.0
            edu_status = "matched"
            edu_details = f"Degree level ({candidate_degree}) satisfies requirement ({required_degree})."
        else:
            education_score = 50.0
            edu_status = "gap"
            edu_details = f"Degree level ({candidate_degree}) does not satisfy required {required_degree}."

        evidence_claims_records.append({
            "claim_type": f"education_{edu_status}",
            "claim_text": f"Degree level: {candidate_degree or 'Not Specified'} vs required {required_degree}",
            "source_snippet": None,
            "source_section": "education",
            "confidence": EvidenceConfidence.HIGH if candidate_degree else EvidenceConfidence.LOW,
            "evidence_kind": EvidenceKind.DIRECT,
            "type": edu_status,
            "requirement": "Education Requirement",
            "claim": f"Candidate degree ({candidate_degree or 'Not Specified'}) evaluated against requirement ({required_degree}).",
            "details": edu_details,
        })

        # 4. Semantic Similarity Score (using Sublinear TF Cosine Matcher)
        candidate_corpus = f"{candidate.name or ''} {candidate.headline or ''} {resume_text} {' '.join(all_candidate_skills)}"
        job_corpus = f"{job.title} {job.description} {' '.join(s.name for s in job.skills)}"

        semantic_result = self.semantic_matcher.match(
            candidate_text=candidate_corpus,
            job_text=job_corpus,
            candidate_skills=list(all_candidate_skills),
            job_skills=[s.name for s in job.skills],
        )
        semantic_score = semantic_result.similarity_score

        # Genuine token fuzzy overlap score using standard library difflib
        import difflib
        skill_cand_str = " ".join(sorted(all_candidate_skills))
        skill_job_str = " ".join(sorted(s.name.casefold() for s in job.skills))
        rapidfuzz_score = (
            round(difflib.SequenceMatcher(None, skill_cand_str, skill_job_str).ratio() * 100, 1)
            if skill_cand_str and skill_job_str
            else 0.0
        )

        # 5. Composite Weighted Overall Fit Score
        overall_score = calculate_weighted_score(
            weights,
            skills=skills_score,
            experience=experience_score,
            education=education_score,
            semantic=semantic_score,
        )

        # 6. Transparent Comparative Ranking Attributions
        why_ranked_here = [
            f"Matched {len(matched_skills)} core requirements: {', '.join(matched_skills[:4]) if matched_skills else 'None'}.",
            f"Experience level satisfies requirements ({candidate_years} yrs vs {required_years} yrs required)." if tenure_delta >= 0 else f"Holds relevant foundational experience ({candidate_years} yrs).",
        ]
        if transferable_skills:
            why_ranked_here.append(f"Transferable adjacent competencies recognized: {', '.join(transferable_skills)}.")
        if semantic_result.matched_concepts:
            why_ranked_here.append(f"Strong conceptual overlap with role requirements ({', '.join(semantic_result.matched_concepts[:3])}).")

        why_not_higher = []
        if missing_skills:
            why_not_higher.append(f"Not detected in documents: {', '.join(missing_skills[:4])}.")
        if tenure_delta < 0:
            why_not_higher.append(f"Experience deficit of {abs(tenure_delta)} years below target requirement.")
        if edu_status == "gap":
            why_not_higher.append(f"Degree level ({candidate_degree}) below target ({required_degree}).")
        if semantic_result.missing_concepts:
            why_not_higher.append(f"Limited contextual coverage on: {', '.join(semantic_result.missing_concepts[:2])}.")

        # Signal quality reflects truthfulness
        has_required_gap = tenure_delta < 0 or edu_status == "gap"
        has_not_detected = len(missing_skills) > 0
        if not has_required_gap and not has_not_detected:
            signal_quality = "clean_match"
        elif has_required_gap:
            signal_quality = "requirement_gap"
        elif has_not_detected:
            signal_quality = "conflicting_signal"
        else:
            signal_quality = "requirement_alert"

        return {
            "overall_score": overall_score,
            "skills_score": skills_score,
            "experience_score": experience_score,
            "education_score": education_score,
            "semantic_score": semantic_score,
            "rapidfuzz_score": rapidfuzz_score,
            "tenure_delta_years": tenure_delta,
            "signal_quality": signal_quality,
            "why_ranked_here": why_ranked_here,
            "why_not_higher": why_not_higher,
            "ranking_attribution": {
                "matched_skills": matched_skills,
                "transferable_skills": transferable_skills,
                "missing_skills": missing_skills,
            },
            "evaluated_skills": evaluated_skills_records,
            "evidence_claims": evidence_claims_records,
            "matched_skills": matched_skills,
            "transferable_skills": transferable_skills,
            "missing_skills": missing_skills,
        }



class EvaluationService:
    """Orchestrates evaluation runs and persistence of MatchResult and evidence claims."""

    def __init__(self, engine: BaseEvaluationEngine | None = None) -> None:
        self.engine = engine or DeterministicEvaluationEngine()

    def evaluate_application(
        self,
        db: Session,
        *,
        application_id: UUID,
        recruiter_id: UUID,
    ) -> EvaluationRun:
        application = (
            db.query(Application)
            .options(
                selectinload(Application.job).selectinload(Job.skills),
                selectinload(Application.candidate),
                selectinload(Application.resume),
            )
            .filter(Application.id == application_id)
            .one_or_none()
        )
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        job = application.job
        if job.recruiter_id != recruiter_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

        weights = Weights(
            skills=float(job.skills_weight),
            experience=float(job.experience_weight),
            education=float(job.education_weight),
            semantic=float(job.semantic_weight),
        )

        candidate = application.candidate
        resume = application.resume

        eval_result = self.engine.evaluate(
            job=job,
            candidate=candidate,
            resume=resume,
            weights=weights,
        )

        # Create immutable EvaluationRun snapshot
        run = EvaluationRun(
            application_id=application.id,
            status=EvaluationStatus.COMPLETED,
            scoring_version="deterministic-v2-taxonomy",
            weights_used={
                "skills": job.skills_weight,
                "experience": job.experience_weight,
                "education": job.education_weight,
                "semantic": job.semantic_weight,
            },
            completed_at=datetime.now(UTC),
        )
        db.add(run)
        db.flush()

        # Create MatchResult
        match_result = MatchResult(
            evaluation_run_id=run.id,
            overall_score=eval_result["overall_score"],
            skills_score=eval_result["skills_score"],
            experience_score=eval_result["experience_score"],
            education_score=eval_result["education_score"],
            semantic_score=eval_result["semantic_score"],
            rapidfuzz_score=eval_result["rapidfuzz_score"],
            tenure_delta_years=eval_result["tenure_delta_years"],
            signal_quality=eval_result["signal_quality"],
            ranking_attribution=eval_result["ranking_attribution"],
            why_ranked_here=eval_result["why_ranked_here"],
            why_not_higher=eval_result["why_not_higher"],
        )
        db.add(match_result)
        db.flush()

        for es in eval_result["evaluated_skills"]:
            db.add(
                EvaluatedSkill(
                    match_result_id=match_result.id,
                    name=es["name"],
                    status=es["status"],
                    evidence_ref=es.get("evidence_ref"),
                )
            )

        for ec in eval_result["evidence_claims"]:
            db.add(
                EvidenceClaim(
                    match_result_id=match_result.id,
                    claim_type=ec["claim_type"],
                    claim_text=ec["claim_text"],
                    source_snippet=ec["source_snippet"],
                    source_section=ec.get("source_section"),
                    character_start=ec.get("character_start"),
                    character_end=ec.get("character_end"),
                    confidence=ec.get("confidence"),
                    evidence_kind=ec.get("evidence_kind"),
                )
            )

        # Update application status to under review if new
        if application.status == ApplicationStatus.NEW:
            application.status = ApplicationStatus.UNDER_REVIEW

        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def get_candidate_card(
        db: Session,
        *,
        application: Application,
        recruiter_id: UUID,
    ) -> CandidateCardDTO:
        job = application.job
        candidate = application.candidate
        latest_run = (
            db.query(EvaluationRun)
            .options(
                selectinload(EvaluationRun.match_result).selectinload(MatchResult.evaluated_skills),
                selectinload(EvaluationRun.match_result).selectinload(MatchResult.evidence_claims),
            )
            .filter(EvaluationRun.application_id == application.id)
            .order_by(EvaluationRun.created_at.desc())
            .first()
        )

        match_result = latest_run.match_result if latest_run else None

        # Fetch recruiter notes
        notes = (
            db.query(RecruiterNote)
            .filter(RecruiterNote.application_id == application.id)
            .order_by(RecruiterNote.created_at.desc())
            .first()
        )

        evidence_items: list[CandidateEvidenceItem] = []
        if match_result:
            for claim in match_result.evidence_claims:
                ctype = claim.claim_type.lower()
                if "gap" in ctype:
                    evidence_type = "gap"
                elif "transferable" in ctype:
                    evidence_type = "transferable"
                elif "not_detected" in ctype or "missing" in ctype:
                    evidence_type = "not_detected"
                elif "not_provided" in ctype:
                    evidence_type = "not_provided"
                else:
                    evidence_type = "matched"

                evidence_items.append(
                    CandidateEvidenceItem(
                        requirement=claim.claim_type.replace("_", " ").title(),
                        claim=claim.claim_text,
                        sourceText=claim.source_snippet,
                        type=evidence_type,
                        details=claim.source_snippet,
                    )
                )

        candidate_skills = []
        if candidate.education and isinstance(candidate.education, dict):
            candidate_skills = candidate.education.get("skills", [])

        status_map = {
            ApplicationStatus.NEW: "screened",
            ApplicationStatus.UNDER_REVIEW: "screened",
            ApplicationStatus.SHORTLISTED: "shortlisted",
            ApplicationStatus.REJECTED: "rejected",
        }
        ui_status = status_map.get(application.status, "screened")

        return CandidateCardDTO(
            id=candidate.id,
            application_id=application.id,
            jobId=job.id,
            name=candidate.name or candidate.email or "Applicant",
            currentRole=candidate.headline or "Candidate",
            location=candidate.location,
            experienceYears=candidate.total_experience_years or 0.0,
            education=candidate.education.get("degree") if isinstance(candidate.education, dict) else "Degree",
            skills=candidate_skills,
            certifications=[],
            matchScore=match_result.overall_score if match_result else 0.0,
            skillScore=match_result.skills_score if match_result else 0.0,
            experienceScore=match_result.experience_score if match_result else 0.0,
            educationScore=match_result.education_score if match_result else 0.0,
            semanticScore=match_result.semantic_score if match_result else 0.0,
            matchedSkills=(match_result.ranking_attribution.get("matched_skills", []) if match_result and match_result.ranking_attribution else []),
            transferableSkills=(match_result.ranking_attribution.get("transferable_skills", []) if match_result and match_result.ranking_attribution else []),
            missingSkills=(match_result.ranking_attribution.get("missing_skills", []) if match_result and match_result.ranking_attribution else []),
            status=ui_status,
            evidence=evidence_items,
            recruiterNotes=notes.body if notes else None,
        )
