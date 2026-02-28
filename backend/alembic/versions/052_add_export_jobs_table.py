"""Add export_jobs table for data export tracking

Revision ID: 052
Revises: 051
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "052"
down_revision = "051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "export_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("export_format", sa.String(20), nullable=False),
        sa.Column("export_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("requested_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_index("ix_export_jobs_project_id", "export_jobs", ["project_id"])
    op.create_index("ix_export_jobs_organization_id", "export_jobs", ["organization_id"])
    op.create_index("ix_export_jobs_status", "export_jobs", ["status"])
    op.create_index("ix_export_jobs_requested_by_id", "export_jobs", ["requested_by_id"])


def downgrade() -> None:
    op.drop_index("ix_export_jobs_requested_by_id", table_name="export_jobs")
    op.drop_index("ix_export_jobs_status", table_name="export_jobs")
    op.drop_index("ix_export_jobs_organization_id", table_name="export_jobs")
    op.drop_index("ix_export_jobs_project_id", table_name="export_jobs")
    op.drop_table("export_jobs")
