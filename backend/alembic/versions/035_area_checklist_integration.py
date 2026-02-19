"""area checklist integration

Revision ID: 035
Revises: 034
Create Date: 2026-02-19
"""

import sqlalchemy as sa
from alembic import op

revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("construction_areas", sa.Column("area_level", sa.String(50), nullable=True))
    op.add_column("construction_areas", sa.Column("status", sa.String(50), server_default="not_started", nullable=False))
    op.add_column("construction_areas", sa.Column("order", sa.Integer, server_default="0", nullable=False))
    op.create_index("ix_construction_areas_project_parent", "construction_areas", ["project_id", "parent_id"])

    op.add_column(
        "checklist_instances",
        sa.Column(
            "area_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("construction_areas.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_checklist_instances_area_id", "checklist_instances", ["area_id"])

    op.create_table(
        "area_checklist_assignments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("area_type", sa.String(100), nullable=False),
        sa.Column("template_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("auto_create", sa.Boolean, server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("project_id", "area_type", "template_id", name="uq_area_checklist_assignments_project_type_template"),
    )


def downgrade() -> None:
    op.drop_table("area_checklist_assignments")
    op.drop_index("ix_checklist_instances_area_id", table_name="checklist_instances")
    op.drop_column("checklist_instances", "area_id")
    op.drop_index("ix_construction_areas_project_parent", table_name="construction_areas")
    op.drop_column("construction_areas", "order")
    op.drop_column("construction_areas", "status")
    op.drop_column("construction_areas", "area_level")
