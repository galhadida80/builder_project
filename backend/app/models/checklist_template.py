import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ChecklistInstanceStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"


class ItemResponseStatus(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    NA = "na"


class ChecklistInstance(Base):
    __tablename__ = "checklist_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="SET NULL"))
    unit_identifier: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default=ChecklistInstanceStatus.NOT_STARTED.value)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    additional_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", foreign_keys=[project_id])
    template = relationship("ChecklistTemplate", foreign_keys=[template_id], back_populates="instances")
    area = relationship("ConstructionArea", foreign_keys=[area_id])
    completed_by_user = relationship("User", foreign_keys=[completed_by])
    responses = relationship("ChecklistItemResponse", back_populates="instance", cascade="all, delete-orphan")


class ChecklistItemResponse(Base):
    __tablename__ = "checklist_item_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_instances.id", ondelete="CASCADE"), nullable=False)
    item_template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_item_templates.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=ItemResponseStatus.PENDING.value)
    note: Mapped[str | None] = mapped_column(Text)
    image_file_ids: Mapped[list | None] = mapped_column(JSONB, default=list)
    signature_file_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    responded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    responded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    additional_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    instance = relationship("ChecklistInstance", back_populates="responses")
    item_template = relationship("ChecklistItemTemplate", foreign_keys=[item_template_id])
    responded_by_user = relationship("User", foreign_keys=[responded_by])
