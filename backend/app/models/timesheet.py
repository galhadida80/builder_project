from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class Timesheet(Base):
    __tablename__ = "timesheets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    regular_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    overtime_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    user = relationship("User", foreign_keys=[user_id])
    project = relationship("Project", foreign_keys=[project_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    time_entries = relationship("TimeEntry", primaryjoin="and_(foreign(TimeEntry.user_id)==Timesheet.user_id, foreign(TimeEntry.project_id)==Timesheet.project_id, foreign(TimeEntry.clock_in_time)>=Timesheet.start_date, foreign(TimeEntry.clock_in_time)<=Timesheet.end_date)", viewonly=True)
