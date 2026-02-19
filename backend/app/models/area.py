from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class AreaStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"


class ConstructionArea(Base):
    __tablename__ = "construction_areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area_type: Mapped[Optional[str]] = mapped_column(String(100))
    floor_number: Mapped[Optional[int]] = mapped_column(Integer)
    area_code: Mapped[Optional[str]] = mapped_column(String(50))
    total_units: Mapped[int] = mapped_column(Integer, default=1)
    current_progress: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    area_level: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="not_started")
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    project = relationship("Project", back_populates="areas")
    parent = relationship("ConstructionArea", remote_side=[id], backref="children")
    progress_updates = relationship("AreaProgress", back_populates="area", cascade="all, delete-orphan")
    checklist_instances = relationship("ChecklistInstance", back_populates="area")


class AreaProgress(Base):
    __tablename__ = "area_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="CASCADE"))
    progress_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    photos: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    reported_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    area = relationship("ConstructionArea", back_populates="progress_updates")
    reported_by = relationship("User", foreign_keys=[reported_by_id])


class AreaChecklistAssignment(Base):
    __tablename__ = "area_checklist_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    area_type: Mapped[str] = mapped_column(String(100), nullable=False)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"))
    auto_create: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project")
    template = relationship("ChecklistTemplate")
    created_by = relationship("User", foreign_keys=[created_by_id])
