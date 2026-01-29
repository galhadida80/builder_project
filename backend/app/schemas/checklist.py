from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH
)


class ChecklistTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    level: str = Field(max_length=50)
    group: str = Field(max_length=100)
    category: str | None = Field(default=None, max_length=100)
    metadata: dict | None = None

    @field_validator('name', 'level', 'group', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistTemplateCreate(ChecklistTemplateBase):
    pass


class ChecklistTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    level: str | None = Field(default=None, max_length=50)
    group: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, max_length=100)
    metadata: dict | None = None

    @field_validator('name', 'level', 'group', 'category', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistTemplateResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    level: str
    group: str
    category: str | None = None
    metadata: dict | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
    subsections: list = []

    class Config:
        from_attributes = True


class ChecklistSubSectionBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    order: int = Field(ge=0)
    metadata: dict | None = None

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistSubSectionCreate(ChecklistSubSectionBase):
    pass


class ChecklistSubSectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    order: int | None = Field(default=None, ge=0)
    metadata: dict | None = None

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistSubSectionResponse(BaseModel):
    id: UUID
    template_id: UUID
    name: str
    order: int
    metadata: dict | None = None
    created_at: datetime
    updated_at: datetime
    items: list = []

    class Config:
        from_attributes = True


class ChecklistItemTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    must_image: bool = False
    must_note: bool = False
    must_signature: bool = False
    metadata: dict | None = None

    @field_validator('name', 'category', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemTemplateCreate(ChecklistItemTemplateBase):
    pass


class ChecklistItemTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    must_image: bool | None = None
    must_note: bool | None = None
    must_signature: bool | None = None
    metadata: dict | None = None

    @field_validator('name', 'category', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChecklistItemTemplateResponse(BaseModel):
    id: UUID
    subsection_id: UUID
    name: str
    category: str | None = None
    description: str | None = None
    must_image: bool
    must_note: bool
    must_signature: bool
    metadata: dict | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
