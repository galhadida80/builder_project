from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH
)


class ChecklistItemTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int = Field(default=0, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemTemplateCreate(ChecklistItemTemplateBase):
    pass


class ChecklistItemTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemTemplateResponse(BaseModel):
    id: UUID
    subsection_id: UUID
    name: str
    name_he: str
    description: str | None = None
    description_he: str | None = None
    order_position: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ChecklistSubSectionBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int = Field(default=0, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistSubSectionCreate(ChecklistSubSectionBase):
    pass


class ChecklistSubSectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    description_he: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    order_position: int | None = Field(default=None, ge=0)

    @field_validator('name', 'name_he', 'description', 'description_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistSubSectionResponse(BaseModel):
    id: UUID
    template_id: UUID
    name: str
    name_he: str
    description: str | None = None
    description_he: str | None = None
    order_position: int = 0
    created_at: datetime
    items: list[ChecklistItemTemplateResponse] = []

    class Config:
        from_attributes = True
