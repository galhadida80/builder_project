"""Create batch_uploads and processing_tasks tables

Revision ID: 052
Revises: 051
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "052"
down_revision = "051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create batch_uploads table
    op.create_table(
        "batch_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_files", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # Create foreign keys for batch_uploads
    op.create_foreign_key(
        "fk_batch_uploads_project_id",
        "batch_uploads",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_batch_uploads_user_id",
        "batch_uploads",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Create indexes for batch_uploads
    op.create_index("ix_batch_uploads_project_id", "batch_uploads", ["project_id"])
    op.create_index("ix_batch_uploads_user_id", "batch_uploads", ["user_id"])
    op.create_index("ix_batch_uploads_status", "batch_uploads", ["status"])
    op.create_index("ix_batch_uploads_created_at", "batch_uploads", ["created_at"])

    # Create processing_tasks table
    op.create_table(
        "processing_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("batch_upload_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("progress_percent", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # Create foreign keys for processing_tasks
    op.create_foreign_key(
        "fk_processing_tasks_batch_upload_id",
        "processing_tasks",
        "batch_uploads",
        ["batch_upload_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_processing_tasks_file_id",
        "processing_tasks",
        "files",
        ["file_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Create indexes for processing_tasks
    op.create_index("ix_processing_tasks_batch_upload_id", "processing_tasks", ["batch_upload_id"])
    op.create_index("ix_processing_tasks_file_id", "processing_tasks", ["file_id"])
    op.create_index("ix_processing_tasks_status", "processing_tasks", ["status"])
    op.create_index("ix_processing_tasks_celery_task_id", "processing_tasks", ["celery_task_id"])


def downgrade() -> None:
    # Drop processing_tasks table
    op.drop_index("ix_processing_tasks_celery_task_id", table_name="processing_tasks")
    op.drop_index("ix_processing_tasks_status", table_name="processing_tasks")
    op.drop_index("ix_processing_tasks_file_id", table_name="processing_tasks")
    op.drop_index("ix_processing_tasks_batch_upload_id", table_name="processing_tasks")
    op.drop_constraint("fk_processing_tasks_file_id", "processing_tasks", type_="foreignkey")
    op.drop_constraint("fk_processing_tasks_batch_upload_id", "processing_tasks", type_="foreignkey")
    op.drop_table("processing_tasks")

    # Drop batch_uploads table
    op.drop_index("ix_batch_uploads_created_at", table_name="batch_uploads")
    op.drop_index("ix_batch_uploads_status", table_name="batch_uploads")
    op.drop_index("ix_batch_uploads_user_id", table_name="batch_uploads")
    op.drop_index("ix_batch_uploads_project_id", table_name="batch_uploads")
    op.drop_constraint("fk_batch_uploads_user_id", "batch_uploads", type_="foreignkey")
    op.drop_constraint("fk_batch_uploads_project_id", "batch_uploads", type_="foreignkey")
    op.drop_table("batch_uploads")
