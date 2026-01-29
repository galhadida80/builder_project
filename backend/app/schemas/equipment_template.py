from uuid import UUID
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH, MAX_DESCRIPTION_LENGTH
)


class DocumentDefinition(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    source: Literal["consultant", "project_manager", "contractor"]
    required: bool = True

    @field_validator('name', 'name_he', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SpecificationDefinition(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    field_type: Literal["text", "number", "boolean", "select", "file"]
    options: list[str] | None = None
    unit: str | None = Field(default=None, max_length=50)
    required: bool = True

    @field_validator('name', 'name_he', 'unit', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @model_validator(mode='after')
    def validate_options(self):
        # Options field should only be present when field_type is "select"
        if self.field_type == "select":
            if self.options is None:
                raise ValueError('options field is required when field_type is "select"')
        else:
            if self.options is not None:
                raise ValueError('options field is only valid when field_type is "select"')
        return self


class ChecklistItemDefinition(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    name_he: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    requires_file: bool = False

    @field_validator('name', 'name_he', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)
