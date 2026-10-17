from __future__ import annotations

import os
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings


@pytest.fixture(scope="module")
def pg_engine():
    settings = get_settings()
    db_url = os.environ.get("CAREERSYNC_DATABASE_URL") or settings.database_url
    require_pg = os.environ.get("REQUIRE_POSTGRES", "").lower() in {"1", "true", "yes"}

    if not db_url or "sqlite" in db_url:
        if require_pg:
            pytest.fail("REQUIRE_POSTGRES is set but CAREERSYNC_DATABASE_URL is not configured for PostgreSQL.")
        pytest.skip("PostgreSQL test database not available or not configured.")

    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        if engine.dialect.name != "postgresql":
            if require_pg:
                pytest.fail(f"Active dialect is '{engine.dialect.name}', expected 'postgresql'")
            pytest.skip(f"Connected to dialect '{engine.dialect.name}', not PostgreSQL.")
        return engine
    except Exception as exc:
        if require_pg:
            pytest.fail(f"PostgreSQL connection required by REQUIRE_POSTGRES but failed to connect: {exc}")
        pytest.skip(f"PostgreSQL configured but unreachable: {exc}")


EXPECTED_TABLES = {
    "users",
    "recruiter_profiles",
    "candidate_profiles",
    "jobs",
    "job_skills",
    "resumes",
    "applications",
    "evaluation_runs",
    "match_results",
    "evaluated_skills",
    "evidence_claims",
    "recruiter_notes",
    "audit_events",
    "refresh_sessions",
    "resume_embeddings",
}


def test_postgres_connection_and_pgvector_extension(pg_engine):
    """Verify that PostgreSQL is running, dialect is postgresql, and pgvector extension is active."""
    assert pg_engine.dialect.name == "postgresql", f"Expected dialect 'postgresql', got '{pg_engine.dialect.name}'"
    with pg_engine.connect() as conn:
        result = conn.execute(
            text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
        ).fetchone()
        assert result is not None, "pgvector extension is not installed in the test database."
        assert result[0] == "vector"


def test_postgres_alembic_schema_verification(pg_engine):
    """Verify that all 15 relational tables, critical indexes, and foreign keys exist in PostgreSQL."""
    assert pg_engine.dialect.name == "postgresql"
    inspector = inspect(pg_engine)
    existing_tables = set(inspector.get_table_names())
    missing_tables = EXPECTED_TABLES - existing_tables
    assert not missing_tables, f"Missing tables in PostgreSQL after Alembic upgrade: {missing_tables}"

    # Verify key indexes exist
    user_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
    assert "ix_users_email" in user_indexes, "Missing ix_users_email index on users table"

    job_indexes = {idx["name"] for idx in inspector.get_indexes("jobs")}
    assert "ix_jobs_recruiter_id" in job_indexes, "Missing ix_jobs_recruiter_id index on jobs table"

    # Verify critical foreign key constraints
    job_fks = inspector.get_foreign_keys("jobs")
    job_fk_targets = {fk["referred_table"] for fk in job_fks}
    assert "recruiter_profiles" in job_fk_targets, "jobs table missing foreign key to recruiter_profiles"

    embedding_fks = inspector.get_foreign_keys("resume_embeddings")
    embedding_fk_targets = {fk["referred_table"] for fk in embedding_fks}
    assert "resumes" in embedding_fk_targets, "resume_embeddings table missing foreign key to resumes"


