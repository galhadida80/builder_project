"""Add scan_history table

Revision ID: 070
Revises: 069
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "070"
down_revision = "069"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scan_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scanned_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_index("ix_scan_history_project_id", "scan_history", ["project_id"])
    op.create_index("ix_scan_history_user_id", "scan_history", ["user_id"])
    op.create_index("ix_scan_history_entity_type", "scan_history", ["entity_type"])
    op.create_index("ix_scan_history_entity_id", "scan_history", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_scan_history_entity_id", table_name="scan_history")
    op.drop_index("ix_scan_history_entity_type", table_name="scan_history")
    op.drop_index("ix_scan_history_user_id", table_name="scan_history")
    op.drop_index("ix_scan_history_project_id", table_name="scan_history")
    op.drop_table("scan_history")
