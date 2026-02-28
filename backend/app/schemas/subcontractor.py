from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


class SubcontractorInviteRequest(BaseModel):
    email: EmailStr
    trade: str = Field(min_length=1, max_length=100)
    company_name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    message: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('company_name', 'message', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class SubcontractorInviteResponse(CamelCaseModel):
    id: UUID
    email: str
    trade: str
    company_name: str
    token: str
    invite_url: str
    expires_at: datetime


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
    certifications: list[str] = []
    user: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime


class TaskStats(CamelCaseModel):
    total: int = 0
    in_progress: int = 0
    completed: int = 0
    overdue: int = 0


class RFIStats(CamelCaseModel):
    total: int = 0
    open: int = 0
    waiting_response: int = 0
    answered: int = 0


class ApprovalStats(CamelCaseModel):
    total: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0


class SubcontractorDashboardResponse(CamelCaseModel):
    task_stats: TaskStats
    rfi_stats: RFIStats
    approval_stats: ApprovalStats
    upcoming_deadlines: int = 0
