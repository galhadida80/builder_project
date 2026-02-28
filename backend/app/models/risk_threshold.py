import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class RiskThreshold(Base):
    __tablename__ = "risk_thresholds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True, unique=True)
    low_threshold: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=25.0)
    medium_threshold: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=50.0)
    high_threshold: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=75.0)
    critical_threshold: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=90.0)
    auto_schedule_inspections: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_schedule_threshold: Mapped[str] = mapped_column(String(50), default="high")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", backref="risk_threshold")
    created_by = relationship("User", foreign_keys=[created_by_id])
