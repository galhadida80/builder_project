"""Add ACC RFI inbound sync tables

Revision ID: 074
Revises: 073
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "074"
down_revision = "073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "acc_user_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("acc_user_id", sa.String(255), nullable=False),
        sa.Column("builderops_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_acc_user_mappings_project_id", "acc_user_mappings", ["project_id"])
    op.add_column("rfis", sa.Column("acc_origin", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    op.drop_column("rfis", "acc_origin")
    op.drop_index("ix_acc_user_mappings_project_id", table_name="acc_user_mappings")
    op.drop_table("acc_user_mappings")
