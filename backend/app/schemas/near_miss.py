from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


NEAR_MISS_SEVERITIES = Literal["low", "medium", "high"]
NEAR_MISS_STATUSES = Literal["open", "in_progress", "resolved", "closed"]


class ContactBrief(CamelCaseModel):
    id: UUID
    contact_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class AreaBrief(CamelCaseModel):
    id: UUID
    name: str
    area_code: Optional[str] = None
    floor_number: Optional[int] = None


class NearMissCreate(BaseModel):
    title: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: str = Field(min_length=2, max_length=MAX_DESCRIPTION_LENGTH)
    severity: NEAR_MISS_SEVERITIES
    potential_consequence: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    occurred_at: datetime
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    area_id: Optional[UUID] = None
    photos: list = Field(default_factory=list)
    is_anonymous: bool = False
    reported_by_id: Optional[UUID] = None
    preventive_actions: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator("occurred_at", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("title", "description", "location", "potential_consequence", "preventive_actions", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class NearMissUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    severity: Optional[NEAR_MISS_SEVERITIES] = None
    status: Optional[NEAR_MISS_STATUSES] = None
    potential_consequence: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    occurred_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    area_id: Optional[UUID] = None
    photos: Optional[list] = None
    reported_by_id: Optional[UUID] = None
    preventive_actions: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator("occurred_at", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("title", "description", "location", "potential_consequence", "preventive_actions", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class NearMissResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    near_miss_number: int
    title: str
    description: str
    severity: str
    potential_consequence: Optional[str] = None
    occurred_at: datetime
    location: Optional[str] = None
    area_id: Optional[UUID] = None
    photos: Optional[list] = None
    is_anonymous: bool
    reported_by_id: Optional[UUID] = None
    preventive_actions: Optional[str] = None
    status: str
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    area: Optional[AreaBrief] = None
    reported_by: Optional[ContactBrief] = None
    created_by: Optional[UserResponse] = None
