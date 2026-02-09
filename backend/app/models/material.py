from __future__ import annotations

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Text, DateTime, Date, ForeignKey, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
from app.models.equipment import ApprovalStatus


class Material(Base):
    __tablename__ = "materials"
    __table_args__ = (
        Index("ix_materials_project_id", "project_id"),
        Index("ix_materials_status", "status"),
        Index("ix_materials_created_at", "created_at"),
        Index("ix_materials_project_status", "project_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    material_type: Mapped[Optional[str]] = mapped_column(String(100))
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255))
    model_number: Mapped[Optional[str]] = mapped_column(String(100))
    quantity: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    unit: Mapped[Optional[str]] = mapped_column(String(50))
    specifications: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.DRAFT.value)
    expected_delivery: Mapped[Optional[date]] = mapped_column(Date)
    actual_delivery: Mapped[Optional[date]] = mapped_column(Date)
    storage_location: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="materials")
    created_by = relationship("User", foreign_keys=[created_by_id])
    files = relationship("File", primaryjoin="and_(Material.id==foreign(File.entity_id), File.entity_type=='material')", viewonly=True)
