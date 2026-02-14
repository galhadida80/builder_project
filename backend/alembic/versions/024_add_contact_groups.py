"""add contact groups

Revision ID: 024
Revises: 023
Create Date: 2026-02-14
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contact_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_contact_groups_project_id", "contact_groups", ["project_id"])

    op.create_table(
        "contact_group_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contact_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("group_id", "contact_id", name="uq_group_contact"),
    )
    op.create_index("ix_contact_group_members_group_id", "contact_group_members", ["group_id"])
    op.create_index("ix_contact_group_members_contact_id", "contact_group_members", ["contact_id"])


def downgrade() -> None:
    op.drop_table("contact_group_members")
    op.drop_table("contact_groups")
