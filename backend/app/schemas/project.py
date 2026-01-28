from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string, validate_code,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_CODE_LENGTH,
    MAX_DESCRIPTION_LENGTH, MAX_ADDRESS_LENGTH
)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    code: str = Field(min_length=2, max_length=MAX_CODE_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    address: str | None = Field(default=None, max_length=MAX_ADDRESS_LENGTH)
    start_date: date | None = None
    estimated_end_date: date | None = None

    @field_validator('name', 'description', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('code', mode='before')
    @classmethod
    def validate_project_code(cls, v: str) -> str:
        return validate_code(v)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    address: str | None = Field(default=None, max_length=MAX_ADDRESS_LENGTH)
    start_date: date | None = None
    estimated_end_date: date | None = None
    status: str | None = Field(default=None, max_length=50)

    @field_validator('name', 'description', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: str


class ProjectMemberResponse(BaseModel):
    id: UUID
    user_id: UUID
    user: UserResponse
    role: str
    added_at: datetime

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: str | None = None
    address: str | None = None
    start_date: date | None = None
    estimated_end_date: date | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    members: list[ProjectMemberResponse] = []

    class Config:
        from_attributes = True
