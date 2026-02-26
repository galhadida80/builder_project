"""Add notification digest settings to projects

Revision ID: 050
Revises: 049
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

revision = "050"
down_revision = "049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("notification_digest_interval_hours", sa.Integer(), nullable=True, server_default="48"))
    op.add_column("projects", sa.Column("last_digest_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "last_digest_sent_at")
    op.drop_column("projects", "notification_digest_interval_hours")
