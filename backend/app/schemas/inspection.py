from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


# InspectionConsultantType Schemas
class InspectionConsultantTypeBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=100)

    @field_validator('name', 'name_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionConsultantTypeCreate(InspectionConsultantTypeBase):
    pass


class InspectionConsultantTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=100)

    @field_validator('name', 'name_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionStageResponse(CamelCaseModel):
    id: UUID
    consultant_type_id: UUID
    name: str
    description: str | None = None
    order: int
    required_documentation: dict | None = None
    created_at: datetime


class InspectionConsultantTypeResponse(CamelCaseModel):
    id: UUID
    name: str
    name_he: str
    category: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    stages: list[InspectionStageResponse] = []


# InspectionStage Schemas
class InspectionStageBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order: int = Field(ge=0)
    required_documentation: dict | None = None

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionStageCreate(InspectionStageBase):
    pass


class InspectionStageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order: int | None = Field(default=None, ge=0)
    required_documentation: dict | None = None

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


# Finding Schemas
class FindingBase(BaseModel):
    title: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    severity: Literal["low", "medium", "high", "critical"]
    status: Literal["open", "resolved"] = "open"
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    photos: list | None = None

    @field_validator('title', 'description', 'location', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class FindingCreate(FindingBase):
    pass


class FindingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    severity: Literal["low", "medium", "high", "critical"] | None = None
    status: Literal["open", "resolved"] | None = None
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    photos: list | None = None

    @field_validator('title', 'description', 'location', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class FindingResponse(CamelCaseModel):
    id: UUID
    inspection_id: UUID
    title: str
    description: str | None = None
    severity: str
    status: str
    location: str | None = None
    photos: list | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None


# Inspection Schemas
class InspectionBase(BaseModel):
    consultant_type_id: UUID
    scheduled_date: datetime
    current_stage: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    status: Literal["pending", "in_progress", "completed", "failed"] = "pending"
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('scheduled_date', mode='before')
    @classmethod
    def strip_timezone(cls, v):
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator('current_stage', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionCreate(InspectionBase):
    pass


class InspectionUpdate(BaseModel):
    consultant_type_id: UUID | None = None
    scheduled_date: datetime | None = None
    completed_date: datetime | None = None
    current_stage: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    status: Literal["pending", "in_progress", "completed", "failed"] | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('scheduled_date', 'completed_date', mode='before')
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator('current_stage', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    consultant_type_id: UUID
    scheduled_date: datetime
    completed_date: datetime | None = None
    current_stage: str | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
    consultant_type: InspectionConsultantTypeResponse | None = None
    findings: list[FindingResponse] = []


# Dashboard Summary Schema
class InspectionSummaryResponse(CamelCaseModel):
    total_inspections: int
    pending_count: int
    in_progress_count: int
    completed_count: int
    failed_count: int
    findings_by_severity: dict[str, int]
    overdue_count: int


# Inspection History Timeline Event Schema
class InspectionHistoryEventResponse(CamelCaseModel):
    id: UUID
    inspection_id: UUID
    user_id: Optional[UUID] = None
    user: Optional[UserResponse] = None
    entity_type: str
    entity_id: UUID
    action: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    created_at: datetime
