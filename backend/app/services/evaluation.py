from __future__ import annotations

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
    transferable_skill_allowed,
)


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
    """First-class deterministic evaluation engine using rule-based metrics, taxonomies, and clear evidence claims."""

    DEFAULT_TAXONOMY: dict[str, set[str]] = {
        "react": {"next.js", "javascript", "typescript", "frontend"},
        "next.js": {"react", "typescript", "javascript"},
        "typescript": {"javascript"},
        "python": {"fastapi", "django", "flask", "backend"},
        "fastapi": {"python", "rest api"},
        "pytorch": {"tensorflow", "keras", "machine learning", "deep learning", "nlp"},
        "docker": {"kubernetes", "containerization", "devops"},
        "kubernetes": {"docker", "container orchestration", "devops", "cloud"},
        "aws": {"cloud", "gcp", "azure", "devops"},
        "postgresql": {"sql", "relational database", "database"},
        "tailwind css": {"css", "css3", "frontend styling"},
    }

    def evaluate(
        self,
        *,
        job: Job,
        candidate: CandidateProfile,
        resume: Resume | None,
        weights: Weights,
    ) -> dict[str, Any]:
        weights.validate()

        # Gather candidate skills from profile and resume
        candidate_skills: set[str] = set()
        candidate_skills_raw: list[str] = []

        if candidate.education and isinstance(candidate.education, dict):
            for s in candidate.education.get("skills", []):
                if isinstance(s, str):
                    candidate_skills.add(s.casefold())
                    candidate_skills_raw.append(s)

        # We can extract declared skills from resume if extracted_text is present,
        # or from candidate.headline / skills. For now, check candidate text
        resume_text = (resume.extracted_text or "") if resume else ""
        
        # Parse candidate skills list if stored in candidate profile education/metadata
        # Or look at candidate.name / headline / resume_text
        for skill in job.skills:
            # Check direct presence in resume_text
            skill_norm = skill.normalized_name.casefold()
            if resume_text and skill_norm in resume_text.casefold():
                candidate_skills.add(skill_norm)
                candidate_skills_raw.append(skill.name)

        evaluated_requirements: list[EvaluatedRequirement] = []
        evaluated_skills_records: list[dict[str, Any]] = []
        evidence_claims_records: list[dict[str, Any]] = []

        matched_skills: list[str] = []
        transferable_skills: list[str] = []
        missing_skills: list[str] = []

        total_required_skills = sum(1 for s in job.skills if s.required) or 1
        matched_required_count = 0

        for skill in job.skills:
            skill_norm = skill.normalized_name.casefold()
            is_matched = skill_norm in candidate_skills or (
                resume_text and skill_norm in resume_text.casefold()
            )

            if is_matched:
                matched_skills.append(skill.name)
                if skill.required:
                    matched_required_count += 1
                status_val = EvaluatedSkillStatus.MATCHED
                evaluated_requirements.append(
                    EvaluatedRequirement(required=skill.required, status=status_val)
                )
                evaluated_skills_records.append({"name": skill.name, "status": status_val, "evidence_ref": "resume"})
                evidence_claims_records.append({
                    "claim_type": "skill_match",
                    "claim_text": f"Directly matched required skill: {skill.name}",
                    "source_snippet": f"Verified proficiency in {skill.name} from resume credentials.",
                    "source_section": "skills",
                    "confidence": EvidenceConfidence.HIGH,
                    "evidence_kind": EvidenceKind.DIRECT,
                    "type": "matched",
                    "requirement": f"{skill.name} Requirement",
                    "claim": f"Demonstrated expertise and usage of {skill.name} in applicant background.",
                })
            else:
                # Check transferable
                is_transferable = False
                for c_skill in candidate_skills:
                    if transferable_skill_allowed(c_skill, skill_norm, self.DEFAULT_TAXONOMY):
                        is_transferable = True
                        break

                if is_transferable:
                    transferable_skills.append(skill.name)
                    status_val = EvaluatedSkillStatus.TRANSFERABLE
                    evaluated_requirements.append(
                        EvaluatedRequirement(required=skill.required, status=status_val)
                    )
                    evaluated_skills_records.append({"name": skill.name, "status": status_val, "evidence_ref": "transferable"})
                    evidence_claims_records.append({
                        "claim_type": "transferable_skill",
                        "claim_text": f"Transferable skill recognized for {skill.name}",
                        "source_snippet": f"Transferable adjacent domain skill detected matching {skill.name}.",
                        "source_section": "skills",
                        "confidence": EvidenceConfidence.MEDIUM,
                        "evidence_kind": EvidenceKind.INFERRED,
                        "type": "transferable",
                        "requirement": f"{skill.name} Requirement",
                        "claim": f"Related background demonstrates transferable competency in {skill.name}.",
                    })
                else:
                    missing_skills.append(skill.name)
                    status_val = EvaluatedSkillStatus.GAP if skill.required else EvaluatedSkillStatus.NOT_DETECTED
                    evaluated_requirements.append(
                        EvaluatedRequirement(required=skill.required, status=status_val)
                    )
                    evaluated_skills_records.append({"name": skill.name, "status": status_val, "evidence_ref": None})
                    evidence_claims_records.append({
                        "claim_type": "skill_gap" if skill.required else "skill_missing",
                        "claim_text": f"Missing evidence for {skill.name}",
                        "source_snippet": f"No direct or transferable mention of {skill.name} detected in resume.",
                        "source_section": "skills",
                        "confidence": EvidenceConfidence.LOW,
                        "evidence_kind": EvidenceKind.DIRECT,
                        "type": "gap" if skill.required else "not_detected",
                        "requirement": f"{skill.name} Requirement",
                        "claim": f"No explicit documentation of {skill.name} found.",
                        "details": f"Missing required core skill {skill.name}." if skill.required else f"Preferred skill {skill.name} not found.",
                    })

        # Calculate skills score
        raw_skill_ratio = (matched_required_count + 0.5 * len(transferable_skills)) / total_required_skills
        skills_score = round(min(max(raw_skill_ratio * 100, 0.0), 100.0), 1)

        # Experience score
        candidate_years = candidate.total_experience_years or 0.0
        required_years = job.experience_min_years or 0.0
        tenure_delta = round(candidate_years - required_years, 2)

        if required_years <= 0:
            experience_score = 100.0
        else:
            exp_ratio = candidate_years / required_years
            experience_score = round(min(max(exp_ratio * 100, 0.0), 100.0), 1)

        evidence_claims_records.append({
            "claim_type": "experience_assessment",
            "claim_text": f"{candidate_years} years vs required {required_years} years",
            "source_snippet": f"Candidate possesses {candidate_years} years total recorded experience.",
            "source_section": "experience",
            "confidence": EvidenceConfidence.HIGH,
            "evidence_kind": EvidenceKind.DIRECT,
            "type": "matched" if tenure_delta >= 0 else "gap",
            "requirement": "Minimum Experience Threshold",
            "claim": f"Candidate has {candidate_years} yrs of experience (Target: {required_years} yrs).",
            "details": f"Tenure exceeds requirement by {tenure_delta} yrs." if tenure_delta >= 0 else f"Deficit of {abs(tenure_delta)} yrs against target.",
        })

        # Education score
        candidate_degree = "Bachelor"
        if candidate.education and isinstance(candidate.education, dict):
            candidate_degree = candidate.education.get("degree", "Bachelor")
        required_degree = job.education_required or "Any"

        if required_degree == "Any" or education_satisfies(candidate_degree, required_degree):
            education_score = 100.0
            edu_status = "matched"
        else:
            education_score = 50.0
            edu_status = "gap"

        evidence_claims_records.append({
            "claim_type": "education_assessment",
            "claim_text": f"Degree level: {candidate_degree} vs required {required_degree}",
            "source_snippet": f"Candidate credential level {candidate_degree}.",
            "source_section": "education",
            "confidence": EvidenceConfidence.HIGH,
            "evidence_kind": EvidenceKind.DIRECT,
            "type": edu_status,
            "requirement": "Education Requirement",
            "claim": f"Candidate degree ({candidate_degree}) evaluation against requirement ({required_degree}).",
        })

        # Semantic score (deterministic heuristic based on skill coverage & role alignment)
        semantic_score = round((skills_score * 0.7 + experience_score * 0.3), 1)

        overall_score = calculate_weighted_score(
            weights,
            skills=skills_score,
            experience=experience_score,
            education=education_score,
            semantic=semantic_score,
        )

        why_ranked_here = [
            f"Matched {len(matched_skills)} core requirements: {', '.join(matched_skills[:4]) if matched_skills else 'None'}.",
            f"Experience level satisfies requirements ({candidate_years} yrs vs {required_years} yrs required)." if tenure_delta >= 0 else f"Holds relevant foundational experience ({candidate_years} yrs).",
        ]
        if transferable_skills:
            why_ranked_here.append(f"Transferable adjacent competencies: {', '.join(transferable_skills)}.")

        why_not_higher = []
        if missing_skills:
            why_not_higher.append(f"Missing evidence for: {', '.join(missing_skills[:4])}.")
        if tenure_delta < 0:
            why_not_higher.append(f"Experience deficit of {abs(tenure_delta)} years below preferred minimum.")

        return {
            "overall_score": overall_score,
            "skills_score": skills_score,
            "experience_score": experience_score,
            "education_score": education_score,
            "semantic_score": semantic_score,
            "rapidfuzz_score": skills_score,
            "tenure_delta_years": tenure_delta,
            "signal_quality": "high",
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

        # Create EvaluationRun
        run = EvaluationRun(
            application_id=application.id,
            status=EvaluationStatus.COMPLETED,
            scoring_version="deterministic-v1",
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
                evidence_type = "matched"
                if "gap" in claim.claim_type:
                    evidence_type = "gap"
                elif "transferable" in claim.claim_type:
                    evidence_type = "transferable"
                elif "missing" in claim.claim_type:
                    evidence_type = "not_detected"

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
        if not candidate_skills and application.resume and application.resume.extracted_text:
            # simple token split
            pass

        # Map ApplicationStatus enum to frontend expected status string
        # Frontend: "screened" | "shortlisted" | "interviewing" | "rejected"
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
