import uuid
from datetime import datetime, date, time
from enum import Enum
from sqlalchemy import String, Text, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class InspectionStatus(str, Enum):
    NOT_SCHEDULED = "not_scheduled"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"
    FAILED = "failed"


class FindingType(str, Enum):
    PASS = "pass"
    MINOR_ISSUE = "minor_issue"
    MAJOR_ISSUE = "major_issue"
    CRITICAL = "critical"


class ProjectInspection(Base):
    __tablename__ = "project_inspections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    # NOTE: stage_template_id references InspectionStageTemplate which doesn't exist yet
    # Leaving as optional UUID field without FK constraint until that model is created
    stage_template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="SET NULL"))
    inspector_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(50), default=InspectionStatus.NOT_SCHEDULED.value)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    scheduled_time: Mapped[time | None] = mapped_column(Time)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    findings: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    documents: Mapped[list | None] = mapped_column(JSONB, default=list)
    additional_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", foreign_keys=[project_id])
    area = relationship("ConstructionArea", foreign_keys=[area_id])
    inspector = relationship("User", foreign_keys=[inspector_id])
    inspection_findings = relationship("InspectionFinding", back_populates="inspection", cascade="all, delete-orphan")


class InspectionFinding(Base):
    __tablename__ = "inspection_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project_inspections.id", ondelete="CASCADE"))
    finding_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    photos: Mapped[list | None] = mapped_column(JSONB, default=list)
    resolution: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inspection = relationship("ProjectInspection", back_populates="inspection_findings")
