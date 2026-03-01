import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class PermitType(str, Enum):
    BUILDING_PERMIT = "building_permit"  # heiter bniya
    OCCUPANCY_CERTIFICATE = "occupancy_certificate"  # tofes 4
    COMPLETION_CERTIFICATE = "completion_certificate"  # tofes 5
    ENVIRONMENTAL_PERMIT = "environmental_permit"
    FIRE_SAFETY_APPROVAL = "fire_safety_approval"


class PermitStatus(str, Enum):
    NOT_APPLIED = "not_applied"
    APPLIED = "applied"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    CONDITIONAL = "conditional"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Permit(Base):
    __tablename__ = "permits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    permit_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=PermitStatus.NOT_APPLIED.value)
    permit_number: Mapped[str | None] = mapped_column(String(255))
    issuing_authority: Mapped[str | None] = mapped_column(String(255))
    application_date: Mapped[datetime | None] = mapped_column(Date)
    approval_date: Mapped[datetime | None] = mapped_column(Date)
    expiration_date: Mapped[datetime | None] = mapped_column(Date)
    conditions: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="permits")
    created_by = relationship("User", foreign_keys=[created_by_id])
