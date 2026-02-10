"""Add is_cc_participant to rfi_responses

Revision ID: 005
Revises: 004
Create Date: 2026-01-31

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'rfi_responses',
        sa.Column('is_cc_participant', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('rfi_responses', 'is_cc_participant')
