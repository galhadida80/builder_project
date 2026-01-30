"""Add checklist models

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
    # Create checklist_templates table
    op.create_table(
        'checklist_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('level', sa.String(50), nullable=False),
        sa.Column('group', sa.String(100), nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('metadata', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    # Create checklist_subsections table
    op.create_table(
        'checklist_subsections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('metadata', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create checklist_item_templates table
    op.create_table(
        'checklist_item_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('subsection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_subsections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('description', sa.Text()),
        sa.Column('must_image', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('must_note', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('must_signature', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('metadata', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create checklist_instances table
    op.create_table(
        'checklist_instances',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('unit_identifier', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('metadata', postgresql.JSONB(), default={}),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    # Create checklist_item_responses table
    op.create_table(
        'checklist_item_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('instance_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_instances.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_item_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('notes', sa.Text()),
        sa.Column('image_urls', postgresql.JSONB(), default=[]),
        sa.Column('signature_url', sa.String(500)),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('completed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes on foreign key columns for better query performance
    op.create_index('ix_checklist_templates_project_id', 'checklist_templates', ['project_id'])
    op.create_index('ix_checklist_subsections_template_id', 'checklist_subsections', ['template_id'])
    op.create_index('ix_checklist_item_templates_subsection_id', 'checklist_item_templates', ['subsection_id'])
    op.create_index('ix_checklist_instances_template_id', 'checklist_instances', ['template_id'])
    op.create_index('ix_checklist_instances_project_id', 'checklist_instances', ['project_id'])
    op.create_index('ix_checklist_item_responses_instance_id', 'checklist_item_responses', ['instance_id'])
    op.create_index('ix_checklist_item_responses_item_template_id', 'checklist_item_responses', ['item_template_id'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_checklist_item_responses_item_template_id')
    op.drop_index('ix_checklist_item_responses_instance_id')
    op.drop_index('ix_checklist_instances_project_id')
    op.drop_index('ix_checklist_instances_template_id')
    op.drop_index('ix_checklist_item_templates_subsection_id')
    op.drop_index('ix_checklist_subsections_template_id')
    op.drop_index('ix_checklist_templates_project_id')

    # Drop tables in reverse order (children first, parents last)
    op.drop_table('checklist_item_responses')
    op.drop_table('checklist_instances')
    op.drop_table('checklist_item_templates')
    op.drop_table('checklist_subsections')
    op.drop_table('checklist_templates')
