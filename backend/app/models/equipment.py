from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class ApprovalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class Equipment(Base):
    __tablename__ = "equipment"

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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    reminder_interval_hours: Mapped[int] = mapped_column(Integer, default=48, server_default="48")
    last_reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    distribution_emails: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    approver_contact_ids: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    contractor_signature_url: Mapped[Optional[str]] = mapped_column(String(500))
    supervisor_signature_url: Mapped[Optional[str]] = mapped_column(String(500))
    approval_due_date: Mapped[Optional[date]] = mapped_column(Date)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment_templates.id", ondelete="SET NULL"), nullable=True
    )
    bim_object_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bim_model_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bim_models.id", ondelete="SET NULL"), nullable=True
    )
    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True
    )

    project = relationship("Project", back_populates="equipment")
    created_by = relationship("User", foreign_keys=[created_by_id])
    template = relationship("EquipmentTemplate", foreign_keys=[template_id])
    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    checklists = relationship("EquipmentChecklist", back_populates="equipment", cascade="all, delete-orphan")
    files = relationship("File", primaryjoin="and_(Equipment.id==foreign(File.entity_id), File.entity_type=='equipment')", viewonly=True)


class EquipmentChecklist(Base):
    __tablename__ = "equipment_checklists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="CASCADE"))
    checklist_name: Mapped[str] = mapped_column(String(255), nullable=False)
    items: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    equipment = relationship("Equipment", back_populates="checklists")
