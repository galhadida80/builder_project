import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class TalkStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ToolboxTalk(Base):
    __tablename__ = "toolbox_talks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    scheduled_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255))
    presenter: Mapped[Optional[str]] = mapped_column(String(255))
    key_points: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    action_items: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    duration_minutes: Mapped[Optional[int]] = mapped_column()
    status: Mapped[str] = mapped_column(String(50), default=TalkStatus.SCHEDULED.value)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", backref="toolbox_talks")
    created_by = relationship("User", foreign_keys=[created_by_id])
    attendees = relationship("TalkAttendee", back_populates="talk", cascade="all, delete-orphan")


class TalkAttendee(Base):
    __tablename__ = "talk_attendees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    talk_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("toolbox_talks.id", ondelete="CASCADE"))
    worker_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    worker_name: Mapped[Optional[str]] = mapped_column(String(255))
    attended: Mapped[bool] = mapped_column(default=True)
    signature: Mapped[Optional[str]] = mapped_column(Text)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    talk = relationship("ToolboxTalk", back_populates="attendees")
    worker = relationship("Contact", foreign_keys=[worker_id])
