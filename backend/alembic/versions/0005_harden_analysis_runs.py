"""harden resume_analysis_runs with active uniqueness, failed_stage, and lease_expires_at

Revision ID: 0005_harden_analysis_runs
Revises: 0004_resume_analysis_runs
"""
import sqlalchemy as sa

from alembic import op

revision = "0005_harden_analysis_runs"
down_revision = "0004_resume_analysis_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("resume_analysis_runs", sa.Column("failed_stage", sa.String(64), nullable=True))
    op.add_column(
        "resume_analysis_runs",
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "uq_resume_analysis_runs_one_active",
        "resume_analysis_runs",
        ["resume_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('queued', 'running')"),
        sqlite_where=sa.text("status IN ('queued', 'running')"),
    )


def downgrade() -> None:
    op.drop_index("uq_resume_analysis_runs_one_active", table_name="resume_analysis_runs")
    op.drop_column("resume_analysis_runs", "lease_expires_at")
    op.drop_column("resume_analysis_runs", "failed_stage")
