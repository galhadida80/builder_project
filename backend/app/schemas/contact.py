from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    MAX_PHONE_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
    validate_phone,
)


class ContactBase(BaseModel):
    contact_type: str = Field(min_length=1, max_length=50)
    company_name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    contact_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=MAX_PHONE_LENGTH)
    role_description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    is_primary: bool = False

    @field_validator('contact_type', 'company_name', 'contact_name', 'role_description', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone_format(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone(v)
class ContactCreate(ContactBase):
    user_id: Optional[UUID] = None
class ContactUpdate(BaseModel):
    contact_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    company_name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    contact_name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=MAX_PHONE_LENGTH)
    role_description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    is_primary: Optional[bool] = None
    user_id: Optional[UUID] = None

    @field_validator('contact_type', 'company_name', 'contact_name', 'role_description', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone_format(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone(v)
class LinkedUserResponse(CamelCaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None


class ContactResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    contact_type: str
    company_name: Optional[str] = None
    contact_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role_description: Optional[str] = None
    is_primary: bool = False
    user_id: Optional[UUID] = None
    user: Optional[LinkedUserResponse] = None
    pending_approvals_count: int = 0
    created_at: datetime
