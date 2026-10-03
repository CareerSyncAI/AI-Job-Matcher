from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.entities import Job, JobSkill, RecruiterProfile
from app.schemas.jobs import JobCreate, JobResponse, JobUpdate, JobWeights


class JobService:
    @staticmethod
    def owned_job(db: Session, *, job_id, recruiter_id) -> Job:
        job = (
            db.query(Job)
            .options(selectinload(Job.skills))
            .filter(Job.id == job_id, Job.recruiter_id == recruiter_id)
            .one_or_none()
        )
        if not job:
            # Deliberately use 404 to avoid revealing another recruiter's resource.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
        return job

    @staticmethod
    def create(db: Session, recruiter: RecruiterProfile, payload: JobCreate) -> Job:
        weights = payload.evaluation_weights
        job = Job(
            recruiter_id=recruiter.id,
            title=payload.title.strip(),
            department=payload.department,
            location=payload.location,
            employment_type=payload.employment_type,
            work_arrangement=payload.work_arrangement,
            experience_min_years=payload.experience_min_years,
            education_required=payload.education_required,
            description=payload.description,
            status=payload.status,
            skills_weight=weights.skills,
            experience_weight=weights.experience,
            education_weight=weights.education,
            semantic_weight=weights.semantic,
        )
        job.skills = JobService._skill_models(payload.skills)
        db.add(job)
        return job

    @staticmethod
    def update(job: Job, payload: JobUpdate) -> Job:
        values = payload.model_dump(exclude_unset=True, exclude={"skills", "evaluation_weights"})
        for field, value in values.items():
            setattr(job, field, value)
        if payload.evaluation_weights:
            job.skills_weight = payload.evaluation_weights.skills
            job.experience_weight = payload.evaluation_weights.experience
            job.education_weight = payload.evaluation_weights.education
            job.semantic_weight = payload.evaluation_weights.semantic
        if payload.skills is not None:
            job.skills.clear()
            job.skills.extend(JobService._skill_models(payload.skills))
        return job

    @staticmethod
    def response(job: Job, applicant_count: int = 0) -> JobResponse:
        return JobResponse(
            id=job.id,
            title=job.title,
            department=job.department,
            location=job.location,
            employment_type=job.employment_type,
            work_arrangement=job.work_arrangement,
            experience_min_years=job.experience_min_years,
            education_required=job.education_required,
            description=job.description,
            status=job.status,
            skills=job.skills,
            evaluation_weights=JobWeights(
                skills=job.skills_weight,
                experience=job.experience_weight,
                education=job.education_weight,
                semantic=job.semantic_weight,
            ),
            created_at=job.created_at,
            applicant_count=applicant_count,
        )

    @staticmethod
    def _skill_models(skills) -> list[JobSkill]:
        seen: set[str] = set()
        models: list[JobSkill] = []
        for skill in skills:
            normalized = skill.name.strip().casefold()
            if normalized in seen:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Duplicate job skill.")
            seen.add(normalized)
            models.append(
                JobSkill(name=skill.name.strip(), normalized_name=normalized, required=skill.required, min_years=skill.min_years)
            )
        return models
