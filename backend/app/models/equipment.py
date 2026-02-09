from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class Equipment(Base):
    __tablename__ = "equipment"
    __table_args__ = (
        Index("ix_equipment_project_id", "project_id"),
        Index("ix_equipment_status", "status"),
        Index("ix_equipment_created_at", "created_at"),
        Index("ix_equipment_project_status", "project_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    equipment_type: Mapped[Optional[str]] = mapped_column(String(100))
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255))
    model_number: Mapped[Optional[str]] = mapped_column(String(100))
    serial_number: Mapped[Optional[str]] = mapped_column(String(100))
    specifications: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.DRAFT.value)
    installation_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    warranty_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="equipment")
    created_by = relationship("User", foreign_keys=[created_by_id])
    checklists = relationship("EquipmentChecklist", back_populates="equipment", cascade="all, delete-orphan")
    files = relationship("File", primaryjoin="and_(Equipment.id==foreign(File.entity_id), File.entity_type=='equipment')", viewonly=True)


class EquipmentChecklist(Base):
    __tablename__ = "equipment_checklists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="CASCADE"))
    checklist_name: Mapped[str] = mapped_column(String(255), nullable=False)
    items: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="checklists")
