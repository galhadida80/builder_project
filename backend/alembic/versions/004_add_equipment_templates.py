"""Add equipment templates

Revision ID: 004
Revises: 001
Create Date: 2026-01-29

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
    # Create consultant_types table
    op.create_table(
        'consultant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create equipment_templates table
    op.create_table(
        'equipment_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('description', sa.Text()),
        sa.Column('specifications', postgresql.JSONB()),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    # Create equipment_template_consultants junction table
    op.create_table(
        'equipment_template_consultants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('consultant_types.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create equipment_approval_submissions table
    op.create_table(
        'equipment_approval_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment_templates.id')),
        sa.Column('equipment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment.id')),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('submitted_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create equipment_approval_decisions table
    op.create_table(
        'equipment_approval_decisions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment_approval_submissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('approver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('decision', sa.String(50), nullable=False),
        sa.Column('comments', sa.Text()),
        sa.Column('decided_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create indexes
    op.create_index('ix_equipment_templates_name', 'equipment_templates', ['name'])
    op.create_index('ix_equipment_templates_category', 'equipment_templates', ['category'])
    op.create_index('ix_equipment_approval_submissions_project_id', 'equipment_approval_submissions', ['project_id'])
    op.create_index('ix_equipment_approval_submissions_template_id', 'equipment_approval_submissions', ['template_id'])
    op.create_index('ix_equipment_approval_submissions_status', 'equipment_approval_submissions', ['status'])
    op.create_index('ix_equipment_approval_decisions_submission_id', 'equipment_approval_decisions', ['submission_id'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_equipment_approval_decisions_submission_id')
    op.drop_index('ix_equipment_approval_submissions_status')
    op.drop_index('ix_equipment_approval_submissions_template_id')
    op.drop_index('ix_equipment_approval_submissions_project_id')
    op.drop_index('ix_equipment_templates_category')
    op.drop_index('ix_equipment_templates_name')

    # Drop tables in reverse order (respecting foreign key dependencies)
    op.drop_table('equipment_approval_decisions')
    op.drop_table('equipment_approval_submissions')
    op.drop_table('equipment_template_consultants')
    op.drop_table('equipment_templates')
    op.drop_table('consultant_types')
