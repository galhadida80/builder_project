from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    STATUS_CHANGE = "status_change"
    APPROVAL = "approval"
    REJECTION = "rejection"


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_project_id", "project_id"),
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_entity_type_entity_id", "entity_type", "entity_id"),
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
