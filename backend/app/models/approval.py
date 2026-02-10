from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    current_status: Mapped[str] = mapped_column(String(50), default="submitted")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    created_by = relationship("User", foreign_keys=[created_by_id])
    steps = relationship("ApprovalStep", back_populates="approval_request", cascade="all, delete-orphan", order_by="ApprovalStep.step_order")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    approval_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("approval_requests.id", ondelete="CASCADE"))
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    approver_role: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    comments: Mapped[Optional[str]] = mapped_column(Text)

    approval_request = relationship("ApprovalRequest", back_populates="steps")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    contact = relationship("Contact", foreign_keys=[contact_id])
