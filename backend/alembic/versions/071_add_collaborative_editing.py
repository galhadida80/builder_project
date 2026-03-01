"""Add collaborative editing tables

Revision ID: 071
Revises: 070
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "071"
down_revision = "070"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collaborative_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("yjs_state", sa.LargeBinary(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_collaborative_documents_project_id", "collaborative_documents", ["project_id"])
    op.create_index("ix_collaborative_documents_content_type", "collaborative_documents", ["content_type"])

    op.create_table(
        "document_collaborators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("collaborative_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cursor_position", postgresql.JSON(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=False, nullable=False),
    )
    op.create_index("ix_document_collaborators_document_id", "document_collaborators", ["document_id"])
    op.create_index("ix_document_collaborators_user_id", "document_collaborators", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_document_collaborators_user_id", table_name="document_collaborators")
    op.drop_index("ix_document_collaborators_document_id", table_name="document_collaborators")
    op.drop_table("document_collaborators")
    op.drop_index("ix_collaborative_documents_content_type", table_name="collaborative_documents")
    op.drop_index("ix_collaborative_documents_project_id", table_name="collaborative_documents")
    op.drop_table("collaborative_documents")
