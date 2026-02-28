"""Add schedule risk analysis tables

Revision ID: 054
Revises: 053
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "054"
down_revision = "053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create schedule_risk_analysis table
    op.create_table(
        "schedule_risk_analysis",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("predicted_delay_days", sa.Float(), nullable=True),
        sa.Column("risk_level", sa.String(50), nullable=False),
        sa.Column("factors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("mitigation_suggestions", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("analyzed_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["tasks.id"],
            ondelete="CASCADE",
        ),
    )

    # Create indexes for schedule_risk_analysis
    op.create_index("ix_schedule_risk_analysis_project_id", "schedule_risk_analysis", ["project_id"])
    op.create_index("ix_schedule_risk_analysis_task_id", "schedule_risk_analysis", ["task_id"])
    op.create_index("ix_schedule_risk_analysis_analyzed_at", "schedule_risk_analysis", ["analyzed_at"])

    # Add milestone_type column to tasks table
    op.add_column("tasks", sa.Column("milestone_type", sa.String(50), nullable=True))


def downgrade() -> None:
    # Remove milestone_type column from tasks table
    op.drop_column("tasks", "milestone_type")

    # Drop indexes for schedule_risk_analysis
    op.drop_index("ix_schedule_risk_analysis_analyzed_at", table_name="schedule_risk_analysis")
    op.drop_index("ix_schedule_risk_analysis_task_id", table_name="schedule_risk_analysis")
    op.drop_index("ix_schedule_risk_analysis_project_id", table_name="schedule_risk_analysis")

    # Drop schedule_risk_analysis table
    op.drop_table("schedule_risk_analysis")
