import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class SubmissionStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class DecisionType(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"


class EquipmentApprovalSubmission(Base):
    __tablename__ = "equipment_approval_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    # TODO: template_id depends on EquipmentTemplate model (to be created in separate task)
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_templates.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    checklist_responses: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    additional_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default=SubmissionStatus.DRAFT.value)
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="equipment_approval_submissions")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    decisions = relationship("EquipmentApprovalDecision", back_populates="submission", cascade="all, delete-orphan")


class EquipmentApprovalDecision(Base):
    __tablename__ = "equipment_approval_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_approval_submissions.id", ondelete="CASCADE"))
    # TODO: consultant_type_id depends on ConsultantType model (to be created in separate task)
    consultant_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="SET NULL"))
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    submission = relationship("EquipmentApprovalSubmission", back_populates="decisions")
    approver = relationship("User", foreign_keys=[approver_id])
