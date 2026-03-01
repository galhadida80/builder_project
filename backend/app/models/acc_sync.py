from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.rfi import RFI
    from app.models.user import User


class AccProjectLink(Base):
    __tablename__ = "acc_project_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), unique=True
    )
    acc_project_id: Mapped[str] = mapped_column(String(255), nullable=False)
    acc_hub_id: Mapped[str] = mapped_column(String(255), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow()
    )

    project: Mapped["Project"] = relationship("Project")


class RfiSyncLog(Base):
    __tablename__ = "rfi_sync_logs"
    __table_args__ = (Index("ix_rfi_sync_logs_rfi_id", "rfi_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rfi_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rfis.id", ondelete="CASCADE")
    )
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    rfi: Mapped["RFI"] = relationship("RFI")


class AccUserMapping(Base):
    __tablename__ = "acc_user_mappings"
    __table_args__ = (Index("ix_acc_user_mappings_project_id", "project_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE")
    )
    acc_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    builderops_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    project: Mapped["Project"] = relationship("Project")
    user: Mapped["User"] = relationship("User")
