from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    CamelCaseModel,
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH
)


# InspectionConsultantType Schemas
class InspectionConsultantTypeBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionConsultantTypeCreate(InspectionConsultantTypeBase):
    pass


class InspectionConsultantTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionStageResponse(BaseModel):
    id: UUID
    consultant_type_id: UUID
    name: str
    description: str | None = None
    order: int
    required_documentation: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionConsultantTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    stages: list[InspectionStageResponse] = []

    class Config:
        from_attributes = True


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
    severity: str = Field(min_length=1, max_length=50)
    status: str = Field(default="open", min_length=1, max_length=50)
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
    severity: str | None = Field(default=None, min_length=1, max_length=50)
    status: str | None = Field(default=None, min_length=1, max_length=50)
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    photos: list | None = None

    @field_validator('title', 'description', 'location', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class FindingResponse(BaseModel):
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

    class Config:
        from_attributes = True


# Inspection Schemas
class InspectionBase(BaseModel):
    consultant_type_id: UUID
    scheduled_date: datetime
    current_stage: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    status: str = Field(default="pending", min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

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
    status: str | None = Field(default=None, min_length=1, max_length=50)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('current_stage', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionResponse(BaseModel):
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

    class Config:
        from_attributes = True


# Dashboard Summary Schema
class InspectionSummaryResponse(BaseModel):
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
