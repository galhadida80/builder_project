import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class BudgetLineItem(Base):
    __tablename__ = "budget_line_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    budgeted_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", backref="budget_items")
    created_by = relationship("User", foreign_keys=[created_by_id])
    cost_entries = relationship("CostEntry", back_populates="budget_item", cascade="all, delete-orphan")


class CostEntry(Base):
    __tablename__ = "cost_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("budget_line_items.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    budget_item = relationship("BudgetLineItem", back_populates="cost_entries")
    project = relationship("Project")
    created_by = relationship("User", foreign_keys=[created_by_id])


class ChangeOrder(Base):
    __tablename__ = "change_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    change_order_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    budget_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("budget_line_items.id", ondelete="SET NULL"), nullable=True)
    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    requested_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    approved_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    project = relationship("Project", backref="change_orders")
    budget_item = relationship("BudgetLineItem", foreign_keys=[budget_item_id])
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
