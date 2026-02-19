import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class InspectionStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FindingStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"


class InspectionStage(Base):
    __tablename__ = "inspection_stages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_consultant_types.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    required_documentation: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    consultant_type = relationship("InspectionConsultantType", back_populates="stages")


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_consultant_types.id"))
    scheduled_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime)
    current_stage: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default=InspectionStatus.PENDING.value)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="inspections")
    consultant_type = relationship("InspectionConsultantType", back_populates="inspections")
    created_by = relationship("User", foreign_keys=[created_by_id])
    findings = relationship("Finding", back_populates="inspection", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=FindingStatus.OPEN.value)
    location: Mapped[str | None] = mapped_column(String(255))
    photos: Mapped[list | None] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    inspection = relationship("Inspection", back_populates="findings")
    created_by = relationship("User", foreign_keys=[created_by_id])
