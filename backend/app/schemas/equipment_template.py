from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    CamelCaseModel,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH
)


class EquipmentTemplateBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    specifications: dict | None = None

    @field_validator('name', 'category', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentTemplateCreate(EquipmentTemplateBase):
    pass


class EquipmentTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    specifications: dict | None = None

    @field_validator('name', 'category', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentTemplateResponse(CamelCaseModel):
    id: UUID
    name: str
    category: str | None = None
    description: str | None = None
    specifications: dict | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
