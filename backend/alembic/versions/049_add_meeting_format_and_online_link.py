"""add meeting_format and online_link to meetings

Revision ID: 049
Revises: 048
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

revision = "049"
down_revision = "048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("meetings", sa.Column("meeting_format", sa.String(20), nullable=True))
    op.add_column("meetings", sa.Column("online_link", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("meetings", "online_link")
    op.drop_column("meetings", "meeting_format")
