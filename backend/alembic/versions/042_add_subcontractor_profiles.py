"""Add subcontractor profiles table

Revision ID: 042
Revises: 041
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = '042'
down_revision: Union[str, None] = '041'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subcontractor_profiles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('trade', sa.String(100), nullable=False),
        sa.Column('license_number', sa.String(100), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('insurance_expiry', sa.DateTime(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), server_default='false'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('certifications', JSON, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('subcontractor_profiles')
