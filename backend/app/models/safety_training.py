import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class TrainingStatus(str, Enum):
    VALID = "valid"
    EXPIRED = "expired"
    EXPIRING_SOON = "expiring_soon"


class SafetyTraining(Base):
    __tablename__ = "safety_trainings"
    __table_args__ = (
        UniqueConstraint("project_id", "worker_id", "training_type", "training_date", name="uq_project_worker_training"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), index=True)
    training_type: Mapped[str] = mapped_column(String(100), nullable=False)
    training_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(50), default=TrainingStatus.VALID.value, index=True)
    certificate_number: Mapped[str | None] = mapped_column(String(100))
    instructor: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", backref="safety_trainings")
    worker = relationship("Contact", foreign_keys=[worker_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
