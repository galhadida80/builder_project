from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.equipment import Equipment
    from app.models.material import Material
    from app.models.project import Project
    from app.models.user import User


class RFIStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    WAITING_RESPONSE = "waiting_response"
    ANSWERED = "answered"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class RFIPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RFICategory(str, Enum):
    DESIGN = "design"
    STRUCTURAL = "structural"
    MEP = "mep"
    ARCHITECTURAL = "architectural"
    SPECIFICATIONS = "specifications"
    SCHEDULE = "schedule"
    COST = "cost"
    OTHER = "other"


class RFI(Base):
    __tablename__ = "rfis"
    __table_args__ = (
        Index("ix_rfis_project_id", "project_id"),
        Index("ix_rfis_status", "status"),
        Index("ix_rfis_rfi_number", "rfi_number"),
        Index("ix_rfis_email_thread_id", "email_thread_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )

    rfi_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email_thread_id: Mapped[Optional[str]] = mapped_column(String(255))
    email_message_id: Mapped[Optional[str]] = mapped_column(String(255))

    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), default=RFICategory.OTHER.value
    )
    priority: Mapped[str] = mapped_column(
        String(20), default=RFIPriority.MEDIUM.value
    )

    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )

    related_equipment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="SET NULL")
    )
    related_material_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("materials.id", ondelete="SET NULL")
    )

    to_email: Mapped[str] = mapped_column(String(255), nullable=False)
    to_name: Mapped[Optional[str]] = mapped_column(String(255))
    cc_emails: Mapped[Optional[list]] = mapped_column(JSONB, default=list)

    status: Mapped[str] = mapped_column(
        String(50), default=RFIStatus.DRAFT.value
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    location: Mapped[Optional[str]] = mapped_column(String(255))
    drawing_reference: Mapped[Optional[str]] = mapped_column(String(255))
    specification_reference: Mapped[Optional[str]] = mapped_column(String(255))

    attachments: Mapped[Optional[list]] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    project: Mapped["Project"] = relationship("Project", back_populates="rfis")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    assigned_to: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assigned_to_id]
    )
    related_equipment: Mapped[Optional["Equipment"]] = relationship(
        "Equipment", foreign_keys=[related_equipment_id]
    )
    related_material: Mapped[Optional["Material"]] = relationship(
        "Material", foreign_keys=[related_material_id]
    )
    responses: Mapped[list["RFIResponse"]] = relationship(
        "RFIResponse",
        back_populates="rfi",
        cascade="all, delete-orphan",
        order_by="RFIResponse.created_at",
    )
    email_logs: Mapped[list["RFIEmailLog"]] = relationship(
        "RFIEmailLog",
        back_populates="rfi",
        cascade="all, delete-orphan",
        order_by="RFIEmailLog.created_at",
    )


class RFIResponse(Base):
    __tablename__ = "rfi_responses"
    __table_args__ = (
        Index("ix_rfi_responses_rfi_id", "rfi_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rfi_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="CASCADE")
    )

    email_message_id: Mapped[Optional[str]] = mapped_column(String(255))
    in_reply_to: Mapped[Optional[str]] = mapped_column(String(255))

    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[Optional[list]] = mapped_column(JSONB, default=list)

    from_email: Mapped[str] = mapped_column(String(255), nullable=False)
    from_name: Mapped[Optional[str]] = mapped_column(String(255))
    responder_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )

    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)
    is_cc_participant: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(50), default="email")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    rfi: Mapped["RFI"] = relationship("RFI", back_populates="responses")
    responder: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[responder_id]
    )


class RFIEmailLog(Base):
    __tablename__ = "rfi_email_logs"
    __table_args__ = (
        Index("ix_rfi_email_logs_rfi_id", "rfi_id"),
        Index("ix_rfi_email_logs_event_type", "event_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rfi_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="SET NULL")
    )

    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    email_message_id: Mapped[Optional[str]] = mapped_column(String(255))
    from_email: Mapped[Optional[str]] = mapped_column(String(255))
    to_email: Mapped[Optional[str]] = mapped_column(String(255))
    subject: Mapped[Optional[str]] = mapped_column(String(500))

    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    rfi: Mapped[Optional["RFI"]] = relationship("RFI", back_populates="email_logs")
