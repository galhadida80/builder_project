"""add inspection templates

Revision ID: 002
Revises: 001
Create Date: 2026-01-29

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
    # Create inspection_consultant_types table
    op.create_table(
        'inspection_consultant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create inspection_stage_templates table
    op.create_table(
        'inspection_stage_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('inspection_consultant_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('stage_order', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    # Create indexes for inspection_stage_templates
    op.create_index('ix_inspection_stage_templates_consultant_type_id', 'inspection_stage_templates', ['consultant_type_id'])
    op.create_index('ix_inspection_stage_templates_stage_order', 'inspection_stage_templates', ['stage_order'])

    # Create project_inspections table
    op.create_table(
        'project_inspections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage_template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('inspection_stage_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), server_default='scheduled'),
        sa.Column('scheduled_date', sa.DateTime()),
        sa.Column('completed_date', sa.DateTime()),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )
    # Create indexes for project_inspections
    op.create_index('ix_project_inspections_project_id', 'project_inspections', ['project_id'])
    op.create_index('ix_project_inspections_stage_template_id', 'project_inspections', ['stage_template_id'])
    op.create_index('ix_project_inspections_status', 'project_inspections', ['status'])
    op.create_index('ix_project_inspections_scheduled_date', 'project_inspections', ['scheduled_date'])

    # Create inspection_findings table
    op.create_table(
        'inspection_findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('inspection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('project_inspections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('finding_type', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(50)),
        sa.Column('status', sa.String(50), server_default='open'),
        sa.Column('resolved_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )
    # Create indexes for inspection_findings
    op.create_index('ix_inspection_findings_inspection_id', 'inspection_findings', ['inspection_id'])
    op.create_index('ix_inspection_findings_finding_type', 'inspection_findings', ['finding_type'])


def downgrade() -> None:
    # Drop tables in reverse order to respect foreign key constraints
    op.drop_index('ix_inspection_findings_finding_type', table_name='inspection_findings')
    op.drop_index('ix_inspection_findings_inspection_id', table_name='inspection_findings')
    op.drop_table('inspection_findings')

    op.drop_index('ix_project_inspections_scheduled_date', table_name='project_inspections')
    op.drop_index('ix_project_inspections_status', table_name='project_inspections')
    op.drop_index('ix_project_inspections_stage_template_id', table_name='project_inspections')
    op.drop_index('ix_project_inspections_project_id', table_name='project_inspections')
    op.drop_table('project_inspections')

    op.drop_index('ix_inspection_stage_templates_stage_order', table_name='inspection_stage_templates')
    op.drop_index('ix_inspection_stage_templates_consultant_type_id', table_name='inspection_stage_templates')
    op.drop_table('inspection_stage_templates')

    op.drop_table('inspection_consultant_types')
