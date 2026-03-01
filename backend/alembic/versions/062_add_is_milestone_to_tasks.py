"""Add is_milestone column to tasks table

Revision ID: 062
Revises: 061
Create Date: 2026-03-01
"""

import sqlalchemy as sa
from alembic import op

revision = "062"
down_revision = "061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("is_milestone", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("tasks", "is_milestone")
