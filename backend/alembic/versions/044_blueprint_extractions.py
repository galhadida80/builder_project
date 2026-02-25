"""blueprint extractions and imports

Revision ID: 044
Revises: 043
Create Date: 2026-02-25
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = '044'
down_revision = '043'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'blueprint_extractions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_id', UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='CASCADE'), nullable=True),
        sa.Column('bim_model_id', UUID(as_uuid=True), sa.ForeignKey('bim_models.id', ondelete='CASCADE'), nullable=True),
        sa.Column('extraction_source', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('extracted_data', JSONB, nullable=True),
        sa.Column('summary', JSONB, nullable=True),
        sa.Column('tier_used', sa.String(50), nullable=True),
        sa.Column('processing_time_ms', sa.Integer, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('language', sa.String(10), nullable=False, server_default='he'),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('created_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
        sa.CheckConstraint('file_id IS NOT NULL OR bim_model_id IS NOT NULL', name='ck_blueprint_extraction_source'),
    )

    op.create_index('ix_blueprint_extractions_project_id', 'blueprint_extractions', ['project_id'])
    op.create_index('ix_blueprint_extractions_file_id', 'blueprint_extractions', ['file_id'])
    op.create_index('ix_blueprint_extractions_bim_model_id', 'blueprint_extractions', ['bim_model_id'])

    op.create_table(
        'blueprint_imports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('extraction_id', UUID(as_uuid=True), sa.ForeignKey('blueprint_extractions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('imported_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('skipped_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('imported_entity_ids', JSONB, nullable=True),
        sa.Column('created_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('blueprint_imports')
    op.drop_index('ix_blueprint_extractions_bim_model_id', table_name='blueprint_extractions')
    op.drop_index('ix_blueprint_extractions_file_id', table_name='blueprint_extractions')
    op.drop_index('ix_blueprint_extractions_project_id', table_name='blueprint_extractions')
    op.drop_table('blueprint_extractions')
