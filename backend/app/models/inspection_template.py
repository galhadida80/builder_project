from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    inspection_stages = relationship("InspectionStageTemplate", back_populates="consultant_type", cascade="all, delete-orphan")
    stages = relationship("InspectionStage", back_populates="consultant_type", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="consultant_type")


class InspectionStageTemplate(Base):
    """
    Represents a template for an inspection stage performed by a specific consultant type.

    Each stage is linked to a consultant type (e.g., "Foundation Inspection" for Structural Engineer).
    Stages define the workflow steps within an inspection process.

    Supports bilingual content (English/Hebrew), ordering via stage_order, and soft deletion.

    JSONB Field Schemas:
    --------------------
    trigger_conditions (dict): Conditional logic for when this stage should be triggered
        Example: {
            "construction_stage": "foundation",
            "min_days_elapsed": 7,
            "previous_stage_completed": true
        }

    required_documents (list): List of document requirements for this inspection stage
        Example: [
            {
                "type": "plan",
                "name": "Structural plans",
                "name_he": "תוכניות קונסטרוקציה",
                "mandatory": true
            },
            {
                "type": "report",
                "name": "Soil test report",
                "name_he": "דוח בדיקת קרקע",
                "mandatory": false
            }
        ]
    """
    __tablename__ = "inspection_stage_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_consultant_types.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    trigger_conditions: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    required_documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    consultant_type = relationship("InspectionConsultantType", back_populates="inspection_stages")
