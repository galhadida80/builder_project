"""Add calendar integration tables and fields

Revision ID: 039
Revises: 038
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '039'
down_revision: Union[str, None] = '038'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_calendar_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('access_token', sa.Text, nullable=False),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expiry', sa.DateTime, nullable=True),
        sa.Column('calendar_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'provider', name='uq_user_calendar_provider'),
    )
    op.create_index('ix_user_calendar_tokens_user_id', 'user_calendar_tokens', ['user_id'])

    op.add_column('meetings', sa.Column('calendar_synced', sa.Boolean, server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('meetings', 'calendar_synced')
    op.drop_index('ix_user_calendar_tokens_user_id')
    op.drop_table('user_calendar_tokens')
