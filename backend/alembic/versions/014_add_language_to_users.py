"""Add language column to users table

Revision ID: 014
Revises: 013
Create Date: 2026-02-09

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('language', sa.String(10), nullable=False, server_default='en'))


def downgrade() -> None:
    op.drop_column('users', 'language')
