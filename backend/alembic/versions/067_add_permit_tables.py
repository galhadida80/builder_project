"""Add permit tables

Revision ID: 067
Revises: 066
Create Date: 2026-03-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '067'
down_revision: Union[str, None] = '066'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create permits table
    op.create_table(
        'permits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permit_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('permit_number', sa.String(length=255), nullable=True),
        sa.Column('issuing_authority', sa.String(length=255), nullable=True),
        sa.Column('application_date', sa.Date(), nullable=True),
        sa.Column('approval_date', sa.Date(), nullable=True),
        sa.Column('expiration_date', sa.Date(), nullable=True),
        sa.Column('conditions', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient querying
    op.create_index(op.f('ix_permits_project_id'), 'permits', ['project_id'], unique=False)
    op.create_index(op.f('ix_permits_status'), 'permits', ['status'], unique=False)
    op.create_index(op.f('ix_permits_expiration_date'), 'permits', ['expiration_date'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_permits_expiration_date'), table_name='permits')
    op.drop_index(op.f('ix_permits_status'), table_name='permits')
    op.drop_index(op.f('ix_permits_project_id'), table_name='permits')

    # Drop permits table
    op.drop_table('permits')
