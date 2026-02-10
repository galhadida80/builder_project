"""Add ChecklistInstance and ChecklistItemResponse models

Revision ID: 002
Revises: 001
Create Date: 2026-01-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create checklist_templates table
    op.create_table(
        'checklist_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_he', sa.String(255), nullable=False),
        sa.Column('level', sa.String(100), nullable=False),
        sa.Column('group_name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('logo_name', sa.String(255)),
        sa.Column('description_file', sa.String(255)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create checklist_sub_sections table
    op.create_table(
        'checklist_sub_sections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_he', sa.String(255), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
    )

    # Create checklist_item_templates table
    op.create_table(
        'checklist_item_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sub_section_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_sub_sections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_he', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100)),
        sa.Column('description', sa.Text()),
        sa.Column('must_image', sa.Boolean(), default=False),
        sa.Column('must_note', sa.Boolean(), default=False),
        sa.Column('must_signature', sa.Boolean(), default=False),
        sa.Column('file_names', postgresql.JSONB(), default=list),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.Column('additional_config', postgresql.JSONB(), default=dict),
    )

    # Create checklist_instances table
    op.create_table(
        'checklist_instances',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('construction_areas.id', ondelete='SET NULL')),
        sa.Column('unit_identifier', sa.String(255)),
        sa.Column('status', sa.String(50), default='not_started'),
        sa.Column('started_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('completed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('additional_data', postgresql.JSONB(), default=dict),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create checklist_item_responses table
    op.create_table(
        'checklist_item_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('instance_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_instances.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('checklist_item_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('note', sa.Text()),
        sa.Column('image_file_ids', postgresql.JSONB(), default=list),
        sa.Column('signature_file_id', postgresql.UUID(as_uuid=True)),
        sa.Column('responded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('responded_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('additional_data', postgresql.JSONB(), default=dict),
    )


def downgrade() -> None:
    op.drop_table('checklist_item_responses')
    op.drop_table('checklist_instances')
    op.drop_table('checklist_item_templates')
    op.drop_table('checklist_sub_sections')
    op.drop_table('checklist_templates')
