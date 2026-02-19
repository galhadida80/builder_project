"""add meeting time slots and votes

Revision ID: 034
Revises: 033
Create Date: 2026-02-19
"""

import sqlalchemy as sa
from alembic import op

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("meetings", sa.Column("has_time_slots", sa.Boolean, server_default="false", nullable=False))

    op.create_table(
        "meeting_time_slots",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("meeting_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot_number", sa.Integer, nullable=False),
        sa.Column("proposed_start", sa.DateTime, nullable=False),
        sa.Column("proposed_end", sa.DateTime, nullable=True),
        sa.Column("vote_count", sa.Integer, server_default="0", nullable=False),
        sa.UniqueConstraint("meeting_id", "slot_number", name="uq_meeting_time_slots_meeting_slot"),
    )

    op.create_table(
        "meeting_time_votes",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("meeting_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attendee_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("meeting_attendees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time_slot_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("meeting_time_slots.id", ondelete="CASCADE"), nullable=True),
        sa.Column("vote_token", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("voted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("meeting_id", "attendee_id", name="uq_meeting_time_votes_meeting_attendee"),
    )


def downgrade() -> None:
    op.drop_table("meeting_time_votes")
    op.drop_table("meeting_time_slots")
    op.drop_column("meetings", "has_time_slots")
