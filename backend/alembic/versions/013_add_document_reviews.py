"""Add document reviews and comments

Revision ID: 013
Revises: 012
Create Date: 2026-02-05

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = '013'
down_revision: Union[str, None] = '012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create document_reviews table
    op.create_table(
        'document_reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('reviewed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('reviewed_at', sa.DateTime()),
    )

    # Create indexes on document_reviews
    op.create_index('ix_document_reviews_project_id', 'document_reviews', ['project_id'])
    op.create_index('ix_document_reviews_document_id', 'document_reviews', ['document_id'])
    op.create_index('ix_document_reviews_project_document', 'document_reviews', ['project_id', 'document_id'])

    # Create document_comments table
    op.create_table(
        'document_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('review_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('document_reviews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('parent_comment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('document_comments.id', ondelete='CASCADE')),
        sa.Column('comment_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), default=False, nullable=False),
    )

    # Create indexes on document_comments
    op.create_index('ix_document_comments_review_id', 'document_comments', ['review_id'])
    op.create_index('ix_document_comments_parent_comment_id', 'document_comments', ['parent_comment_id'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_document_comments_parent_comment_id')
    op.drop_index('ix_document_comments_review_id')
    op.drop_index('ix_document_reviews_project_document')
    op.drop_index('ix_document_reviews_document_id')
    op.drop_index('ix_document_reviews_project_id')

    # Drop tables
    op.drop_table('document_comments')
    op.drop_table('document_reviews')
