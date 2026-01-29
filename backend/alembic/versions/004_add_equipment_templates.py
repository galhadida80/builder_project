"""Add equipment templates

Revision ID: 004
Revises: 001
Create Date: 2024-01-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '004'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'equipment_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_en', sa.String(255)),
        sa.Column('required_documents', postgresql.JSONB(), default=[]),
        sa.Column('required_specifications', postgresql.JSONB(), default=[]),
        sa.Column('submission_checklist', postgresql.JSONB(), default=[]),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'template_consultants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('consultant_role', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('template_consultants')
    op.drop_table('equipment_templates')
