from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


TRAINING_STATUSES = Literal["valid", "expired", "expiring_soon"]


class ContactBrief(CamelCaseModel):
    id: UUID
    contact_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class SafetyTrainingCreate(BaseModel):
    worker_id: UUID
    training_type: str = Field(min_length=2, max_length=100)
    training_date: datetime
    expiry_date: Optional[datetime] = None
    certificate_number: Optional[str] = Field(default=None, max_length=100)
    instructor: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator("training_date", "expiry_date", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("expiry_date")
    @classmethod
    def validate_expiry_date(cls, v, info):
        if v is not None and "training_date" in info.data:
            training_date = info.data["training_date"]
            if v <= training_date:
                raise ValueError("Expiry date must be after training date")
        return v

    @field_validator("training_type", "certificate_number", "instructor", "notes", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SafetyTrainingUpdate(BaseModel):
    worker_id: Optional[UUID] = None
    training_type: Optional[str] = Field(default=None, max_length=100)
    training_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    status: Optional[TRAINING_STATUSES] = None
    certificate_number: Optional[str] = Field(default=None, max_length=100)
    instructor: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator("training_date", "expiry_date", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("expiry_date")
    @classmethod
    def validate_expiry_date(cls, v, info):
        if v is not None and "training_date" in info.data and info.data["training_date"] is not None:
            training_date = info.data["training_date"]
            if v <= training_date:
                raise ValueError("Expiry date must be after training date")
        return v

    @field_validator("training_type", "certificate_number", "instructor", "notes", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SafetyTrainingResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    worker_id: UUID
    training_type: str
    training_date: datetime
    expiry_date: Optional[datetime] = None
    status: str
    certificate_number: Optional[str] = None
    instructor: Optional[str] = None
    notes: Optional[str] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    worker: Optional[ContactBrief] = None
    created_by: Optional[UserResponse] = None
