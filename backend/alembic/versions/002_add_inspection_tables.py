"""Add inspection tables

Revision ID: 002
Revises: 001
Create Date: 2024-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'consultant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name_en', sa.String(100), nullable=False),
        sa.Column('name_he', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'inspection_stages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultant_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage_number', sa.Integer(), nullable=False),
        sa.Column('name_en', sa.String(100), nullable=False),
        sa.Column('name_he', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('inspection_stages')
    op.drop_table('consultant_types')
