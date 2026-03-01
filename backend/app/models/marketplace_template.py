import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.utils import utcnow


class TemplateType(str, Enum):
    INSPECTION = "inspection"
    CHECKLIST = "checklist"
    SAFETY_FORM = "safety_form"
    QUALITY_CONTROL = "quality_control"
    ENVIRONMENTAL = "environmental"
    REGULATORY = "regulatory"


class ListingStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class TemplateTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"


class MarketplaceTemplate(Base):
    __tablename__ = "marketplace_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_he: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trade: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    building_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    regulatory_standard: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    template_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    tier: Mapped[str] = mapped_column(String(20), default=TemplateTier.FREE.value)
    price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    is_official: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    created_by = relationship("User", foreign_keys=[created_by_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
    listing = relationship("MarketplaceListing", back_populates="template", uselist=False, cascade="all, delete-orphan")
    installations = relationship("TemplateInstallation", back_populates="template", cascade="all, delete-orphan")
    ratings = relationship("TemplateRating", back_populates="template", cascade="all, delete-orphan")


class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("marketplace_templates.id", ondelete="CASCADE"), unique=True)
    status: Mapped[str] = mapped_column(String(50), default=ListingStatus.DRAFT.value, index=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    install_count: Mapped[int] = mapped_column(Integer, default=0)
    average_rating: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    template = relationship("MarketplaceTemplate", back_populates="listing")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class TemplateInstallation(Base):
    __tablename__ = "template_installations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("marketplace_templates.id", ondelete="CASCADE"))
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"))
    installed_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    installed_version: Mapped[str] = mapped_column(String(20), nullable=False)
    custom_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    installed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())

    template = relationship("MarketplaceTemplate", back_populates="installations")
    organization = relationship("Organization")
    installed_by = relationship("User", foreign_keys=[installed_by_id])


class TemplateRating(Base):
    __tablename__ = "template_ratings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("marketplace_templates.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: utcnow(), onupdate=lambda: utcnow())

    template = relationship("MarketplaceTemplate", back_populates="ratings")
    user = relationship("User", foreign_keys=[user_id])


# Alias for backwards compatibility
TemplateReview = TemplateRating
