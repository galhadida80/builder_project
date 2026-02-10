"""Add password_hash to users

Revision ID: 002
Revises: 001
Create Date: 2024-01-28

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))
    op.alter_column('users', 'firebase_uid', nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'firebase_uid', nullable=False)
    op.drop_column('users', 'password_hash')
