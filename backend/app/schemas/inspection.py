from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH
)


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
