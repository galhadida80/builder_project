"""Add password reset tokens table

Revision ID: 018
Revises: 017
Create Date: 2026-02-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(255), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_password_reset_tokens_token", "password_reset_tokens", ["token"])
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_password_reset_tokens_user_id")
    op.drop_index("ix_password_reset_tokens_token")
    op.drop_table("password_reset_tokens")
