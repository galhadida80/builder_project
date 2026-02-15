"""add defects

Revision ID: 025
Revises: 024
Create Date: 2026-02-15
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "defects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("defect_number", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("defect_type", sa.String(100), nullable=False, server_default="non_conformance"),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("construction_areas.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="open"),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("is_repeated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("followup_contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("checklist_instance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_instances.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_defects_project_id", "defects", ["project_id"])
    op.create_index("ix_defects_status", "defects", ["status"])
    op.create_index("ix_defects_category", "defects", ["category"])
    op.create_index("ix_defects_area_id", "defects", ["area_id"])
    op.create_index("ix_defects_severity", "defects", ["severity"])

    op.create_table(
        "defect_assignees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("defect_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("defects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("defect_id", "contact_id", name="uq_defect_contact"),
    )
    op.create_index("ix_defect_assignees_defect_id", "defect_assignees", ["defect_id"])
    op.create_index("ix_defect_assignees_contact_id", "defect_assignees", ["contact_id"])


def downgrade() -> None:
    op.drop_table("defect_assignees")
    op.drop_table("defects")
