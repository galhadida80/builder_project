"""Add 2FA columns to users

Revision ID: 046
Revises: 045
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '046'
down_revision: Union[str, None] = '045'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('totp_secret', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'two_factor_enabled')
    op.drop_column('users', 'totp_secret')
