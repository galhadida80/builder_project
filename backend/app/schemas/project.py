from __future__ import annotations

from uuid import UUID
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string, validate_code,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_CODE_LENGTH,
    MAX_DESCRIPTION_LENGTH, MAX_ADDRESS_LENGTH,
    CamelCaseModel
)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    code: str = Field(min_length=2, max_length=MAX_CODE_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    address: Optional[str] = Field(default=None, max_length=MAX_ADDRESS_LENGTH)
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None

    @field_validator('name', 'description', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('code', mode='before')
    @classmethod
    def validate_project_code(cls, v: str) -> str:
        return validate_code(v)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    address: Optional[str] = Field(default=None, max_length=MAX_ADDRESS_LENGTH)
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    status: Optional[str] = Field(default=None, max_length=50)

    @field_validator('name', 'description', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: str


class ProjectMemberResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    user: UserResponse
    role: str
    added_at: datetime


class ProjectResponse(CamelCaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    address: Optional[str] = None
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime
    members: list[ProjectMemberResponse] = []
