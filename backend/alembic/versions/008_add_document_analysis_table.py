"""Add document_analyses table

Revision ID: 008
Revises: 007
Create Date: 2026-02-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'document_analyses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('file_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('analysis_type', sa.String(50), nullable=False),
        sa.Column('result', postgresql.JSONB),
        sa.Column('model_used', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('error_message', sa.Text),
        sa.Column('processing_time_ms', sa.Integer),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_document_analyses_file_id', 'document_analyses', ['file_id'])
    op.create_index('ix_document_analyses_project_id', 'document_analyses', ['project_id'])


def downgrade() -> None:
    op.drop_index('ix_document_analyses_project_id')
    op.drop_index('ix_document_analyses_file_id')
    op.drop_table('document_analyses')
