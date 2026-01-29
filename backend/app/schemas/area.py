from __future__ import annotations

from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string, validate_code,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_CODE_LENGTH, MAX_NOTES_LENGTH
)


class AreaProgressCreate(BaseModel):
    progress_percentage: Decimal = Field(ge=0, le=100)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)
    photos: list[str] | None = Field(default=None, max_length=20)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class AreaProgressResponse(BaseModel):
    id: UUID
    area_id: UUID
    progress_percentage: Decimal
    notes: str | None = None
    photos: list[str] | None = None
    reported_at: datetime
    reported_by: UserResponse | None = None

    class Config:
        from_attributes = True


class AreaBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    area_type: str | None = Field(default=None, max_length=50)
    floor_number: int | None = Field(default=None, ge=-99, le=999)
    area_code: str | None = Field(default=None, max_length=MAX_CODE_LENGTH)
    total_units: int = Field(default=1, ge=1, le=10000)

    @field_validator('name', 'area_type', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('area_code', mode='before')
    @classmethod
    def validate_area_code(cls, v: str | None) -> str | None:
        if v is None or v.strip() == '':
            return None
        return validate_code(v)


class AreaCreate(AreaBase):
    parent_id: UUID | None = None


class AreaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    area_type: str | None = Field(default=None, max_length=50)
    floor_number: int | None = Field(default=None, ge=-99, le=999)
    area_code: str | None = Field(default=None, max_length=MAX_CODE_LENGTH)
    total_units: int | None = Field(default=None, ge=1, le=10000)

    @field_validator('name', 'area_type', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('area_code', mode='before')
    @classmethod
    def validate_area_code(cls, v: str | None) -> str | None:
        if v is None or v.strip() == '':
            return None
        return validate_code(v)


class AreaResponse(BaseModel):
    id: UUID
    project_id: UUID
    parent_id: UUID | None = None
    name: str
    area_type: str | None = None
    floor_number: int | None = None
    area_code: str | None = None
    total_units: int = 1
    current_progress: Decimal = Decimal(0)
    created_at: datetime
    children: list["AreaResponse"] = []
    progress_updates: list[AreaProgressResponse] = []

    class Config:
        from_attributes = True
