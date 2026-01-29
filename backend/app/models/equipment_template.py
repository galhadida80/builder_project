import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ConsultantType(Base):
    __tablename__ = "consultant_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    templates = relationship("EquipmentTemplateConsultant", back_populates="consultant_type", cascade="all, delete-orphan")


class EquipmentTemplate(Base):
    __tablename__ = "equipment_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    required_documents: Mapped[list] = mapped_column(JSONB, default=list)
    required_specifications: Mapped[list] = mapped_column(JSONB, default=list)
    submission_checklist: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    approving_consultants = relationship("EquipmentTemplateConsultant", back_populates="template", cascade="all, delete-orphan")


class EquipmentTemplateConsultant(Base):
    __tablename__ = "equipment_template_consultants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_templates.id", ondelete="CASCADE"))
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="CASCADE"))

    template = relationship("EquipmentTemplate", back_populates="approving_consultants")
    consultant_type = relationship("ConsultantType", back_populates="templates")
