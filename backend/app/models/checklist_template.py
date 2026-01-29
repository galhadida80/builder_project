import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey
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
