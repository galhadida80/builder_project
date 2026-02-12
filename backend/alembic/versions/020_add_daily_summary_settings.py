"""Add daily_summary_enabled to projects table

Revision ID: 020
Revises: 019
Create Date: 2026-02-12

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("daily_summary_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("projects", "daily_summary_enabled")
