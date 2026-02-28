"""Add risk_scores table for AI-powered defect prediction

Revision ID: 056
Revises: 055
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "056"
down_revision = "055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "risk_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("risk_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("risk_level", sa.String(50), nullable=False),
        sa.Column("defect_count", sa.Integer, server_default="0"),
        sa.Column("severity_score", sa.Numeric(5, 2), server_default="0"),
        sa.Column("predicted_defect_types", postgresql.JSONB, nullable=True),
        sa.Column("contributing_factors", postgresql.JSONB, nullable=True),
        sa.Column("calculation_metadata", postgresql.JSONB, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("calculated_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("valid_until", sa.DateTime, nullable=True),
        sa.Column("calculated_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_foreign_key(
        "fk_risk_scores_project_id",
        "risk_scores",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_risk_scores_area_id",
        "risk_scores",
        "construction_areas",
        ["area_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_risk_scores_calculated_by_id",
        "risk_scores",
        "users",
        ["calculated_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_risk_scores_project_id", "risk_scores", ["project_id"])
    op.create_index("ix_risk_scores_area_id", "risk_scores", ["area_id"])


def downgrade() -> None:
    op.drop_index("ix_risk_scores_area_id", table_name="risk_scores")
    op.drop_index("ix_risk_scores_project_id", table_name="risk_scores")
    op.drop_constraint("fk_risk_scores_calculated_by_id", "risk_scores", type_="foreignkey")
    op.drop_constraint("fk_risk_scores_area_id", "risk_scores", type_="foreignkey")
    op.drop_constraint("fk_risk_scores_project_id", "risk_scores", type_="foreignkey")
    op.drop_table("risk_scores")
