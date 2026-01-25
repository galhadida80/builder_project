import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Text, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
from app.models.equipment import ApprovalStatus


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    material_code: Mapped[str | None] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(100))
    supplier: Mapped[str | None] = mapped_column(String(255))
    unit: Mapped[str | None] = mapped_column(String(50))
    quantity_ordered: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    quantity_received: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    status: Mapped[str] = mapped_column(String(50), default=ApprovalStatus.DRAFT.value)
    delivery_date: Mapped[date | None] = mapped_column(Date)
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    project = relationship("Project", back_populates="materials")
    created_by = relationship("User", foreign_keys=[created_by_id])
    files = relationship("File", primaryjoin="and_(Material.id==foreign(File.entity_id), File.entity_type=='material')", viewonly=True)
