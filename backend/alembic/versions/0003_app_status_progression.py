"""add application status progression and history

Revision ID: 0003_app_status_progression
Revises: 0002_add_eval_config_hash
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003_app_status_progression"
down_revision = "0002_add_eval_config_hash"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for value in ("interviewing", "offered", "hired"):
            op.execute(f"ALTER TYPE application_status ADD VALUE IF NOT EXISTS '{value}'")

    status_type = (
        postgresql.ENUM(
            "new",
            "under_review",
            "shortlisted",
            "rejected",
            "interviewing",
            "offered",
            "hired",
            name="application_status",
            create_type=False,
        )
        if bind.dialect.name == "postgresql"
        else sa.String(32)
    )

    op.create_table(
        "application_status_history",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Uuid(),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_status", status_type, nullable=True),
        sa.Column("to_status", status_type, nullable=False),
        sa.Column(
            "changed_by_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_application_status_history_application_id",
        "application_status_history",
        ["application_id"],
    )
    op.create_index(
        "ix_application_status_history_changed_by_user_id",
        "application_status_history",
        ["changed_by_user_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    status_expression = "status::text" if bind.dialect.name == "postgresql" else "status"
    newer_status_count = bind.execute(
        sa.text(
            f"SELECT count(*) FROM applications WHERE {status_expression} "
            "IN ('interviewing', 'offered', 'hired')"
        )
    ).scalar_one()
    if newer_status_count:
        raise RuntimeError(
            "Cannot downgrade application status progression while applications use "
            "interviewing, offered, or hired statuses. Move those applications to a "
            "status supported by the previous application version first."
        )

    op.drop_index(
        "ix_application_status_history_changed_by_user_id",
        table_name="application_status_history",
    )
    op.drop_index(
        "ix_application_status_history_application_id",
        table_name="application_status_history",
    )
    op.drop_table("application_status_history")
    # PostgreSQL does not support removing enum labels; unused labels remain.
