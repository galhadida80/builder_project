"""Add ACC RFI sync tables and columns

Revision ID: 073
Revises: 072
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "073"
down_revision = "072"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "acc_project_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("acc_project_id", sa.String(255), nullable=False),
        sa.Column("acc_hub_id", sa.String(255), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "rfi_sync_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rfi_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rfis.id", ondelete="CASCADE"), nullable=False),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_rfi_sync_logs_rfi_id", "rfi_sync_logs", ["rfi_id"])
    op.add_column("rfis", sa.Column("acc_rfi_id", sa.String(255), nullable=True))
    op.add_column("rfis", sa.Column("sync_status", sa.String(20), server_default="not_synced", nullable=False))
    op.add_column("rfis", sa.Column("last_synced_at", sa.DateTime(), nullable=True))
    op.add_column("rfis", sa.Column("sync_error", sa.Text(), nullable=True))
    op.create_index("ix_rfis_acc_rfi_id", "rfis", ["acc_rfi_id"])


def downgrade() -> None:
    op.drop_index("ix_rfis_acc_rfi_id", table_name="rfis")
    op.drop_column("rfis", "sync_error")
    op.drop_column("rfis", "last_synced_at")
    op.drop_column("rfis", "sync_status")
    op.drop_column("rfis", "acc_rfi_id")
    op.drop_index("ix_rfi_sync_logs_rfi_id", table_name="rfi_sync_logs")
    op.drop_table("rfi_sync_logs")
    op.drop_table("acc_project_links")
