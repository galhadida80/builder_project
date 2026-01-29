from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH
)


class EquipmentSubmissionBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    specifications: dict | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'description', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentSubmissionCreate(EquipmentSubmissionBase):
    template_id: UUID


class EquipmentSubmissionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    specifications: dict | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'description', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentSubmissionResponse(BaseModel):
    id: UUID
    project_id: UUID
    template_id: UUID
    name: str
    description: str | None = None
    specifications: dict | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None

    class Config:
        from_attributes = True
