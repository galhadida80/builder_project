from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_CODE_LENGTH,
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
    validate_code,
)
from app.schemas.user import UserResponse


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
    area_level: Optional[str] = Field(default=None, max_length=50)
class AreaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    area_type: Optional[str] = Field(default=None, max_length=50)
    floor_number: Optional[int] = Field(default=None, ge=-99, le=999)
    area_code: Optional[str] = Field(default=None, max_length=MAX_CODE_LENGTH)
    total_units: Optional[int] = Field(default=None, ge=1, le=10000)
    area_level: Optional[str] = Field(default=None, max_length=50)
    status: Optional[Literal["not_started", "in_progress", "awaiting_approval", "completed"]] = None

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
    area_level: Optional[str] = None
    status: str = "not_started"
    order: int = 0
    created_at: datetime
    bim_object_id: Optional[str] = None
    bim_model_id: Optional[UUID] = None
    children: list["AreaResponse"] = []
    progress_updates: list[AreaProgressResponse] = []


class AreaChecklistAssignmentCreate(BaseModel):
    area_type: str = Field(max_length=100)
    template_id: UUID
    auto_create: bool = True

    @field_validator('area_type', mode='before')
    @classmethod
    def sanitize_area_type(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class AreaChecklistAssignmentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    area_type: str
    template_id: UUID
    auto_create: bool
    created_at: datetime
    created_by_id: Optional[UUID] = None


class BulkAreaNode(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    area_type: Optional[str] = None
    area_level: Optional[str] = None
    floor_number: Optional[int] = None
    area_code: Optional[str] = None
    total_units: int = Field(default=1, ge=1, le=10000)
    children: list["BulkAreaNode"] = []

    @field_validator('name', 'area_type', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class BulkAreaCreate(BaseModel):
    areas: list[BulkAreaNode] = Field(max_length=500)
    auto_assign_checklists: bool = True


class BulkAreaCreateResponse(CamelCaseModel):
    created_count: int
    checklist_instances_created: int
    areas: list[AreaResponse]


BulkAreaNode.model_rebuild()
