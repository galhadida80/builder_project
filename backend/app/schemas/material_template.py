from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_NAME_LENGTH, MIN_NAME_LENGTH, sanitize_string
from app.schemas.equipment_template import (
    ChecklistItemDefinition,
    ConsultantTypeResponse,
    DocumentDefinition,
    SpecificationDefinition,
)


class MaterialTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    is_active: bool = True
    required_documents: list[DocumentDefinition] = Field(default=[], max_length=100)
    required_specifications: list[SpecificationDefinition] = Field(default=[], max_length=100)
    submission_checklist: list[ChecklistItemDefinition] = Field(default=[], max_length=100)

    @field_validator('name', 'name_he', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MaterialTemplateCreate(MaterialTemplateBase):
    pass


class MaterialTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    is_active: bool | None = None
    required_documents: list[DocumentDefinition] | None = Field(default=None, max_length=100)
    required_specifications: list[SpecificationDefinition] | None = Field(default=None, max_length=100)
    submission_checklist: list[ChecklistItemDefinition] | None = Field(default=None, max_length=100)

    @field_validator('name', 'name_he', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MaterialTemplateResponse(BaseModel):
    id: UUID
    name: str
    name_he: str
    category: str
    is_active: bool
    required_documents: list = []
    required_specifications: list = []
    submission_checklist: list = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MaterialTemplateWithConsultantsResponse(MaterialTemplateResponse):
    approving_consultants: list[ConsultantTypeResponse] = []
