"""Initial tables

Revision ID: 001
Revises:
Create Date: 2024-01-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('firebase_uid', sa.String(128), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('full_name', sa.String(255)),
        sa.Column('phone', sa.String(50)),
        sa.Column('company', sa.String(255)),
        sa.Column('role', sa.String(50)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('address', sa.Text()),
        sa.Column('status', sa.String(50), default='active'),
        sa.Column('start_date', sa.Date()),
        sa.Column('estimated_end_date', sa.Date()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'project_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('added_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('project_id', 'user_id', name='unique_project_member'),
    )

    op.create_table(
        'contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('company', sa.String(255)),
        sa.Column('role', sa.String(100)),
        sa.Column('email', sa.String(255)),
        sa.Column('phone', sa.String(50)),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'equipment',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('equipment_type', sa.String(100)),
        sa.Column('manufacturer', sa.String(255)),
        sa.Column('model_number', sa.String(100)),
        sa.Column('serial_number', sa.String(100)),
        sa.Column('specifications', postgresql.JSONB()),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('installation_date', sa.Date()),
        sa.Column('warranty_expiry', sa.Date()),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'equipment_checklists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('equipment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment.id', ondelete='CASCADE'), nullable=False),
        sa.Column('checklist_name', sa.String(255), nullable=False),
        sa.Column('items', postgresql.JSONB(), default=[]),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'materials',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('material_type', sa.String(100)),
        sa.Column('manufacturer', sa.String(255)),
        sa.Column('model_number', sa.String(100)),
        sa.Column('quantity', sa.Numeric(10, 2)),
        sa.Column('unit', sa.String(50)),
        sa.Column('specifications', postgresql.JSONB()),
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('expected_delivery', sa.Date()),
        sa.Column('actual_delivery', sa.Date()),
        sa.Column('storage_location', sa.String(255)),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'meetings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('meeting_type', sa.String(50)),
        sa.Column('location', sa.String(255)),
        sa.Column('scheduled_date', sa.DateTime(), nullable=False),
        sa.Column('scheduled_time', sa.String(20)),
        sa.Column('google_event_id', sa.String(255)),
        sa.Column('summary', sa.Text()),
        sa.Column('action_items', postgresql.JSONB(), default=[]),
        sa.Column('status', sa.String(50), default='scheduled'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'meeting_attendees',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('meeting_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('meetings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('role', sa.String(100)),
        sa.Column('confirmed', sa.Boolean(), default=False),
    )

    op.create_table(
        'approval_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('current_step', sa.Integer(), default=1),
        sa.Column('current_status', sa.String(50), default='submitted'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'approval_steps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('approval_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('approval_requests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_order', sa.Integer(), nullable=False),
        sa.Column('approver_role', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('approved_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('approved_at', sa.DateTime()),
        sa.Column('comments', sa.Text()),
    )

    op.create_table(
        'construction_areas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('construction_areas.id')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('area_type', sa.String(100)),
        sa.Column('floor_number', sa.Integer()),
        sa.Column('area_code', sa.String(50)),
        sa.Column('total_units', sa.Integer(), default=1),
        sa.Column('current_progress', sa.Numeric(5, 2), default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        'area_progress',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('construction_areas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('progress_percentage', sa.Numeric(5, 2), default=0),
        sa.Column('notes', sa.Text()),
        sa.Column('photos', postgresql.JSONB(), default=[]),
        sa.Column('reported_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('reported_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'files',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(100)),
        sa.Column('file_size', sa.Integer()),
        sa.Column('storage_path', sa.String(500), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('uploaded_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('old_values', postgresql.JSONB()),
        sa.Column('new_values', postgresql.JSONB()),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.String(500)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_index('ix_audit_logs_project_id', 'audit_logs', ['project_id'])
    op.create_index('ix_audit_logs_entity_type_entity_id', 'audit_logs', ['entity_type', 'entity_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_audit_logs_created_at')
    op.drop_index('ix_audit_logs_entity_type_entity_id')
    op.drop_index('ix_audit_logs_project_id')
    op.drop_table('audit_logs')
    op.drop_table('files')
    op.drop_table('area_progress')
    op.drop_table('construction_areas')
    op.drop_table('approval_steps')
    op.drop_table('approval_requests')
    op.drop_table('meeting_attendees')
    op.drop_table('meetings')
    op.drop_table('materials')
    op.drop_table('equipment_checklists')
    op.drop_table('equipment')
    op.drop_table('contacts')
    op.drop_table('project_members')
    op.drop_table('projects')
    op.drop_table('users')
