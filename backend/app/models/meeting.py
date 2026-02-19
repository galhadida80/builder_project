from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    INVITATIONS_SENT = "invitations_sent"
    PENDING_VOTES = "pending_votes"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    meeting_type: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(255))
    scheduled_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_time: Mapped[Optional[str]] = mapped_column(String(20))
    google_event_id: Mapped[Optional[str]] = mapped_column(String(255))
    summary: Mapped[Optional[str]] = mapped_column(Text)
    action_items: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(50), default=MeetingStatus.SCHEDULED.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    has_time_slots: Mapped[bool] = mapped_column(Boolean, default=False)

    project = relationship("Project", back_populates="meetings")
    created_by = relationship("User", foreign_keys=[created_by_id])
    attendees = relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")
    time_slots = relationship("MeetingTimeSlot", back_populates="meeting", cascade="all, delete-orphan")
    time_votes = relationship("MeetingTimeVote", back_populates="meeting", cascade="all, delete-orphan")


class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"))
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    role: Mapped[Optional[str]] = mapped_column(String(100))
    attendance_status: Mapped[str] = mapped_column(String(20), default="pending")
    email: Mapped[Optional[str]] = mapped_column(String(255))
    rsvp_token: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    rsvp_responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    meeting = relationship("Meeting", back_populates="attendees")
    user = relationship("User", foreign_keys=[user_id])


class MeetingTimeSlot(Base):
    __tablename__ = "meeting_time_slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"))
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    proposed_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    proposed_end: Mapped[Optional[datetime]] = mapped_column(DateTime)
    vote_count: Mapped[int] = mapped_column(Integer, default=0)

    meeting = relationship("Meeting", back_populates="time_slots")


class MeetingTimeVote(Base):
    __tablename__ = "meeting_time_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"))
    attendee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("meeting_attendees.id", ondelete="CASCADE"))
    time_slot_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("meeting_time_slots.id", ondelete="CASCADE"))
    vote_token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    voted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    meeting = relationship("Meeting", back_populates="time_votes")
    attendee = relationship("MeetingAttendee")
    time_slot = relationship("MeetingTimeSlot")
