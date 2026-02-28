import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="CASCADE"), index=True)
    risk_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    defect_count: Mapped[int] = mapped_column(Integer, default=0)
    severity_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    predicted_defect_types: Mapped[list | None] = mapped_column(JSONB, default=list)
    contributing_factors: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    calculation_metadata: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    notes: Mapped[str | None] = mapped_column(Text)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    valid_until: Mapped[datetime | None] = mapped_column(DateTime)
    calculated_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", backref="risk_scores")
    area = relationship("ConstructionArea", foreign_keys=[area_id])
    calculated_by = relationship("User", foreign_keys=[calculated_by_id])
