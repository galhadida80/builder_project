import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class MaterialTemplate(Base):
    __tablename__ = "material_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    required_documents: Mapped[list] = mapped_column(JSONB, default=list)
    required_specifications: Mapped[list] = mapped_column(JSONB, default=list)
    submission_checklist: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    approving_consultants = relationship("MaterialTemplateConsultant", back_populates="template", cascade="all, delete-orphan")
    approval_submissions = relationship("MaterialApprovalSubmission", back_populates="template")


class MaterialTemplateConsultant(Base):
    __tablename__ = "material_template_consultants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("material_templates.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="CASCADE"))

    template = relationship("MaterialTemplate", back_populates="approving_consultants")
    consultant_type = relationship("ConsultantType")


class MaterialApprovalSubmission(Base):
    __tablename__ = "material_approval_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("material_templates.id", ondelete="SET NULL"))
    material_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    checklist_responses: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    additional_data: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project")
    template = relationship("MaterialTemplate", back_populates="approval_submissions")
    material = relationship("Material")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    decisions = relationship("MaterialApprovalDecision", back_populates="submission", cascade="all, delete-orphan")


class MaterialApprovalDecision(Base):
    __tablename__ = "material_approval_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("material_approval_submissions.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="SET NULL"))
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    submission = relationship("MaterialApprovalSubmission", back_populates="decisions")
    consultant_type = relationship("ConsultantType")
    approver = relationship("User", foreign_keys=[approver_id])
