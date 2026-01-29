from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH
)


class InspectionConsultantTypeResponse(BaseModel):
    """Response schema for inspection consultant types with bilingual support."""
    id: UUID
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EquipmentTemplateBase(BaseModel):
    template_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    template_name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    technical_spec_schema: dict | None = None
    required_documents: list[str] = []
    consultant_type_ids: list[UUID] = []

    @field_validator('template_name', 'template_name_he', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentTemplateCreate(EquipmentTemplateBase):
    pass


class EquipmentTemplateUpdate(BaseModel):
    template_name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    template_name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    technical_spec_schema: dict | None = None
    required_documents: list[str] | None = None
    consultant_type_ids: list[UUID] | None = None

    @field_validator('template_name', 'template_name_he', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentTemplateResponse(BaseModel):
    id: UUID
    template_name: str
    template_name_he: str
    description: str | None = None
    technical_spec_schema: dict | None = None
    required_documents: list[str] = []
    consultant_type_ids: list[UUID] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
