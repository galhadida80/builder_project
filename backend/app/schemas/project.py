from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.validators import (
    MAX_ADDRESS_LENGTH,
    MAX_CODE_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
    validate_code,
)
from app.models.project import ProjectStatus
from app.schemas.user import UserResponse


class ProjectCreate(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    code: str = Field(min_length=2, max_length=MAX_CODE_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    address: Optional[str] = Field(default=None, max_length=MAX_ADDRESS_LENGTH)
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    website: Optional[str] = Field(default=None, max_length=500)

    @field_validator('name', 'description', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('code', mode='before')
    @classmethod
    def validate_project_code(cls, v: str) -> str:
        return validate_code(v)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    address: Optional[str] = Field(default=None, max_length=MAX_ADDRESS_LENGTH)
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=50)
    daily_summary_enabled: Optional[bool] = None
    website: Optional[str] = Field(default=None, max_length=500)
    image_url: Optional[str] = Field(default=None, max_length=500)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_address: Optional[str] = Field(default=None, max_length=500)

    @field_validator('status', mode='before')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid = {s.value for s in ProjectStatus}
        if v not in valid:
            raise ValueError(f"Invalid status: {v}. Must be one of: {', '.join(valid)}")
        return v

    @field_validator('name', 'description', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('estimated_end_date', mode='before')
    @classmethod
    def validate_end_date(cls, v, info):
        if v is None:
            return v
        start = info.data.get('start_date')
        if start and v <= start:
            raise ValueError("End date must be after start date")
        return v


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: str


class ProjectMemberResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    user: UserResponse
    role: str
    added_at: datetime


class ProjectResponse(CamelCaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    address: Optional[str] = None
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    status: str
    daily_summary_enabled: bool = True
    created_at: datetime
    updated_at: datetime
    members: list[ProjectMemberResponse] = []
    website: Optional[str] = None
    image_url: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_address: Optional[str] = None
    days_remaining: Optional[int] = None

    @model_validator(mode='after')
    def compute_days_remaining(self):
        if self.estimated_end_date:
            from datetime import date as date_type
            self.days_remaining = (self.estimated_end_date - date_type.today()).days
        return self
