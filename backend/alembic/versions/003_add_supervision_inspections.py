"""Add supervision inspections

Revision ID: 003
Revises: 001
Create Date: 2026-01-29

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
    # Create consultant_types table
    op.create_table(
        'consultant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('stage_count', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create inspection_stage_templates table
    op.create_table(
        'inspection_stage_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultant_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage_definitions', postgresql.JSONB(), default={}),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create project_inspections table
    op.create_table(
        'project_inspections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultant_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('construction_areas.id', ondelete='CASCADE')),
        sa.Column('template_snapshot', postgresql.JSONB(), default={}),
        sa.Column('status', sa.String(50), default='scheduled'),
        sa.Column('scheduled_date', sa.Date()),
        sa.Column('assigned_inspector', sa.String(255)),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create inspection_results table
    op.create_table(
        'inspection_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('inspection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('project_inspections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage_number', sa.Integer(), nullable=False),
        sa.Column('completion_date', sa.Date()),
        sa.Column('approval_date', sa.Date()),
        sa.Column('inspector_name', sa.String(255)),
        sa.Column('result_status', sa.String(50), default='pending'),
        sa.Column('findings', sa.Text()),
        sa.Column('attachments', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes on foreign keys
    op.create_index('ix_inspection_stage_templates_consultant_type_id', 'inspection_stage_templates', ['consultant_type_id'])
    op.create_index('ix_project_inspections_project_id', 'project_inspections', ['project_id'])
    op.create_index('ix_project_inspections_consultant_type_id', 'project_inspections', ['consultant_type_id'])
    op.create_index('ix_project_inspections_area_id', 'project_inspections', ['area_id'])
    op.create_index('ix_inspection_results_inspection_id', 'inspection_results', ['inspection_id'])

    # Create GIN indexes for JSONB columns
    op.create_index(
        'ix_inspection_stage_templates_stage_definitions',
        'inspection_stage_templates',
        ['stage_definitions'],
        postgresql_using='gin'
    )
    op.create_index(
        'ix_project_inspections_template_snapshot',
        'project_inspections',
        ['template_snapshot'],
        postgresql_using='gin'
    )
    op.create_index(
        'ix_inspection_results_attachments',
        'inspection_results',
        ['attachments'],
        postgresql_using='gin'
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_inspection_results_attachments', table_name='inspection_results', postgresql_using='gin')
    op.drop_index('ix_project_inspections_template_snapshot', table_name='project_inspections', postgresql_using='gin')
    op.drop_index('ix_inspection_stage_templates_stage_definitions', table_name='inspection_stage_templates', postgresql_using='gin')

    op.drop_index('ix_inspection_results_inspection_id', table_name='inspection_results')
    op.drop_index('ix_project_inspections_area_id', table_name='project_inspections')
    op.drop_index('ix_project_inspections_consultant_type_id', table_name='project_inspections')
    op.drop_index('ix_project_inspections_project_id', table_name='project_inspections')
    op.drop_index('ix_inspection_stage_templates_consultant_type_id', table_name='inspection_stage_templates')

    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_table('inspection_results')
    op.drop_table('project_inspections')
    op.drop_table('inspection_stage_templates')
    op.drop_table('consultant_types')
