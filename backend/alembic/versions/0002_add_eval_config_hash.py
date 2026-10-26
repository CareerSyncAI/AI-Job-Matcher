"""add configuration_hash to evaluation_runs

Revision ID: 0002_add_eval_config_hash
Revises: 0001_initial_schema
"""
import sqlalchemy as sa

from alembic import op

revision = "0002_add_eval_config_hash"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "evaluation_runs",
        sa.Column("configuration_hash", sa.String(64), nullable=True),
    )
    op.create_index(
        "ix_evaluation_runs_configuration_hash",
        "evaluation_runs",
        ["configuration_hash"],
    )


def downgrade() -> None:
    op.drop_index("ix_evaluation_runs_configuration_hash", table_name="evaluation_runs")
    op.drop_column("evaluation_runs", "configuration_hash")
