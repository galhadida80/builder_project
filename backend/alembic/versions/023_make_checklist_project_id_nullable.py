"""Recreate checklist tables to match current models (project_id nullable)

Revision ID: 023
Revises: 022
Create Date: 2026-02-14

All checklist tables are empty so we drop and recreate them
to match the current SQLAlchemy models.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("checklist_item_responses")
    op.drop_table("checklist_instances")
    op.drop_table("checklist_item_templates")
    op.drop_table("checklist_sub_sections")
    op.drop_table("checklist_templates")

    op.create_table(
        "checklist_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("level", sa.String(50), nullable=False),
        sa.Column("group", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )

    op.create_table(
        "checklist_subsections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_item_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("subsection_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_subsections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("must_image", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("must_note", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("must_signature", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_instances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("unit_identifier", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )

    op.create_table(
        "checklist_item_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("instance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_instances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_item_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(50), server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("image_urls", postgresql.JSONB(), nullable=True),
        sa.Column("signature_url", sa.String(500), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("completed_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("checklist_item_responses")
    op.drop_table("checklist_instances")
    op.drop_table("checklist_item_templates")
    op.drop_table("checklist_subsections")
    op.drop_table("checklist_templates")

    op.create_table(
        "checklist_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("level", sa.String(100), nullable=False),
        sa.Column("group_name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_sub_sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_item_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sub_section_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_sub_sections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("item_type", sa.String(100), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_instances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(50), server_default="not_started"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )

    op.create_table(
        "checklist_item_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("instance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_instances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_item_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("responded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.Column("response_value", sa.Text(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
