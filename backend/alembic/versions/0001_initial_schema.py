"""create CareerSync relational schema

Revision ID: 0001_initial_schema
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    user_role = sa.Enum("candidate", "recruiter", "admin", name="user_role")
    job_status = sa.Enum("draft", "open", "closed", "archived", name="job_status")
    application_status = sa.Enum("new", "under_review", "shortlisted", "rejected", name="application_status")
    processing_status = sa.Enum("queued", "uploading", "processing", "completed", "needs_attention", name="processing_status")
    attention_reason = sa.Enum("file_corrupted", "parse_failed", "partial_extraction", "scanned_document", "duplicate_file", "analysis_failed", "analysis_partial", name="attention_reason")
    evaluation_status = sa.Enum("queued", "running", "completed", "failed", name="evaluation_status")
    evaluated_skill_status = sa.Enum("matched", "transferable", "not_detected", "not_provided", "gap", name="evaluated_skill_status")
    evidence_confidence = sa.Enum("high", "medium", "low", name="evidence_confidence")
    evidence_kind = sa.Enum("direct", "inferred", name="evidence_kind")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "recruiter_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_name", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_recruiter_profiles_user_id", "recruiter_profiles", ["user_id"])

    op.create_table(
        "candidate_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("email", sa.String(320)),
        sa.Column("name", sa.String(255)),
        sa.Column("headline", sa.String(255)),
        sa.Column("location", sa.String(255)),
        sa.Column("total_experience_years", sa.Float()),
        sa.Column("education", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_candidate_profiles_user_id", "candidate_profiles", ["user_id"])
    op.create_index("ix_candidate_profiles_email", "candidate_profiles", ["email"])

    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recruiter_id", sa.Uuid(), sa.ForeignKey("recruiter_profiles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("department", sa.String(255)),
        sa.Column("location", sa.String(255)),
        sa.Column("employment_type", sa.String(32), nullable=False),
        sa.Column("work_arrangement", sa.String(32), nullable=False),
        sa.Column("experience_min_years", sa.Float(), nullable=False, server_default="0"),
        sa.Column("education_required", sa.String(32), nullable=False, server_default="Any"),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", job_status, nullable=False),
        sa.Column("skills_weight", sa.Integer(), nullable=False, server_default="35"),
        sa.Column("experience_weight", sa.Integer(), nullable=False, server_default="35"),
        sa.Column("education_weight", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("semantic_weight", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("skills_weight + experience_weight + education_weight + semantic_weight = 100", name="ck_jobs_weights_total_100"),
        sa.CheckConstraint("skills_weight >= 0 AND experience_weight >= 0 AND education_weight >= 0 AND semantic_weight >= 0", name="ck_jobs_weights_nonnegative"),
    )
    op.create_index("ix_jobs_recruiter_id", "jobs", ["recruiter_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])

    op.create_table(
        "job_skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("normalized_name", sa.String(255), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("min_years", sa.Float()),
        sa.UniqueConstraint("job_id", "normalized_name", name="uq_job_skill_normalized"),
    )
    op.create_index("ix_job_skills_job_id", "job_skills", ["job_id"])

    op.create_table(
        "resumes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("candidate_id", sa.Uuid(), sa.ForeignKey("candidate_profiles.id", ondelete="SET NULL")),
        sa.Column("ingestion_job_id", sa.Uuid(), sa.ForeignKey("jobs.id", ondelete="RESTRICT")),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("processing_status", processing_status, nullable=False),
        sa.Column("needs_attention_reason", attention_reason),
        sa.Column("parser_method", sa.String(32)),
        sa.Column("extracted_text", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("storage_key"),
        sa.UniqueConstraint("ingestion_job_id", "sha256", name="uq_resume_job_sha256"),
        sa.CheckConstraint("octet_length(sha256) = 64", name="ck_resume_sha256_length"),
    )
    op.create_index("ix_resumes_candidate_id", "resumes", ["candidate_id"])
    op.create_index("ix_resumes_ingestion_job_id", "resumes", ["ingestion_job_id"])
    op.create_index("ix_resumes_processing_status", "resumes", ["processing_status"])

    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("candidate_id", sa.Uuid(), sa.ForeignKey("candidate_profiles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("resume_id", sa.Uuid(), sa.ForeignKey("resumes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", application_status, nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("job_id", "candidate_id", name="uq_application_job_candidate"),
    )
    op.create_index("ix_applications_candidate_id", "applications", ["candidate_id"])
    op.create_index("ix_applications_job_id", "applications", ["job_id"])
    op.create_index("ix_applications_resume_id", "applications", ["resume_id"])
    op.create_index("ix_applications_status", "applications", ["status"])

    op.create_table(
        "evaluation_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("application_id", sa.Uuid(), sa.ForeignKey("applications.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", evaluation_status, nullable=False),
        sa.Column("parser_version", sa.String(128)),
        sa.Column("extractor_version", sa.String(128)),
        sa.Column("embedding_model_version", sa.String(128)),
        sa.Column("scoring_version", sa.String(128), nullable=False),
        sa.Column("weights_used", sa.JSON(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_evaluation_runs_application_id", "evaluation_runs", ["application_id"])
    op.create_index("ix_evaluation_runs_status", "evaluation_runs", ["status"])

    op.create_table(
        "match_results",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("evaluation_run_id", sa.Uuid(), sa.ForeignKey("evaluation_runs.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("skills_score", sa.Float(), nullable=False),
        sa.Column("experience_score", sa.Float(), nullable=False),
        sa.Column("education_score", sa.Float(), nullable=False),
        sa.Column("semantic_score", sa.Float(), nullable=False),
        sa.Column("rapidfuzz_score", sa.Float(), nullable=False),
        sa.Column("tenure_delta_years", sa.Float(), nullable=False),
        sa.Column("signal_quality", sa.String(64), nullable=False),
        sa.Column("ranking_attribution", sa.JSON(), nullable=False),
        sa.Column("why_ranked_here", sa.JSON(), nullable=False),
        sa.Column("why_not_higher", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("evaluation_run_id", name="uq_match_evaluation_run"),
        sa.CheckConstraint("overall_score >= 0 AND overall_score <= 100", name="ck_match_overall_range"),
    )
    op.create_table(
        "evaluated_skills",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("match_result_id", sa.Uuid(), sa.ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", evaluated_skill_status, nullable=False),
        sa.Column("evidence_ref", sa.String(255)),
    )
    op.create_index("ix_evaluated_skills_match_result_id", "evaluated_skills", ["match_result_id"])

    op.create_table(
        "evidence_claims",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("match_result_id", sa.Uuid(), sa.ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claim_type", sa.String(128), nullable=False),
        sa.Column("claim_text", sa.Text(), nullable=False),
        sa.Column("source_document_id", sa.Uuid()),
        sa.Column("source_page", sa.Integer()),
        sa.Column("source_snippet", sa.Text(), nullable=False),
        sa.Column("source_section", sa.String(255)),
        sa.Column("character_start", sa.Integer()),
        sa.Column("character_end", sa.Integer()),
        sa.Column("confidence", evidence_confidence),
        sa.Column("evidence_kind", evidence_kind),
    )
    op.create_index("ix_evidence_claims_match_result_id", "evidence_claims", ["match_result_id"])

    op.create_table(
        "recruiter_notes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("application_id", sa.Uuid(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recruiter_id", sa.Uuid(), sa.ForeignKey("recruiter_profiles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_recruiter_notes_application_id", "recruiter_notes", ["application_id"])
    op.create_index("ix_recruiter_notes_recruiter_id", "recruiter_notes", ["recruiter_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(128), nullable=False),
        sa.Column("resource_id", sa.Uuid()),
        sa.Column("request_id", sa.String(64)),
        sa.Column("metadata_json", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column in ("actor_user_id", "action", "resource_id", "request_id", "created_at"):
        op.create_index(f"ix_audit_events_{column}", "audit_events", [column])

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("replaced_by_id", sa.Uuid()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])
    op.create_index("ix_refresh_sessions_token_hash", "refresh_sessions", ["token_hash"])
    op.create_index("ix_refresh_sessions_expires_at", "refresh_sessions", ["expires_at"])

    op.create_table(
        "resume_embeddings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("resume_id", sa.Uuid(), sa.ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("model_version", sa.String(128), nullable=False),
        sa.Column("vector", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("resume_id"),
    )
    op.create_index("ix_resume_embeddings_resume_id", "resume_embeddings", ["resume_id"])
    # Replace the temporary text column with pgvector after the extension exists.
    op.execute("ALTER TABLE resume_embeddings ALTER COLUMN vector TYPE vector(1024) USING vector::vector")


def downgrade() -> None:
    for table in (
        "resume_embeddings", "refresh_sessions", "audit_events", "recruiter_notes", "evidence_claims",
        "evaluated_skills", "match_results", "evaluation_runs", "applications", "resumes", "job_skills",
        "jobs", "candidate_profiles", "recruiter_profiles", "users",
    ):
        op.drop_table(table)
    for enum_name in (
        "evidence_kind", "evidence_confidence", "evaluated_skill_status", "evaluation_status",
        "attention_reason", "processing_status", "application_status", "job_status", "user_role",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
    op.execute("DROP EXTENSION IF EXISTS vector")
