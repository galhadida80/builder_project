"""add checklist templates

Revision ID: 004
Revises: 003
Create Date: 2026-01-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create checklist_templates table
    op.create_table(
        'checklist_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('group_name', sa.String()),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes for checklist_templates
    op.create_index('ix_checklist_templates_level', 'checklist_templates', ['level'])
    op.create_index('ix_checklist_templates_group_name', 'checklist_templates', ['group_name'])

    # Create checklist_sub_sections table
    op.create_table(
        'checklist_sub_sections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes for checklist_sub_sections
    op.create_index('ix_checklist_sub_sections_template_id', 'checklist_sub_sections', ['template_id'])
    op.create_index('ix_checklist_sub_sections_order', 'checklist_sub_sections', ['order'])

    # Create checklist_item_templates table
    op.create_table(
        'checklist_item_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sub_section_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_sub_sections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('item_type', sa.String(), nullable=False),
        sa.Column('required', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes for checklist_item_templates
    op.create_index('ix_checklist_item_templates_sub_section_id', 'checklist_item_templates', ['sub_section_id'])
    op.create_index('ix_checklist_item_templates_order', 'checklist_item_templates', ['order'])

    # Create checklist_instances table
    op.create_table(
        'checklist_instances',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_templates.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('construction_areas.id', ondelete='SET NULL')),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('completed_at', sa.DateTime()),
    )

    # Create indexes for checklist_instances
    op.create_index('ix_checklist_instances_project_id', 'checklist_instances', ['project_id'])
    op.create_index('ix_checklist_instances_template_id', 'checklist_instances', ['template_id'])
    op.create_index('ix_checklist_instances_area_id', 'checklist_instances', ['area_id'])
    op.create_index('ix_checklist_instances_status', 'checklist_instances', ['status'])

    # Create checklist_item_responses table
    op.create_table(
        'checklist_item_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('instance_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_instances.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_item_templates.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('response_value', sa.Text()),
        sa.Column('completed', sa.Boolean(), default=False),
        sa.Column('responded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('responded_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('instance_id', 'item_template_id', name='unique_instance_item'),
    )

    # Create indexes for checklist_item_responses
    op.create_index('ix_checklist_item_responses_instance_id', 'checklist_item_responses', ['instance_id'])
    op.create_index('ix_checklist_item_responses_item_template_id', 'checklist_item_responses', ['item_template_id'])


def downgrade() -> None:
    # Drop indexes and tables in reverse order
    op.drop_index('ix_checklist_item_responses_item_template_id')
    op.drop_index('ix_checklist_item_responses_instance_id')
    op.drop_table('checklist_item_responses')

    op.drop_index('ix_checklist_instances_status')
    op.drop_index('ix_checklist_instances_area_id')
    op.drop_index('ix_checklist_instances_template_id')
    op.drop_index('ix_checklist_instances_project_id')
    op.drop_table('checklist_instances')

    op.drop_index('ix_checklist_item_templates_order')
    op.drop_index('ix_checklist_item_templates_sub_section_id')
    op.drop_table('checklist_item_templates')

    op.drop_index('ix_checklist_sub_sections_order')
    op.drop_index('ix_checklist_sub_sections_template_id')
    op.drop_table('checklist_sub_sections')

    op.drop_index('ix_checklist_templates_group_name')
    op.drop_index('ix_checklist_templates_level')
    op.drop_table('checklist_templates')
