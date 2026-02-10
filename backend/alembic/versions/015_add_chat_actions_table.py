"""Add chat_actions table

Revision ID: 015
Revises: 014
Create Date: 2026-02-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("parameters", postgresql.JSONB(), server_default="{}"),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), server_default="proposed"),
        sa.Column("result", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("executed_at", sa.DateTime(), nullable=True),
        sa.Column("executed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["conversation_id"], ["chat_conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["message_id"], ["chat_messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["executed_by_id"], ["users.id"]),
    )
    op.create_index("ix_chat_actions_conversation_id", "chat_actions", ["conversation_id"])
    op.create_index("ix_chat_actions_message_id", "chat_actions", ["message_id"])
    op.create_index("ix_chat_actions_status", "chat_actions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_chat_actions_status", table_name="chat_actions")
    op.drop_index("ix_chat_actions_message_id", table_name="chat_actions")
    op.drop_index("ix_chat_actions_conversation_id", table_name="chat_actions")
    op.drop_table("chat_actions")
