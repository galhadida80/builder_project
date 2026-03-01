from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MIN_NAME_LENGTH,
    sanitize_string,
)
from app.schemas.user import UserResponse


class MarketplaceTemplateBase(BaseModel):
    template_type: Literal["inspection", "checklist", "safety_form", "quality_control", "environmental", "regulatory"]
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    category: str = Field(min_length=MIN_NAME_LENGTH, max_length=100)
    trade: str | None = Field(default=None, max_length=100)
    building_type: str | None = Field(default=None, max_length=100)
    regulatory_standard: str | None = Field(default=None, max_length=100)
    tags: list[str] = Field(default=[])
    template_data: dict
    version: str = Field(default="1.0.0", max_length=20)
    tier: Literal["free", "premium"] = Field(default="free")
    price: float | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', 'category', 'trade', 'building_type', 'regulatory_standard', 'version', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('tags', mode='before')
    @classmethod
    def sanitize_tags(cls, v: list[str] | None) -> list[str]:
        if v is None:
            return []
        return [sanitize_string(tag) or '' for tag in v]


class MarketplaceTemplateCreate(MarketplaceTemplateBase):
    pass


class MarketplaceTemplateUpdate(BaseModel):
    template_type: Literal["inspection", "checklist", "safety_form", "quality_control", "environmental", "regulatory"] | None = None
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    category: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=100)
    trade: str | None = Field(default=None, max_length=100)
    building_type: str | None = Field(default=None, max_length=100)
    regulatory_standard: str | None = Field(default=None, max_length=100)
    tags: list[str] | None = None
    template_data: dict | None = None
    version: str | None = Field(default=None, max_length=20)
    tier: Literal["free", "premium"] | None = None
    price: float | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', 'category', 'trade', 'building_type', 'regulatory_standard', 'version', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('tags', mode='before')
    @classmethod
    def sanitize_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        return [sanitize_string(tag) or '' for tag in v]


class MarketplaceTemplateResponse(BaseModel):
    id: UUID
    template_type: str
    name: str
    name_he: str
    description: str | None = None
    description_he: str | None = None
    category: str
    trade: str | None = None
    building_type: str | None = None
    regulatory_standard: str | None = None
    tags: list = Field(default=[])
    template_data: dict
    version: str
    tier: str
    price: float | None = None
    is_official: bool
    created_by_id: UUID | None = None
    organization_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarketplaceListingBase(BaseModel):
    status: Literal["draft", "pending_review", "approved", "rejected", "archived"] = Field(default="draft")
    featured: bool = Field(default=False)

    @field_validator('status', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MarketplaceListingCreate(MarketplaceListingBase):
    template_id: UUID


class MarketplaceListingUpdate(BaseModel):
    status: Literal["draft", "pending_review", "approved", "rejected", "archived"] | None = None
    featured: bool | None = None
    rejection_reason: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('status', 'rejection_reason', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MarketplaceListingResponse(BaseModel):
    id: UUID
    template_id: UUID
    status: str
    published_at: datetime | None = None
    featured: bool
    install_count: int
    average_rating: float | None = None
    review_count: int
    rejection_reason: str | None = None
    reviewed_by_id: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateInstallationCreate(BaseModel):
    template_id: UUID
    organization_id: UUID
    custom_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)

    @field_validator('custom_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class TemplateInstallationResponse(BaseModel):
    id: UUID
    template_id: UUID
    organization_id: UUID
    installed_by_id: UUID
    installed_version: str
    custom_name: str | None = None
    is_active: bool
    installed_at: datetime

    class Config:
        from_attributes = True


class TemplateRatingBase(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('comment', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class TemplateRatingCreate(TemplateRatingBase):
    template_id: UUID


class TemplateRatingUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('comment', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class TemplateRatingResponse(BaseModel):
    id: UUID
    template_id: UUID
    user_id: UUID
    rating: int
    comment: str | None = None
    created_at: datetime
    updated_at: datetime
    user: UserResponse | None = None

    class Config:
        from_attributes = True


class MarketplaceTemplateWithListingResponse(MarketplaceTemplateResponse):
    listing: MarketplaceListingResponse | None = None


class MarketplaceTemplateDetailResponse(MarketplaceTemplateWithListingResponse):
    created_by: UserResponse | None = None
    ratings: list[TemplateRatingResponse] = []
