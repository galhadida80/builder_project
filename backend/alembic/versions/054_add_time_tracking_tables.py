"""Add time tracking tables

Revision ID: 054
Revises: 053
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "054"
down_revision = "053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create time_entries table
    op.create_table(
        "time_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("clock_in_time", sa.DateTime, nullable=False),
        sa.Column("clock_out_time", sa.DateTime, nullable=True),
        sa.Column("location_lat", sa.Float, nullable=True),
        sa.Column("location_lng", sa.Float, nullable=True),
        sa.Column("break_minutes", sa.Integer, nullable=True, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_time_entries_user_id",
        "time_entries",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_time_entries_project_id",
        "time_entries",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_time_entries_task_id",
        "time_entries",
        "tasks",
        ["task_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_time_entries_user_id", "time_entries", ["user_id"])
    op.create_index("ix_time_entries_project_id", "time_entries", ["project_id"])
    op.create_index("ix_time_entries_task_id", "time_entries", ["task_id"])
    op.create_index("ix_time_entries_status", "time_entries", ["status"])

    # Create timesheets table
    op.create_table(
        "timesheets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("total_hours", sa.Float, nullable=True),
        sa.Column("regular_hours", sa.Float, nullable=True),
        sa.Column("overtime_hours", sa.Float, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_foreign_key(
        "fk_timesheets_user_id",
        "timesheets",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_timesheets_project_id",
        "timesheets",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_timesheets_approved_by_id",
        "timesheets",
        "users",
        ["approved_by_id"],
        ["id"],
    )
    op.create_index("ix_timesheets_user_id", "timesheets", ["user_id"])
    op.create_index("ix_timesheets_project_id", "timesheets", ["project_id"])
    op.create_index("ix_timesheets_status", "timesheets", ["status"])


def downgrade() -> None:
    # Drop timesheets table
    op.drop_index("ix_timesheets_status", table_name="timesheets")
    op.drop_index("ix_timesheets_project_id", table_name="timesheets")
    op.drop_index("ix_timesheets_user_id", table_name="timesheets")
    op.drop_constraint("fk_timesheets_approved_by_id", "timesheets", type_="foreignkey")
    op.drop_constraint("fk_timesheets_project_id", "timesheets", type_="foreignkey")
    op.drop_constraint("fk_timesheets_user_id", "timesheets", type_="foreignkey")
    op.drop_table("timesheets")

    # Drop time_entries table
    op.drop_index("ix_time_entries_status", table_name="time_entries")
    op.drop_index("ix_time_entries_task_id", table_name="time_entries")
    op.drop_index("ix_time_entries_project_id", table_name="time_entries")
    op.drop_index("ix_time_entries_user_id", table_name="time_entries")
    op.drop_constraint("fk_time_entries_task_id", "time_entries", type_="foreignkey")
    op.drop_constraint("fk_time_entries_project_id", "time_entries", type_="foreignkey")
    op.drop_constraint("fk_time_entries_user_id", "time_entries", type_="foreignkey")
    op.drop_table("time_entries")
