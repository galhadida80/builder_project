from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class NotificationCategory(str, Enum):
    APPROVAL = "approval"
    INSPECTION = "inspection"
    UPDATE = "update"
    GENERAL = "general"


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_id", "user_id"),
        Index("ix_notifications_user_unread", "user_id", "is_read"),
        Index("ix_notifications_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(100))
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
