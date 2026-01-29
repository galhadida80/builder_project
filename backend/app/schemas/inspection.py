from uuid import UUID
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH
)


class InspectionStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    APPROVED = "approved"


class ConsultantTypeBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    stage_count: int = Field(ge=1, le=7)
    is_active: bool = True

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ConsultantTypeCreate(ConsultantTypeBase):
    pass


class ConsultantTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    stage_count: int | None = Field(default=None, ge=1, le=7)
    is_active: bool | None = None

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ConsultantTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    stage_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InspectionStageTemplateBase(BaseModel):
    consultant_type_id: UUID
    stage_definitions: dict | None = None
    version: int = Field(default=1, ge=1)
    is_active: bool = True


class InspectionStageTemplateCreate(InspectionStageTemplateBase):
    pass


class InspectionStageTemplateUpdate(BaseModel):
    stage_definitions: dict | None = None
    version: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class InspectionStageTemplateResponse(BaseModel):
    id: UUID
    consultant_type_id: UUID
    stage_definitions: dict | None = None
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectInspectionBase(BaseModel):
    consultant_type_id: UUID
    area_id: UUID | None = None
    template_snapshot: dict | None = None
    status: InspectionStatus = InspectionStatus.SCHEDULED
    scheduled_date: date | None = None
    assigned_inspector: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('assigned_inspector', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ProjectInspectionCreate(ProjectInspectionBase):
    pass


class ProjectInspectionUpdate(BaseModel):
    consultant_type_id: UUID | None = None
    area_id: UUID | None = None
    template_snapshot: dict | None = None
    status: InspectionStatus | None = None
    scheduled_date: date | None = None
    assigned_inspector: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('assigned_inspector', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ProjectInspectionResponse(BaseModel):
    id: UUID
    project_id: UUID
    consultant_type_id: UUID
    area_id: UUID | None = None
    template_snapshot: dict | None = None
    status: str
    scheduled_date: date | None = None
    assigned_inspector: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    consultant_type: ConsultantTypeResponse | None = None

    class Config:
        from_attributes = True
