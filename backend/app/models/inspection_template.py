from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class InspectionConsultantType(Base):
    """
    Represents a consultant specialization that performs inspections.

    Examples: architect, structural engineer, electrician, plumber, etc.
    Each consultant type has specific inspection stages they are responsible for.

    Supports bilingual content (English/Hebrew) and soft deletion via is_active flag.
    """
    __tablename__ = "inspection_consultant_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inspection_stages = relationship("InspectionStageTemplate", back_populates="consultant_type", cascade="all, delete-orphan")


class InspectionStageTemplate(Base):
    """
    Represents a template for an inspection stage performed by a specific consultant type.

    Each stage is linked to a consultant type (e.g., "Foundation Inspection" for Structural Engineer).
    Stages define the workflow steps within an inspection process.

    Supports bilingual content (English/Hebrew), ordering via sequence_order, and soft deletion.
    """
    __tablename__ = "inspection_stage_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_consultant_types.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sequence_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consultant_type = relationship("InspectionConsultantType", back_populates="inspection_stages")
