"""add resume_analysis_runs table for explicit resume analysis lifecycle

Revision ID: 0004_resume_analysis_runs
Revises: 0003_app_status_progression
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0004_resume_analysis_runs"
down_revision = "0003_app_status_progression"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"

    if is_pg:
        status_enum = postgresql.ENUM(
            "ready",
            "queued",
            "running",
            "completed",
            "failed",
            name="resume_analysis_status",
            create_type=False,
        )
        status_enum.create(bind, checkfirst=True)
    else:
        status_enum = sa.String(32)

    op.create_table(
        "resume_analysis_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "resume_id",
            sa.Uuid(),
            sa.ForeignKey("resumes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "initiated_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "retry_of_run_id",
            sa.Uuid(),
            sa.ForeignKey("resume_analysis_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", status_enum, nullable=False, server_default="queued"),
        sa.Column("current_stage", sa.String(64), nullable=False, server_default="queued"),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("failure_code", sa.String(64), nullable=True),
        sa.Column("failure_detail", sa.Text(), nullable=True),
        sa.Column("result_payload", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_resume_analysis_runs_resume_id", "resume_analysis_runs", ["resume_id"])
    op.create_index(
        "ix_resume_analysis_runs_initiated_by_user_id",
        "resume_analysis_runs",
        ["initiated_by_user_id"],
    )
    op.create_index("ix_resume_analysis_runs_status", "resume_analysis_runs", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_index("ix_resume_analysis_runs_status", table_name="resume_analysis_runs")
    op.drop_index(
        "ix_resume_analysis_runs_initiated_by_user_id",
        table_name="resume_analysis_runs",
    )
    op.drop_index("ix_resume_analysis_runs_resume_id", table_name="resume_analysis_runs")
    op.drop_table("resume_analysis_runs")

    if bind.dialect.name == "postgresql":
        sa.Enum(name="resume_analysis_status").drop(bind, checkfirst=True)
