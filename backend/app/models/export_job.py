from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    ZIP = "zip"


class ExportType(str, Enum):
    PROJECT = "project"
    ORGANIZATION = "organization"


class ExportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    export_format: Mapped[str] = mapped_column(String(20), nullable=False)
    export_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=ExportStatus.PENDING, nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(500))
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    requested_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    project = relationship("Project", foreign_keys=[project_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
    requested_by = relationship("User", foreign_keys=[requested_by_id])
