"""Add document versions and annotations tables

Revision ID: 040
Revises: 039
Create Date: 2026-02-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '040'
down_revision: Union[str, None] = '039'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'document_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('file_id', UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('version_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('storage_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('uploaded_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'document_annotations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('file_id', UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('page_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('x_position', sa.Float(), nullable=False),
        sa.Column('y_position', sa.Float(), nullable=False),
        sa.Column('width', sa.Float(), nullable=True),
        sa.Column('height', sa.Float(), nullable=True),
        sa.Column('annotation_type', sa.String(50), nullable=False, server_default='comment'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('created_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('document_annotations')
    op.drop_table('document_versions')
