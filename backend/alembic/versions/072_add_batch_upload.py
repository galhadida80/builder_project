"""Add batch_uploads table and batch_upload_id to files

Revision ID: 072
Revises: 070
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "072"
down_revision = "070"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "batch_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_files", sa.Integer(), nullable=False),
        sa.Column("processed_files", sa.Integer(), server_default="0", nullable=False),
        sa.Column("failed_files", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("metadata_json", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_index("ix_batch_uploads_project_id", "batch_uploads", ["project_id"])
    op.create_index("ix_batch_uploads_uploaded_by", "batch_uploads", ["uploaded_by"])
    op.create_index("ix_batch_uploads_status", "batch_uploads", ["status"])

    op.add_column(
        "files",
        sa.Column("batch_upload_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("batch_uploads.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_files_batch_upload_id", "files", ["batch_upload_id"])


def downgrade() -> None:
    op.drop_index("ix_files_batch_upload_id", table_name="files")
    op.drop_column("files", "batch_upload_id")
    op.drop_index("ix_batch_uploads_status", table_name="batch_uploads")
    op.drop_index("ix_batch_uploads_uploaded_by", table_name="batch_uploads")
    op.drop_index("ix_batch_uploads_project_id", table_name="batch_uploads")
    op.drop_table("batch_uploads")
