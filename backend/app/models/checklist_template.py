from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[str] = mapped_column(String(100), nullable=False)
    group_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    logo_name: Mapped[str | None] = mapped_column(String(255))
    description_file: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sub_sections = relationship("ChecklistSubSection", back_populates="template", cascade="all, delete-orphan")
    instances = relationship("ChecklistInstance", back_populates="template")


class ChecklistSubSection(Base):
    __tablename__ = "checklist_sub_sections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    template = relationship("ChecklistTemplate", back_populates="sub_sections")
    items = relationship("ChecklistItemTemplate", back_populates="sub_section", cascade="all, delete-orphan")


class ChecklistItemTemplate(Base):
    __tablename__ = "checklist_item_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sub_section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_sub_sections.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    must_image: Mapped[bool] = mapped_column(Boolean, default=False)
    must_note: Mapped[bool] = mapped_column(Boolean, default=False)
    must_signature: Mapped[bool] = mapped_column(Boolean, default=False)
    file_names: Mapped[list] = mapped_column(JSONB, default=list)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    additional_config: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    sub_section = relationship("ChecklistSubSection", back_populates="items")


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
