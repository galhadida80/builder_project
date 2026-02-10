"""Add RBAC permission overrides and project invitations

Revision ID: 017
Revises: 016
Create Date: 2026-02-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_super_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    op.create_table(
        "permission_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_member_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission", sa.String(50), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("granted_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("project_member_id", "permission", name="uq_member_permission"),
    )

    op.create_table(
        "project_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("token", sa.String(255), unique=True, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("invited_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("project_invitations")
    op.drop_table("permission_overrides")
    op.drop_column("users", "is_super_admin")
