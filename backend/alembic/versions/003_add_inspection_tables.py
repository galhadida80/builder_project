"""Add inspection tables

Revision ID: 003
Revises: 001
Create Date: 2024-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '003'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create inspection_consultant_types table
    op.create_table(
        'inspection_consultant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create inspection_stages table
    op.create_table(
        'inspection_stages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('inspection_consultant_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('required_documentation', postgresql.JSONB(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create inspections table
    op.create_table(
        'inspections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('inspection_consultant_types.id'), nullable=False),
        sa.Column('scheduled_date', sa.DateTime(), nullable=False),
        sa.Column('completed_date', sa.DateTime()),
        sa.Column('current_stage', sa.String(255)),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    # Create findings table
    op.create_table(
        'findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('inspection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('inspections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('severity', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), default='open'),
        sa.Column('location', sa.String(255)),
        sa.Column('photos', postgresql.JSONB(), server_default='[]'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    # Create indexes for better query performance
    op.create_index('ix_inspection_stages_consultant_type_id', 'inspection_stages', ['consultant_type_id'])
    op.create_index('ix_inspections_project_id', 'inspections', ['project_id'])
    op.create_index('ix_inspections_consultant_type_id', 'inspections', ['consultant_type_id'])
    op.create_index('ix_inspections_status', 'inspections', ['status'])
    op.create_index('ix_findings_inspection_id', 'findings', ['inspection_id'])
    op.create_index('ix_findings_severity', 'findings', ['severity'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_findings_severity', 'findings')
    op.drop_index('ix_findings_inspection_id', 'findings')
    op.drop_index('ix_inspections_status', 'inspections')
    op.drop_index('ix_inspections_consultant_type_id', 'inspections')
    op.drop_index('ix_inspections_project_id', 'inspections')
    op.drop_index('ix_inspection_stages_consultant_type_id', 'inspection_stages')

    # Drop tables in reverse order (respecting foreign key dependencies)
    op.drop_table('findings')
    op.drop_table('inspections')
    op.drop_table('inspection_stages')
    op.drop_table('inspection_consultant_types')
