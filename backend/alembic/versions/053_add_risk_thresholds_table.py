"""Add risk_thresholds table for configurable thresholds

Revision ID: 053
Revises: 052
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "053"
down_revision = "052"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "risk_thresholds",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("low_threshold", sa.Numeric(5, 2), server_default="25.0"),
        sa.Column("medium_threshold", sa.Numeric(5, 2), server_default="50.0"),
        sa.Column("high_threshold", sa.Numeric(5, 2), server_default="75.0"),
        sa.Column("critical_threshold", sa.Numeric(5, 2), server_default="90.0"),
        sa.Column("auto_schedule_inspections", sa.Boolean, server_default="false"),
        sa.Column("auto_schedule_threshold", sa.String(50), server_default="'high'"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_risk_thresholds_project_id",
        "risk_thresholds",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_risk_thresholds_created_by_id",
        "risk_thresholds",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_risk_thresholds_project_id", "risk_thresholds", ["project_id"])
    op.create_unique_constraint("uq_risk_thresholds_project_id", "risk_thresholds", ["project_id"])


def downgrade() -> None:
    op.drop_constraint("uq_risk_thresholds_project_id", "risk_thresholds", type_="unique")
    op.drop_index("ix_risk_thresholds_project_id", table_name="risk_thresholds")
    op.drop_constraint("fk_risk_thresholds_created_by_id", "risk_thresholds", type_="foreignkey")
    op.drop_constraint("fk_risk_thresholds_project_id", "risk_thresholds", type_="foreignkey")
    op.drop_table("risk_thresholds")
