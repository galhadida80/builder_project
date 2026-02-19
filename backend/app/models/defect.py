import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    defect_number: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    defect_type: Mapped[str] = mapped_column(String(100), default="non_conformance")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("construction_areas.id", ondelete="SET NULL"), index=True)
    status: Mapped[str] = mapped_column(String(50), default="open", index=True)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    is_repeated: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    assigned_contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    followup_contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    checklist_instance_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("checklist_instances.id", ondelete="SET NULL"))
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", backref="defects")
    area = relationship("ConstructionArea", foreign_keys=[area_id])
    reporter = relationship("Contact", foreign_keys=[reporter_id])
    assigned_contact = relationship("Contact", foreign_keys=[assigned_contact_id])
    followup_contact = relationship("Contact", foreign_keys=[followup_contact_id])
    checklist_instance = relationship("ChecklistInstance", foreign_keys=[checklist_instance_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    assignees = relationship("DefectAssignee", back_populates="defect", cascade="all, delete-orphan")


class DefectAssignee(Base):
    __tablename__ = "defect_assignees"
    __table_args__ = (
        UniqueConstraint("defect_id", "contact_id", name="uq_defect_contact"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    defect_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("defects.id", ondelete="CASCADE"), index=True)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), index=True)

    defect = relationship("Defect", back_populates="assignees")
    contact = relationship("Contact", foreign_keys=[contact_id])
