from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH
)


class InspectionConsultantTypeResponse(BaseModel):
    id: UUID
    name: str
    name_he: str
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionStageTemplateBase(BaseModel):
    consultant_type_id: UUID
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    display_order: int = Field(ge=0)

    @field_validator('name', 'name_he', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionStageTemplateCreate(InspectionStageTemplateBase):
    pass


class InspectionStageTemplateUpdate(BaseModel):
    consultant_type_id: UUID | None = None
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    display_order: int | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class InspectionStageTemplateResponse(BaseModel):
    id: UUID
    consultant_type_id: UUID
    name: str
    name_he: str
    description: str | None = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
