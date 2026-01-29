import uuid
from datetime import datetime, date
from enum import Enum
from sqlalchemy import String, Text, DateTime, Integer, Boolean, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class InspectionStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    APPROVED = "approved"


class ResultStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    APPROVED = "approved"
    REJECTED = "rejected"


class ConsultantType(Base):
    __tablename__ = "consultant_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    stage_count: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    templates = relationship("InspectionStageTemplate", back_populates="consultant_type", cascade="all, delete-orphan")
    inspections = relationship("ProjectInspection", back_populates="consultant_type")


class InspectionStageTemplate(Base):
    __tablename__ = "inspection_stage_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="CASCADE"))
    stage_definitions: Mapped[dict | None] = mapped_column(MutableDict.as_mutable(JSONB), default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consultant_type = relationship("ConsultantType", back_populates="templates")


class ProjectInspection(Base):
    __tablename__ = "project_inspections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="CASCADE"))
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="CASCADE"))
    template_snapshot: Mapped[dict | None] = mapped_column(MutableDict.as_mutable(JSONB), default=dict)
    status: Mapped[str] = mapped_column(String(50), default=InspectionStatus.SCHEDULED.value)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    assigned_inspector: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="inspections")
    consultant_type = relationship("ConsultantType", back_populates="inspections")
    area = relationship("ConstructionArea", foreign_keys=[area_id])
    results = relationship("InspectionResult", back_populates="inspection", cascade="all, delete-orphan")


class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_inspections.id", ondelete="CASCADE"))
    stage_number: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_date: Mapped[date | None] = mapped_column(Date)
    approval_date: Mapped[date | None] = mapped_column(Date)
    inspector_name: Mapped[str | None] = mapped_column(String(255))
    result_status: Mapped[str] = mapped_column(String(50), default=ResultStatus.PENDING.value)
    findings: Mapped[str | None] = mapped_column(Text)
    attachments: Mapped[dict | None] = mapped_column(MutableDict.as_mutable(JSONB), default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inspection = relationship("ProjectInspection", back_populates="results")
