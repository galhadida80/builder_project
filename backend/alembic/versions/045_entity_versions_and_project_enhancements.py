"""entity versions and project enhancements

Revision ID: 045
Revises: 044
Create Date: 2026-02-25
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = '045'
down_revision = '044'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('website', sa.String(500), nullable=True))
    op.add_column('projects', sa.Column('image_url', sa.String(500), nullable=True))
    op.add_column('projects', sa.Column('location_lat', sa.Float, nullable=True))
    op.add_column('projects', sa.Column('location_lng', sa.Float, nullable=True))
    op.add_column('projects', sa.Column('location_address', sa.Text, nullable=True))

    op.create_table(
        'entity_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', UUID(as_uuid=True), nullable=False),
        sa.Column('version_number', sa.Integer, nullable=False),
        sa.Column('changes', JSONB, nullable=False),
        sa.Column('changed_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_entity_versions_entity', 'entity_versions', ['entity_type', 'entity_id'])

    op.add_column('equipment', sa.Column('is_closed', sa.Boolean, server_default='false'))
    op.add_column('equipment', sa.Column('reminder_interval_hours', sa.Integer, server_default='48'))
    op.add_column('equipment', sa.Column('last_reminder_sent_at', sa.DateTime, nullable=True))
    op.add_column('equipment', sa.Column('distribution_emails', JSONB, server_default='[]'))
    op.add_column('equipment', sa.Column('approver_contact_ids', JSONB, server_default='[]'))
    op.add_column('equipment', sa.Column('contractor_signature_url', sa.String(500), nullable=True))
    op.add_column('equipment', sa.Column('supervisor_signature_url', sa.String(500), nullable=True))
    op.add_column('equipment', sa.Column('approval_due_date', sa.Date, nullable=True))

    op.add_column('materials', sa.Column('is_closed', sa.Boolean, server_default='false'))
    op.add_column('materials', sa.Column('reminder_interval_hours', sa.Integer, server_default='48'))
    op.add_column('materials', sa.Column('last_reminder_sent_at', sa.DateTime, nullable=True))
    op.add_column('materials', sa.Column('distribution_emails', JSONB, server_default='[]'))
    op.add_column('materials', sa.Column('approver_contact_ids', JSONB, server_default='[]'))
    op.add_column('materials', sa.Column('contractor_signature_url', sa.String(500), nullable=True))
    op.add_column('materials', sa.Column('supervisor_signature_url', sa.String(500), nullable=True))
    op.add_column('materials', sa.Column('approval_due_date', sa.Date, nullable=True))


def downgrade() -> None:
    for table in ('materials', 'equipment'):
        op.drop_column(table, 'approval_due_date')
        op.drop_column(table, 'supervisor_signature_url')
        op.drop_column(table, 'contractor_signature_url')
        op.drop_column(table, 'approver_contact_ids')
        op.drop_column(table, 'distribution_emails')
        op.drop_column(table, 'last_reminder_sent_at')
        op.drop_column(table, 'reminder_interval_hours')
        op.drop_column(table, 'is_closed')

    op.drop_index('ix_entity_versions_entity', table_name='entity_versions')
    op.drop_table('entity_versions')

    op.drop_column('projects', 'location_address')
    op.drop_column('projects', 'location_lng')
    op.drop_column('projects', 'location_lat')
    op.drop_column('projects', 'image_url')
    op.drop_column('projects', 'website')
