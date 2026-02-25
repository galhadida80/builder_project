from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class BlueprintExtraction(Base):
    __tablename__ = "blueprint_extractions"
    __table_args__ = (
        CheckConstraint(
            "file_id IS NOT NULL OR bim_model_id IS NOT NULL",
            name="ck_blueprint_extraction_source",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    file_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=True)
    bim_model_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bim_models.id", ondelete="CASCADE"), nullable=True)
    extraction_source: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    extracted_data: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    summary: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    tier_used: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="he")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", foreign_keys=[project_id])
    file = relationship("File", foreign_keys=[file_id])
    bim_model = relationship("BimModel", foreign_keys=[bim_model_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    imports = relationship("BlueprintImport", back_populates="extraction", cascade="all, delete-orphan")


class BlueprintImport(Base):
    __tablename__ = "blueprint_imports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    extraction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("blueprint_extractions.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    imported_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imported_entity_ids: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    extraction = relationship("BlueprintExtraction", back_populates="imports")
    project = relationship("Project", foreign_keys=[project_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
