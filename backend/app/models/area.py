from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class AreaStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"


class ConstructionArea(Base):
    __tablename__ = "construction_areas"
    __table_args__ = (
        Index("ix_construction_areas_project_id", "project_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area_type: Mapped[Optional[str]] = mapped_column(String(100))
    floor_number: Mapped[Optional[int]] = mapped_column(Integer)
    area_code: Mapped[Optional[str]] = mapped_column(String(50))
    total_units: Mapped[int] = mapped_column(Integer, default=1)
    current_progress: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="areas")
    parent = relationship("ConstructionArea", remote_side=[id], backref="children")
    progress_updates = relationship("AreaProgress", back_populates="area", cascade="all, delete-orphan")


class AreaProgress(Base):
    __tablename__ = "area_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    area_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="CASCADE"))
    progress_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    photos: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reported_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    area = relationship("ConstructionArea", back_populates="progress_updates")
    reported_by = relationship("User", foreign_keys=[reported_by_id])
