"""Initial CareerSync PostgreSQL schema with pgvector support.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("role", sa.Enum("candidate", "recruiter", "admin", name="user_role"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "recruiter_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_recruiter_profiles_user_id"), "recruiter_profiles", ["user_id"], unique=True)

    op.create_table(
        "candidate_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("headline", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("total_experience_years", sa.Float(), nullable=True),
        sa.Column("education", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_candidate_profiles_email"), "candidate_profiles", ["email"], unique=True)
    op.create_index(op.f("ix_candidate_profiles_user_id"), "candidate_profiles", ["user_id"], unique=True)

    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("recruiter_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("employment_type", sa.String(length=32), nullable=False),
        sa.Column("work_arrangement", sa.String(length=32), nullable=False),
        sa.Column("experience_min_years", sa.Float(), nullable=False),
        sa.Column("education_required", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("draft", "open", "closed", "archived", name="job_status"), nullable=False),
        sa.Column("skills_weight", sa.Integer(), nullable=False),
        sa.Column("experience_weight", sa.Integer(), nullable=False),
        sa.Column("education_weight", sa.Integer(), nullable=False),
        sa.Column("semantic_weight", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("skills_weight + experience_weight + education_weight + semantic_weight = 100", name="ck_jobs_weights_total_100"),
        sa.CheckConstraint("skills_weight >= 0 AND experience_weight >= 0 AND education_weight >= 0 AND semantic_weight >= 0", name="ck_jobs_weights_nonnegative"),
        sa.ForeignKeyConstraint(["recruiter_id"], ["recruiter_profiles.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_jobs_recruiter_id"), "jobs", ["recruiter_id"], unique=False)

    op.create_table(
        "job_skills",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("normalized_name", sa.String(length=255), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("min_years", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "normalized_name", name="uq_job_skill_normalized"),
    )
    op.create_index(op.f("ix_job_skills_job_id"), "job_skills", ["job_id"], unique=False)

    op.create_table(
        "resumes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("candidate_id", sa.Uuid(), nullable=True),
        sa.Column("ingestion_job_id", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("processing_status", sa.Enum("queued", "uploading", "processing", "completed", "needs_attention", name="processing_status"), nullable=False),
        sa.Column("needs_attention_reason", sa.Enum("file_corrupted", "parse_failed", "partial_extraction", "scanned_document", "duplicate_file", "analysis_failed", "analysis_partial", name="attention_reason"), nullable=True),
        sa.Column("parser_method", sa.String(length=32), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("octet_length(sha256) = 64", name="ck_resume_sha256_length"),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ingestion_job_id"], ["jobs.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ingestion_job_id", "sha256", name="uq_resume_job_sha256"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(op.f("ix_resumes_candidate_id"), "resumes", ["candidate_id"], unique=False)
    op.create_index(op.f("ix_resumes_ingestion_job_id"), "resumes", ["ingestion_job_id"], unique=False)
    op.create_index(op.f("ix_resumes_processing_status"), "resumes", ["processing_status"], unique=False)

    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("candidate_id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("resume_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.Enum("new", "under_review", "shortlisted", "rejected", name="application_status"), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "candidate_id", name="uq_application_job_candidate"),
    )
    op.create_index(op.f("ix_applications_candidate_id"), "applications", ["candidate_id"], unique=False)
    op.create_index(op.f("ix_applications_job_id"), "applications", ["job_id"], unique=False)
    op.create_index(op.f("ix_applications_resume_id"), "applications", ["resume_id"], unique=False)
    op.create_index(op.f("ix_applications_status"), "applications", ["status"], unique=False)

    op.create_table(
        "evaluation_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.Enum("queued", "running", "completed", "failed", name="evaluation_status"), nullable=False),
        sa.Column("parser_version", sa.String(length=128), nullable=True),
        sa.Column("extractor_version", sa.String(length=128), nullable=True),
        sa.Column("embedding_model_version", sa.String(length=128), nullable=True),
        sa.Column("scoring_version", sa.String(length=128), nullable=False),
        sa.Column("weights_used", sa.JSON(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_evaluation_runs_application_id"), "evaluation_runs", ["application_id"], unique=False)
    op.create_index(op.f("ix_evaluation_runs_status"), "evaluation_runs", ["status"], unique=False)

    op.create_table(
        "match_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("evaluation_run_id", sa.Uuid(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("skills_score", sa.Float(), nullable=False),
        sa.Column("experience_score", sa.Float(), nullable=False),
        sa.Column("education_score", sa.Float(), nullable=False),
        sa.Column("semantic_score", sa.Float(), nullable=False),
        sa.Column("rapidfuzz_score", sa.Float(), nullable=False),
        sa.Column("tenure_delta_years", sa.Float(), nullable=False),
        sa.Column("signal_quality", sa.String(length=64), nullable=False),
        sa.Column("ranking_attribution", sa.JSON(), nullable=False),
        sa.Column("why_ranked_here", sa.JSON(), nullable=False),
        sa.Column("why_not_higher", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("overall_score >= 0 AND overall_score <= 100", name="ck_match_overall_range"),
        sa.ForeignKeyConstraint(["evaluation_run_id"], ["evaluation_runs.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("evaluation_run_id", name="uq_match_evaluation_run"),
    )

    op.create_table(
        "evaluated_skills",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("match_result_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.Enum("matched", "transferable", "not_detected", "not_provided", "gap", name="evaluated_skill_status"), nullable=False),
        sa.Column("evidence_ref", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["match_result_id"], ["match_results.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_evaluated_skills_match_result_id"), "evaluated_skills", ["match_result_id"], unique=False)

    op.create_table(
        "evidence_claims",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("match_result_id", sa.Uuid(), nullable=False),
        sa.Column("claim_type", sa.String(length=128), nullable=False),
        sa.Column("claim_text", sa.Text(), nullable=False),
        sa.Column("source_document_id", sa.Uuid(), nullable=True),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("source_snippet", sa.Text(), nullable=False),
        sa.Column("source_section", sa.String(length=255), nullable=True),
        sa.Column("character_start", sa.Integer(), nullable=True),
        sa.Column("character_end", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Enum("high", "medium", "low", name="evidence_confidence"), nullable=True),
        sa.Column("evidence_kind", sa.Enum("direct", "inferred", name="evidence_kind"), nullable=True),
        sa.ForeignKeyConstraint(["match_result_id"], ["match_results.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_evidence_claims_match_result_id"), "evidence_claims", ["match_result_id"], unique=False)

    op.create_table(
        "recruiter_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("recruiter_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recruiter_id"], ["recruiter_profiles.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recruiter_notes_application_id"), "recruiter_notes", ["application_id"], unique=False)
    op.create_index(op.f("ix_recruiter_notes_recruiter_id"), "recruiter_notes", ["recruiter_id"], unique=False)

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource_type", sa.String(length=128), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_events_action"), "audit_events", ["action"], unique=False)
    op.create_index(op.f("ix_audit_events_actor_user_id"), "audit_events", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_audit_events_created_at"), "audit_events", ["created_at"], unique=False)
    op.create_index(op.f("ix_audit_events_request_id"), "audit_events", ["request_id"], unique=False)
    op.create_index(op.f("ix_audit_events_resource_id"), "audit_events", ["resource_id"], unique=False)

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(op.f("ix_refresh_sessions_expires_at"), "refresh_sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_refresh_sessions_token_hash"), "refresh_sessions", ["token_hash"], unique=True)
    op.create_index(op.f("ix_refresh_sessions_user_id"), "refresh_sessions", ["user_id"], unique=False)

    op.create_table(
        "resume_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resume_id", sa.Uuid(), nullable=False),
        sa.Column("model_version", sa.String(length=128), nullable=False),
        sa.Column("vector", Vector(1024), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("resume_id"),
    )
    op.create_index(op.f("ix_resume_embeddings_resume_id"), "resume_embeddings", ["resume_id"], unique=True)


def downgrade() -> None:
    op.drop_table("resume_embeddings")
    op.drop_table("refresh_sessions")
    op.drop_table("audit_events")
    op.drop_table("recruiter_notes")
    op.drop_table("evidence_claims")
    op.drop_table("evaluated_skills")
    op.drop_table("match_results")
    op.drop_table("evaluation_runs")
    op.drop_table("applications")
    op.drop_table("resumes")
    op.drop_table("job_skills")
    op.drop_table("jobs")
    op.drop_table("candidate_profiles")
    op.drop_table("recruiter_profiles")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS evidence_kind;")
    op.execute("DROP TYPE IF EXISTS evidence_confidence;")
    op.execute("DROP TYPE IF EXISTS evaluated_skill_status;")
    op.execute("DROP TYPE IF EXISTS evaluation_status;")
    op.execute("DROP TYPE IF EXISTS attention_reason;")
    op.execute("DROP TYPE IF EXISTS processing_status;")
    op.execute("DROP TYPE IF EXISTS application_status;")
    op.execute("DROP TYPE IF EXISTS job_status;")
    op.execute("DROP TYPE IF EXISTS user_role;")
