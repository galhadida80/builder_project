from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH
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
