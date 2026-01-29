import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Boolean, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[str] = mapped_column(String, nullable=False, index=True)
    group_name: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sub_sections = relationship("ChecklistSubSection", back_populates="template", cascade="all, delete-orphan")
    instances = relationship("ChecklistInstance", back_populates="template")


class ChecklistSubSection(Base):
    __tablename__ = "checklist_sub_sections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    template = relationship("ChecklistTemplate", back_populates="sub_sections")
    item_templates = relationship("ChecklistItemTemplate", back_populates="sub_section", cascade="all, delete-orphan")


class ChecklistItemTemplate(Base):
    __tablename__ = "checklist_item_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sub_section_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_sub_sections.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    item_type: Mapped[str] = mapped_column(String, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sub_section = relationship("ChecklistSubSection", back_populates="item_templates")
    responses = relationship("ChecklistItemResponse", back_populates="item_template")


class ChecklistInstance(Base):
    __tablename__ = "checklist_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_templates.id", ondelete="RESTRICT"), index=True)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationships
    project = relationship("Project")
    template = relationship("ChecklistTemplate", back_populates="instances")
    area = relationship("ConstructionArea")
    creator = relationship("User", foreign_keys=[created_by])
    responses = relationship("ChecklistItemResponse", back_populates="instance", cascade="all, delete-orphan")


class ChecklistItemResponse(Base):
    __tablename__ = "checklist_item_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_instances.id", ondelete="CASCADE"), index=True)
    item_template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_item_templates.id", ondelete="RESTRICT"), index=True)
    response_value: Mapped[str | None] = mapped_column(Text)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    responded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    instance = relationship("ChecklistInstance", back_populates="responses")
    item_template = relationship("ChecklistItemTemplate", back_populates="responses")
    responder = relationship("User", foreign_keys=[responded_by])

    # Unique constraint: one response per item per instance
    __table_args__ = (
        UniqueConstraint('instance_id', 'item_template_id', name='unique_instance_item'),
    )
