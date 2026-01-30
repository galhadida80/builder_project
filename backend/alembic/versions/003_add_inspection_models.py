"""Add ProjectInspection and InspectionFinding models

Revision ID: 003
Revises: 002
Create Date: 2024-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_inspections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage_template_id', postgresql.UUID(as_uuid=True)),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('construction_areas.id', ondelete='SET NULL')),
        sa.Column('inspector_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('status', sa.String(50), default='not_scheduled'),
        sa.Column('scheduled_date', sa.Date()),
        sa.Column('scheduled_time', sa.Time()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('notes', sa.Text()),
        sa.Column('findings', postgresql.JSONB()),
        sa.Column('documents', postgresql.JSONB()),
        sa.Column('additional_data', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'inspection_findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('inspection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('project_inspections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('finding_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('location', sa.String(255)),
        sa.Column('photos', postgresql.JSONB()),
        sa.Column('resolution', sa.Text()),
        sa.Column('resolved_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('inspection_findings')
    op.drop_table('project_inspections')
