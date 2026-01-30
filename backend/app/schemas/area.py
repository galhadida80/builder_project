from __future__ import annotations

from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string, validate_code,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_CODE_LENGTH, MAX_NOTES_LENGTH,
    CamelCaseModel
)


class AreaProgressCreate(BaseModel):
    progress_percentage: Decimal = Field(ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    photos: Optional[list[str]] = Field(default=None, max_length=20)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class AreaProgressResponse(CamelCaseModel):
    id: UUID
    area_id: UUID
    progress_percentage: Decimal
    notes: Optional[str] = None
    photos: Optional[list[str]] = None
    reported_at: datetime
    reported_by: Optional[UserResponse] = None


class AreaBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    area_type: Optional[str] = Field(default=None, max_length=50)
    floor_number: Optional[int] = Field(default=None, ge=-99, le=999)
    area_code: Optional[str] = Field(default=None, max_length=MAX_CODE_LENGTH)
    total_units: int = Field(default=1, ge=1, le=10000)

    @field_validator('name', 'area_type', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('area_code', mode='before')
    @classmethod
    def validate_area_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == '':
            return None
        return validate_code(v)


class AreaCreate(AreaBase):
    parent_id: Optional[UUID] = None


class AreaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    area_type: Optional[str] = Field(default=None, max_length=50)
    floor_number: Optional[int] = Field(default=None, ge=-99, le=999)
    area_code: Optional[str] = Field(default=None, max_length=MAX_CODE_LENGTH)
    total_units: Optional[int] = Field(default=None, ge=1, le=10000)

    @field_validator('name', 'area_type', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('area_code', mode='before')
    @classmethod
    def validate_area_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == '':
            return None
        return validate_code(v)


class AreaResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    area_type: Optional[str] = None
    floor_number: Optional[int] = None
    area_code: Optional[str] = None
    total_units: int = 1
    current_progress: Decimal = Decimal(0)
    created_at: datetime
    children: list["AreaResponse"] = []
    progress_updates: list[AreaProgressResponse] = []