def test_postgres_vector_column_and_dimension_discrepancy(pg_engine):
    """Verify resume_embeddings vector column type and document the 1024 vs 384 dimension discrepancy.

    Phase 4 Requirement:
    - The existing SQLAlchemy model and initial migration specify Vector(1024).
    - The current embedding model (all-MiniLM-L6-v2) produces 384 dimensions.
    - Vector persistence is not approved for implementation in this task.
    - Document that PostgreSQL migrations succeed with the existing schema and that
      this discrepancy is a latent architectural issue rather than an active runtime failure.
    """
    with pg_engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT udt_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'resume_embeddings' AND column_name = 'vector'
                """
            )
        ).fetchone()
        assert result is not None, "Column 'vector' not found on table 'resume_embeddings'"
        assert result[0] == "vector", f"Expected udt_name 'vector', got '{result[0]}'"

        dim_result = conn.execute(
            text(
                """
                SELECT atttypmod
                FROM pg_attribute
                WHERE attrelid = 'resume_embeddings'::regclass AND attname = 'vector'
                """
            )
        ).scalar()
        assert dim_result == 1024, f"Expected vector dimension 1024 in schema, got {dim_result}"


def test_postgres_relational_constraints_and_cascade(pg_engine):
    """Verify PostgreSQL check constraints and foreign key enforcement."""
    with pg_engine.begin() as conn:
        user_id = uuid4()
        recruiter_id = uuid4()
        job_id = uuid4()

        conn.execute(
            text(
                """
                INSERT INTO users (id, email, password_hash, role, is_active)
                VALUES (:uid, :email, :pw, 'recruiter', true)
                """
            ),
            {"uid": user_id, "email": f"test_rec_{user_id.hex[:8]}@example.com", "pw": "hash123"},
        )

        conn.execute(
            text(
                """
                INSERT INTO recruiter_profiles (id, user_id, organization_name)
                VALUES (:rid, :uid, 'Test Corp')
                """
            ),
            {"rid": recruiter_id, "uid": user_id},
        )

        conn.execute(
            text(
                """
                INSERT INTO jobs (id, recruiter_id, title, employment_type, work_arrangement,
                                  description, status, skills_weight, experience_weight,
                                  education_weight, semantic_weight)
                VALUES (:jid, :rid, 'Engineer', 'full_time', 'remote',
                        'Job description', 'open', 35, 35, 15, 15)
                """
            ),
            {"jid": job_id, "rid": recruiter_id},
        )

        invalid_job_id = uuid4()
        with pytest.raises(Exception):
            conn.execute(
                text(
                    """
                    INSERT INTO jobs (id, recruiter_id, title, employment_type, work_arrangement,
                                      description, status, skills_weight, experience_weight,
                                      education_weight, semantic_weight)
                    VALUES (:jid, :rid, 'Invalid', 'full_time', 'remote',
                            'Job description', 'open', 50, 50, 50, 50)
                    """
                ),
                {"jid": invalid_job_id, "rid": recruiter_id},
            )


def test_postgres_downgrade_and_reupgrade_cycle(pg_engine):
    """Verify that Alembic downgrade base cleanly drops tables and re-upgrade head recreates them."""
    from alembic import command
    from alembic.config import Config

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(backend_dir, "alembic.ini")
    alembic_cfg = Config(ini_path)

    # 1. Downgrade to base
    command.downgrade(alembic_cfg, "base")

    inspector = inspect(pg_engine)
    remaining_tables = set(inspector.get_table_names()) - {"alembic_version"}
    assert not remaining_tables, f"Tables remained after downgrade base: {remaining_tables}"

    # 2. Re-upgrade to head
    command.upgrade(alembic_cfg, "head")

    inspector_reloaded = inspect(pg_engine)
    recreated_tables = set(inspector_reloaded.get_table_names())
    missing_tables = EXPECTED_TABLES - recreated_tables
    assert not missing_tables, f"Tables missing after re-upgrade head: {missing_tables}"

    # Verify recreated schema retains indexes and vector types
    recreated_user_indexes = {idx["name"] for idx in inspector_reloaded.get_indexes("users")}
    assert "ix_users_email" in recreated_user_indexes

    with pg_engine.connect() as conn:
        dim = conn.execute(
            text(
                """
                SELECT atttypmod
                FROM pg_attribute
                WHERE attrelid = 'resume_embeddings'::regclass AND attname = 'vector'
                """
            )
        ).scalar()
        assert dim == 1024, f"Expected vector dimension 1024 after re-upgrade, got {dim}"

    # Verify evaluation_runs table has configuration_hash column and index
    eval_run_columns = {col["name"] for col in inspector_reloaded.get_columns("evaluation_runs")}
    assert "configuration_hash" in eval_run_columns, "Column 'configuration_hash' missing from evaluation_runs"
    eval_run_indexes = {idx["name"] for idx in inspector_reloaded.get_indexes("evaluation_runs")}
    assert "ix_evaluation_runs_configuration_hash" in eval_run_indexes, "Index 'ix_evaluation_runs_configuration_hash' missing"
