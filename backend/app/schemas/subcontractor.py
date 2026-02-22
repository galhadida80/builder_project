from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


class SubcontractorProfileCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    trade: str = Field(min_length=1, max_length=100)
    license_number: Optional[str] = Field(default=None, max_length=100)
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    insurance_expiry: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    certifications: list[str] = Field(default_factory=list)

    @field_validator('company_name', 'notes', 'address', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class SubcontractorProfileUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=1, max_length=MAX_NAME_LENGTH)
    trade: Optional[str] = Field(default=None, min_length=1, max_length=100)
    license_number: Optional[str] = Field(default=None, max_length=100)
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    insurance_expiry: Optional[datetime] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    certifications: Optional[list[str]] = None


class SubcontractorProfileResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    company_name: str
    trade: str
    license_number: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    is_verified: bool = False
    notes: Optional[str] = None
    certifications: list = []
    user: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime
