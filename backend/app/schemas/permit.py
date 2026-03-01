from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


# Permit Schemas
class PermitBase(BaseModel):
    permit_type: Literal[
        "building_permit",
        "occupancy_certificate",
        "completion_certificate",
        "environmental_permit",
        "fire_safety_approval",
    ]
    status: Literal[
        "not_applied", "applied", "under_review", "approved", "conditional", "rejected", "expired"
    ] = "not_applied"
    permit_number: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    issuing_authority: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    application_date: date | None = None
    approval_date: date | None = None
    expiration_date: date | None = None
    conditions: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('permit_number', 'issuing_authority', 'conditions', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class PermitCreate(PermitBase):
    pass


class PermitUpdate(BaseModel):
    permit_type: Literal[
        "building_permit",
        "occupancy_certificate",
        "completion_certificate",
        "environmental_permit",
        "fire_safety_approval",
    ] | None = None
    status: Literal[
        "not_applied", "applied", "under_review", "approved", "conditional", "rejected", "expired"
    ] | None = None
    permit_number: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    issuing_authority: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    application_date: date | None = None
    approval_date: date | None = None
    expiration_date: date | None = None
    conditions: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('permit_number', 'issuing_authority', 'conditions', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class PermitStatusUpdate(BaseModel):
    status: Literal[
        "not_applied", "applied", "under_review", "approved", "conditional", "rejected", "expired"
    ]


class PermitResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    permit_type: str
    status: str
    permit_number: str | None = None
    issuing_authority: str | None = None
    application_date: date | None = None
    approval_date: date | None = None
    expiration_date: date | None = None
    conditions: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None


class PermitSummaryResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    permit_type: str
    status: str
    permit_number: str | None = None
    expiration_date: date | None = None
    created_at: datetime


class PermitComplianceReportResponse(CamelCaseModel):
    total_permits: int
    not_applied_count: int
    applied_count: int
    under_review_count: int
    approved_count: int
    conditional_count: int
    rejected_count: int
    expired_count: int
    expiring_soon_count: int
    permits_by_type: dict[str, int]
