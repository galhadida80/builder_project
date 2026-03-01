from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class UserRole(str, Enum):
    PROJECT_ADMIN = "project_admin"
    CONTRACTOR = "contractor"
    CONSULTANT = "consultant"
    SUPERVISOR = "supervisor"
    INSPECTOR = "inspector"


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Optional[str]] = mapped_column(Text)
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    estimated_end_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default=ProjectStatus.ACTIVE.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())
    daily_summary_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    notification_digest_interval_hours: Mapped[Optional[int]] = mapped_column(Integer, default=48, server_default="48")
    last_digest_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), index=True, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500))
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    location_lat: Mapped[Optional[float]] = mapped_column(Float)
    location_lng: Mapped[Optional[float]] = mapped_column(Float)
    location_address: Mapped[Optional[str]] = mapped_column(Text)
    budget_visible_to_clients: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    milestone_tracking_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="projects")
    project_roles = relationship("ProjectRole", back_populates="project", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="project", cascade="all, delete-orphan")
    equipment_approval_submissions = relationship("EquipmentApprovalSubmission", back_populates="project", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="project", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="project", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="project", cascade="all, delete-orphan")
    areas = relationship("ConstructionArea", back_populates="project", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="project", cascade="all, delete-orphan")
    rfis = relationship("RFI", back_populates="project", cascade="all, delete-orphan")
    checklist_templates = relationship("ChecklistTemplate", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")
    permission_overrides = relationship("PermissionOverride", back_populates="project_member", cascade="all, delete-orphan")
    resource_permissions = relationship("ResourcePermission", back_populates="project_member", cascade="all, delete-orphan")
