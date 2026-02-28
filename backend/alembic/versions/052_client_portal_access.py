"""Add client portal access tables

Revision ID: 052
Revises: 051
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "052"
down_revision = "051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create client_portal_access table
    op.create_table(
        "client_portal_access",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("can_view_budget", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("can_view_documents", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("can_submit_feedback", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("access_token", sa.String(length=255), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_client_portal_access_user_id", "client_portal_access", ["user_id"])
    op.create_index("ix_client_portal_access_project_id", "client_portal_access", ["project_id"])
    op.create_index("ix_client_portal_access_access_token", "client_portal_access", ["access_token"], unique=True)

    # Add portal visibility settings to projects table
    op.add_column("projects", sa.Column("budget_visible_to_clients", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("projects", sa.Column("milestone_tracking_enabled", sa.Boolean(), nullable=False, server_default="true"))


def downgrade() -> None:
    # Remove columns from projects table
    op.drop_column("projects", "milestone_tracking_enabled")
    op.drop_column("projects", "budget_visible_to_clients")

    # Drop client_portal_access table
    op.drop_index("ix_client_portal_access_access_token", table_name="client_portal_access")
    op.drop_index("ix_client_portal_access_project_id", table_name="client_portal_access")
    op.drop_index("ix_client_portal_access_user_id", table_name="client_portal_access")
    op.drop_table("client_portal_access")
