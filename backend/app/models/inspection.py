import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class InspectionStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FindingStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class InspectionConsultantType(Base):
    __tablename__ = "inspection_consultant_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stage_templates = relationship("InspectionStageTemplate", back_populates="consultant_type", cascade="all, delete-orphan")


class InspectionStageTemplate(Base):
    __tablename__ = "inspection_stage_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_consultant_types.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consultant_type = relationship("InspectionConsultantType", back_populates="stage_templates")
    inspections = relationship("ProjectInspection", back_populates="stage_template", cascade="all, delete-orphan")


class ProjectInspection(Base):
    __tablename__ = "project_inspections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage_template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_stage_templates.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=InspectionStatus.SCHEDULED.value)
    scheduled_date: Mapped[datetime | None] = mapped_column(DateTime)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="inspections")
    stage_template = relationship("InspectionStageTemplate", back_populates="inspections")
    created_by = relationship("User", foreign_keys=[created_by_id])
    findings = relationship("InspectionFinding", back_populates="inspection", cascade="all, delete-orphan")


class InspectionFinding(Base):
    __tablename__ = "inspection_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_inspections.id", ondelete="CASCADE"), nullable=False)
    finding_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default=FindingStatus.OPEN.value)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    inspection = relationship("ProjectInspection", back_populates="findings")
    created_by = relationship("User", foreign_keys=[created_by_id])
