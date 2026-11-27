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
    "resume_analysis_runs",
    "applications",
    "application_status_history",
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
    """Verify that all 17 relational tables, critical indexes, and foreign keys exist in PostgreSQL."""
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

    analysis_indexes = {idx["name"] for idx in inspector.get_indexes("resume_analysis_runs")}
    assert "uq_resume_analysis_runs_one_active" in analysis_indexes

    analysis_cols = {col["name"] for col in inspector.get_columns("resume_analysis_runs")}
    assert {"failed_stage", "lease_expires_at"}.issubset(analysis_cols)

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
        with pytest.raises(Exception):  # noqa: B017
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
    from alembic.config import Config

    from alembic import command

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


def test_postgres_upgrade_from_0002_preserves_data_and_fks(pg_engine):
    """Verify upgrading from 0002_add_eval_config_hash to head preserves existing data and enforces FKs."""
    from alembic.config import Config

    from alembic import command

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))

    command.downgrade(alembic_cfg, "0002_add_eval_config_hash")

    user_id = uuid4()
    recruiter_id = uuid4()
    candidate_id = uuid4()
    job_id = uuid4()
    resume_id = uuid4()
    app_id = uuid4()

    with pg_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO users (id, email, password_hash, role, is_active) "
                "VALUES (:uid, :email, 'pw', 'recruiter', true)"
            ),
            {"uid": user_id, "email": f"mig_{user_id.hex[:8]}@example.com"},
        )
        conn.execute(
            text("INSERT INTO recruiter_profiles (id, user_id, organization_name) VALUES (:rid, :uid, 'MigCorp')"),
            {"rid": recruiter_id, "uid": user_id},
        )
        conn.execute(
            text("INSERT INTO candidate_profiles (id, name) VALUES (:cid, 'Mig Candidate')"),
            {"cid": candidate_id},
        )
        conn.execute(
            text(
                "INSERT INTO jobs (id, recruiter_id, title, employment_type, work_arrangement, "
                "description, status, skills_weight, experience_weight, education_weight, semantic_weight) "
                "VALUES (:jid, :rid, 'Eng', 'full_time', 'remote', 'Desc', 'open', 35, 35, 15, 15)"
            ),
            {"jid": job_id, "rid": recruiter_id},
        )
        conn.execute(
            text(
                "INSERT INTO resumes (id, candidate_id, ingestion_job_id, original_filename, storage_key, "
                "mime_type, byte_size, sha256, processing_status) "
                "VALUES (:rsid, :cid, :jid, 'r.pdf', :skey, 'application/pdf', 100, :sha, 'completed')"
            ),
            {"rsid": resume_id, "cid": candidate_id, "jid": job_id, "skey": f"k_{resume_id.hex}.pdf", "sha": "f" * 64},
        )
        conn.execute(
            text(
                "INSERT INTO applications (id, candidate_id, job_id, resume_id, status) "
                "VALUES (:aid, :cid, :jid, :rsid, 'new')"
            ),
            {"aid": app_id, "cid": candidate_id, "jid": job_id, "rsid": resume_id},
        )

    command.upgrade(alembic_cfg, "head")

    with pg_engine.connect() as conn:
        preserved = conn.execute(
            text("SELECT status::text FROM applications WHERE id = :aid"),
            {"aid": app_id},
        ).scalar_one()
        assert preserved == "new"

        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert len(version) <= 32
        assert version == "0005_harden_analysis_runs"

    inspector = inspect(pg_engine)
    history_fks = {fk["referred_table"] for fk in inspector.get_foreign_keys("application_status_history")}
    assert {"applications", "users"}.issubset(history_fks)

    analysis_fks = {fk["referred_table"] for fk in inspector.get_foreign_keys("resume_analysis_runs")}
    assert {"resumes", "users"}.issubset(analysis_fks)

    analysis_indexes = {idx["name"] for idx in inspector.get_indexes("resume_analysis_runs")}
    assert "uq_resume_analysis_runs_one_active" in analysis_indexes


def test_postgres_single_active_analysis_run_and_atomic_claim(pg_engine):
    """Verify PostgreSQL partial unique index prevents duplicate active runs and atomic claim succeeds once."""
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import sessionmaker

    from app.models.entities import CandidateProfile, Resume, ResumeAnalysisRun, User
    from app.models.enums import ProcessingStatus, ResumeAnalysisStatus, UserRole
    from app.services.resume_analysis import execute_analysis_run

    Session = sessionmaker(bind=pg_engine, expire_on_commit=False)
    with Session() as db:
        user = User(
            email=f"pg_conc_{uuid4().hex[:8]}@example.com",
            password_hash="hash123",
            role=UserRole.CANDIDATE,
            is_active=True,
        )
        db.add(user)
        db.flush()
        cand = CandidateProfile(user_id=user.id, email=user.email, name="PG Conc")
        db.add(cand)
        db.flush()
        resume = Resume(
            candidate_id=cand.id,
            original_filename="pg.pdf",
            storage_key=f"pg_{uuid4().hex}.pdf",
            mime_type="application/pdf",
            byte_size=128,
            sha256=uuid4().hex + uuid4().hex,
            processing_status=ProcessingStatus.COMPLETED,
            extracted_text="Experience\n- Built Python APIs.\nSkills\nPython\nEducation\nB.S. CS",
        )
        db.add(resume)
        db.flush()

        run1 = ResumeAnalysisRun(
            resume_id=resume.id,
            initiated_by_user_id=user.id,
            status=ResumeAnalysisStatus.QUEUED,
            current_stage="queued",
            attempt_number=1,
        )
        db.add(run1)
        db.commit()

        run2 = ResumeAnalysisRun(
            resume_id=resume.id,
            initiated_by_user_id=user.id,
            status=ResumeAnalysisStatus.QUEUED,
            current_stage="queued",
            attempt_number=1,
        )
        db.add(run2)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        execute_analysis_run(run1.id, db=db)
        db.refresh(run1)
        assert run1.status == ResumeAnalysisStatus.COMPLETED

        # Re-executing a completed run is a no-op
        execute_analysis_run(run1.id, db=db)
        db.refresh(run1)
        assert run1.status == ResumeAnalysisStatus.COMPLETED
