"""Add notification prioritization models

Revision ID: 055
Revises: 054
Create Date: 2026-02-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "055"
down_revision = "054"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add urgency column to notifications table
    op.add_column("notifications", sa.Column("urgency", sa.String(50), nullable=False, server_default="medium"))

    # Create notification_preferences table
    op.create_table(
        "notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("min_urgency_level", sa.String(50), nullable=False, server_default="low"),
        sa.Column("quiet_hours_start", sa.Time(), nullable=True),
        sa.Column("quiet_hours_end", sa.Time(), nullable=True),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("digest_frequency", sa.String(50), nullable=False, server_default="immediate"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_foreign_key(
        "fk_notification_preferences_user_id",
        "notification_preferences",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_notification_preferences_user_id", "notification_preferences", ["user_id"])

    # Create notification_interactions table
    op.create_table(
        "notification_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("interaction_type", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_foreign_key(
        "fk_notification_interactions_notification_id",
        "notification_interactions",
        "notifications",
        ["notification_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_notification_interactions_user_id",
        "notification_interactions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_notification_interactions_notification_id", "notification_interactions", ["notification_id"])
    op.create_index("ix_notification_interactions_user_id", "notification_interactions", ["user_id"])


def downgrade() -> None:
    # Drop notification_interactions table
    op.drop_index("ix_notification_interactions_user_id", table_name="notification_interactions")
    op.drop_index("ix_notification_interactions_notification_id", table_name="notification_interactions")
    op.drop_constraint("fk_notification_interactions_user_id", "notification_interactions", type_="foreignkey")
    op.drop_constraint("fk_notification_interactions_notification_id", "notification_interactions", type_="foreignkey")
    op.drop_table("notification_interactions")

    # Drop notification_preferences table
    op.drop_index("ix_notification_preferences_user_id", table_name="notification_preferences")
    op.drop_constraint("fk_notification_preferences_user_id", "notification_preferences", type_="foreignkey")
    op.drop_table("notification_preferences")

    # Drop urgency column from notifications table
    op.drop_column("notifications", "urgency")
