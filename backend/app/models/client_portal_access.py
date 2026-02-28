from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class ClientPortalAccess(Base):
    __tablename__ = "client_portal_access"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    can_view_budget: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    can_view_documents: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    can_submit_feedback: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    access_token: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    user = relationship("User")
    project = relationship("Project")
