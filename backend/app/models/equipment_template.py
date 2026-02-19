import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class SubmissionStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class DecisionType(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class ConsultantType(Base):
    __tablename__ = "consultant_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    templates = relationship("EquipmentTemplateConsultant", back_populates="consultant_type", cascade="all, delete-orphan")


class EquipmentTemplate(Base):
    __tablename__ = "equipment_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    required_documents: Mapped[list] = mapped_column(JSONB, default=list)
    required_specifications: Mapped[list] = mapped_column(JSONB, default=list)
    submission_checklist: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    approving_consultants = relationship("EquipmentTemplateConsultant", back_populates="template", cascade="all, delete-orphan")
    approval_submissions = relationship("EquipmentApprovalSubmission", back_populates="template")
    created_by = relationship("User", foreign_keys=[created_by_id])


class EquipmentTemplateConsultant(Base):
    __tablename__ = "equipment_template_consultants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_templates.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="CASCADE"))

    template = relationship("EquipmentTemplate", back_populates="approving_consultants")
    consultant_type = relationship("ConsultantType", back_populates="templates")


class EquipmentApprovalSubmission(Base):
    __tablename__ = "equipment_approval_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_templates.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    checklist_responses: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    additional_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default=SubmissionStatus.DRAFT.value)
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", back_populates="equipment_approval_submissions")
    template = relationship("EquipmentTemplate", back_populates="approval_submissions")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    decisions = relationship("EquipmentApprovalDecision", back_populates="submission", cascade="all, delete-orphan")


class EquipmentApprovalDecision(Base):
    __tablename__ = "equipment_approval_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_approval_submissions.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="SET NULL"))
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    submission = relationship("EquipmentApprovalSubmission", back_populates="decisions")
    consultant_type = relationship("ConsultantType")
    approver = relationship("User", foreign_keys=[approver_id])
