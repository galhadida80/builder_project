"""upgrade meeting attendees for RSVP

Revision ID: 033
Revises: 032
Create Date: 2026-02-19
"""

import sqlalchemy as sa
from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("meeting_attendees", sa.Column("attendance_status", sa.String(20), server_default="pending", nullable=False))
    op.add_column("meeting_attendees", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("meeting_attendees", sa.Column("rsvp_token", sa.String(255), nullable=True))
    op.add_column("meeting_attendees", sa.Column("rsvp_responded_at", sa.DateTime, nullable=True))

    op.create_index("ix_meeting_attendees_rsvp_token", "meeting_attendees", ["rsvp_token"], unique=True)

    op.execute("UPDATE meeting_attendees SET attendance_status = 'accepted' WHERE confirmed = true")
    op.execute("UPDATE meeting_attendees SET attendance_status = 'pending' WHERE confirmed = false")

    op.drop_column("meeting_attendees", "confirmed")


def downgrade() -> None:
    op.add_column("meeting_attendees", sa.Column("confirmed", sa.Boolean, server_default="false", nullable=False))
    op.execute("UPDATE meeting_attendees SET confirmed = true WHERE attendance_status = 'accepted'")
    op.drop_index("ix_meeting_attendees_rsvp_token", table_name="meeting_attendees")
    op.drop_column("meeting_attendees", "rsvp_responded_at")
    op.drop_column("meeting_attendees", "rsvp_token")
    op.drop_column("meeting_attendees", "email")
    op.drop_column("meeting_attendees", "attendance_status")
