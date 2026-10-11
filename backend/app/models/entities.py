from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import (
    ApplicationStatus,
    AttentionReason,
    EvaluatedSkillStatus,
    EvaluationStatus,
    EvidenceConfidence,
    EvidenceKind,
    JobStatus,
    ProcessingStatus,
    UserRole,
)
from app.models.mixins import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    recruiter_profile: Mapped[RecruiterProfile | None] = relationship(back_populates="user")
    candidate_profile: Mapped[CandidateProfile | None] = relationship(back_populates="user")
    refresh_sessions: Mapped[list[RefreshSession]] = relationship(back_populates="user")


class RecruiterProfile(TimestampMixin, Base):
    __tablename__ = "recruiter_profiles"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    organization_name: Mapped[str | None] = mapped_column(String(255))
    user: Mapped[User] = relationship(back_populates="recruiter_profile")
    jobs: Mapped[list[Job]] = relationship(back_populates="recruiter")


class CandidateProfile(TimestampMixin, Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), unique=True, index=True
    )
    email: Mapped[str | None] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255))
    headline: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    total_experience_years: Mapped[float | None] = mapped_column(Float)
    education: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    user: Mapped[User | None] = relationship(back_populates="candidate_profile")
    resumes: Mapped[list[Resume]] = relationship(back_populates="candidate")
    applications: Mapped[list[Application]] = relationship(back_populates="candidate")


class Job(TimestampMixin, Base):
    __tablename__ = "jobs"
    __table_args__ = (
        CheckConstraint(
            "skills_weight + experience_weight + education_weight + semantic_weight = 100",
            name="ck_jobs_weights_total_100",
        ),
        CheckConstraint(
            "skills_weight >= 0 AND experience_weight >= 0 AND education_weight >= 0 AND semantic_weight >= 0",
            name="ck_jobs_weights_nonnegative",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    recruiter_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("recruiter_profiles.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    department: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255))
    employment_type: Mapped[str] = mapped_column(String(32))
    work_arrangement: Mapped[str] = mapped_column(String(32))
    experience_min_years: Mapped[float] = mapped_column(Float, default=0)
    education_required: Mapped[str] = mapped_column(String(32), default="Any")
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus, name="job_status"), default=JobStatus.DRAFT)
    skills_weight: Mapped[int] = mapped_column(Integer, default=35)
    experience_weight: Mapped[int] = mapped_column(Integer, default=35)
    education_weight: Mapped[int] = mapped_column(Integer, default=15)
    semantic_weight: Mapped[int] = mapped_column(Integer, default=15)

    recruiter: Mapped[RecruiterProfile] = relationship(back_populates="jobs")
    skills: Mapped[list[JobSkill]] = relationship(back_populates="job", cascade="all, delete-orphan")
    resumes: Mapped[list[Resume]] = relationship(back_populates="ingestion_job")
    applications: Mapped[list[Application]] = relationship(back_populates="job")


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "normalized_name", name="uq_job_skill_normalized"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    normalized_name: Mapped[str] = mapped_column(String(255))
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    min_years: Mapped[float | None] = mapped_column(Float)

    job: Mapped[Job] = relationship(back_populates="skills")


class Resume(TimestampMixin, Base):
    __tablename__ = "resumes"
    __table_args__ = (
        UniqueConstraint("ingestion_job_id", "sha256", name="uq_resume_job_sha256"),
        CheckConstraint("octet_length(sha256) = 64", name="ck_resume_sha256_length"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    candidate_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="SET NULL"), index=True
    )
    ingestion_job_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="RESTRICT"), index=True
    )
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    mime_type: Mapped[str] = mapped_column(String(128))
    byte_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus, name="processing_status"), default=ProcessingStatus.QUEUED, index=True
    )
    needs_attention_reason: Mapped[AttentionReason | None] = mapped_column(
        Enum(AttentionReason, name="attention_reason")
    )
    parser_method: Mapped[str | None] = mapped_column(String(32))
    extracted_text: Mapped[str | None] = mapped_column(Text)

    candidate: Mapped[CandidateProfile | None] = relationship(back_populates="resumes")
    ingestion_job: Mapped[Job | None] = relationship(back_populates="resumes")
    applications: Mapped[list[Application]] = relationship(back_populates="resume")
    embedding: Mapped[ResumeEmbedding | None] = relationship(
        back_populates="resume", cascade="all, delete-orphan", uselist=False
    )


class Application(TimestampMixin, Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uq_application_job_candidate"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    candidate_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="RESTRICT"), index=True
    )
    job_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("jobs.id", ondelete="RESTRICT"), index=True
    )
    resume_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resumes.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, name="application_status"), default=ApplicationStatus.NEW, index=True
    )
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    candidate: Mapped[CandidateProfile] = relationship(back_populates="applications")
    job: Mapped[Job] = relationship(back_populates="applications")
    resume: Mapped[Resume] = relationship(back_populates="applications")
    evaluation_runs: Mapped[list[EvaluationRun]] = relationship(back_populates="application")
    notes: Mapped[list[RecruiterNote]] = relationship(back_populates="application")


class EvaluationRun(TimestampMixin, Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("applications.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[EvaluationStatus] = mapped_column(
        Enum(EvaluationStatus, name="evaluation_status"), default=EvaluationStatus.QUEUED, index=True
    )
    parser_version: Mapped[str | None] = mapped_column(String(128))
    extractor_version: Mapped[str | None] = mapped_column(String(128))
    embedding_model_version: Mapped[str | None] = mapped_column(String(128))
    scoring_version: Mapped[str] = mapped_column(String(128))
    weights_used: Mapped[dict[str, int]] = mapped_column(JSON)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    application: Mapped[Application] = relationship(back_populates="evaluation_runs")
    match_result: Mapped[MatchResult | None] = relationship(
        back_populates="evaluation_run", cascade="all, delete-orphan", uselist=False
    )


class MatchResult(Base):
    __tablename__ = "match_results"
    __table_args__ = (
        CheckConstraint("overall_score >= 0 AND overall_score <= 100", name="ck_match_overall_range"),
        UniqueConstraint("evaluation_run_id", name="uq_match_evaluation_run"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    evaluation_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evaluation_runs.id", ondelete="RESTRICT"), unique=True
    )
    overall_score: Mapped[float] = mapped_column(Float)
    skills_score: Mapped[float] = mapped_column(Float)
    experience_score: Mapped[float] = mapped_column(Float)
    education_score: Mapped[float] = mapped_column(Float)
    semantic_score: Mapped[float] = mapped_column(Float)
    rapidfuzz_score: Mapped[float] = mapped_column(Float)
    tenure_delta_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    signal_quality: Mapped[str] = mapped_column(String(64))
    ranking_attribution: Mapped[dict[str, list[str]]] = mapped_column(JSON)
    why_ranked_here: Mapped[list[str]] = mapped_column(JSON)
    why_not_higher: Mapped[list[str]] = mapped_column(JSON)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    evaluation_run: Mapped[EvaluationRun] = relationship(back_populates="match_result")
    evaluated_skills: Mapped[list[EvaluatedSkill]] = relationship(
        back_populates="match_result", cascade="all, delete-orphan"
    )
    evidence_claims: Mapped[list[EvidenceClaim]] = relationship(
        back_populates="match_result", cascade="all, delete-orphan"
    )


class EvaluatedSkill(Base):
    __tablename__ = "evaluated_skills"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    match_result_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("match_results.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[EvaluatedSkillStatus] = mapped_column(
        Enum(EvaluatedSkillStatus, name="evaluated_skill_status")
    )
    evidence_ref: Mapped[str | None] = mapped_column(String(255))

    match_result: Mapped[MatchResult] = relationship(back_populates="evaluated_skills")


class EvidenceClaim(Base):
    __tablename__ = "evidence_claims"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    match_result_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("match_results.id", ondelete="CASCADE"), index=True
    )
    claim_type: Mapped[str] = mapped_column(String(128))
    claim_text: Mapped[str] = mapped_column(Text)
    source_document_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    source_page: Mapped[int | None] = mapped_column(Integer)
    source_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_section: Mapped[str | None] = mapped_column(String(255))
    character_start: Mapped[int | None] = mapped_column(Integer)
    character_end: Mapped[int | None] = mapped_column(Integer)
    confidence: Mapped[EvidenceConfidence | None] = mapped_column(
        Enum(EvidenceConfidence, name="evidence_confidence")
    )
    evidence_kind: Mapped[EvidenceKind | None] = mapped_column(Enum(EvidenceKind, name="evidence_kind"))

    match_result: Mapped[MatchResult] = relationship(back_populates="evidence_claims")


class RecruiterNote(TimestampMixin, Base):
    __tablename__ = "recruiter_notes"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), index=True
    )
    recruiter_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("recruiter_profiles.id", ondelete="RESTRICT"), index=True
    )
    body: Mapped[str] = mapped_column(Text)

    application: Mapped[Application] = relationship(back_populates="notes")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    actor_user_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(128), index=True)
    resource_type: Mapped[str] = mapped_column(String(128))
    resource_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), index=True)
    request_id: Mapped[str | None] = mapped_column(String(64), index=True)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class RefreshSession(TimestampMixin, Base):
    __tablename__ = "refresh_sessions"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replaced_by_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))

    user: Mapped[User] = relationship(back_populates="refresh_sessions")


class ResumeEmbedding(TimestampMixin, Base):
    __tablename__ = "resume_embeddings"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resume_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), unique=True, index=True
    )
    model_version: Mapped[str] = mapped_column(String(128))
    vector: Mapped[list[float]] = mapped_column(Vector(1024))

    resume: Mapped[Resume] = relationship(back_populates="embedding")
