from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
    validate_specifications,
)
from app.schemas.user import UserResponse


class ChecklistItem(BaseModel):
    id: str = Field(max_length=100)
    label: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('label', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ChecklistCreate(BaseModel):
    checklist_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    items: list[ChecklistItem] = Field(max_length=100)

    @field_validator('checklist_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize_string(v) or ''


class ChecklistResponse(CamelCaseModel):
    id: UUID
    equipment_id: UUID
    checklist_name: str
    items: list
    created_at: datetime


class EquipmentBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    equipment_type: Optional[str] = Field(default=None, max_length=100)
    manufacturer: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: Optional[str] = Field(default=None, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    specifications: Optional[dict] = None
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    is_closed: Optional[bool] = False
    approval_due_date: Optional[date] = None
    distribution_emails: Optional[list[str]] = None
    approver_contact_ids: Optional[list[str]] = None
    contractor_signature_url: Optional[str] = Field(default=None, max_length=500)
    supervisor_signature_url: Optional[str] = Field(default=None, max_length=500)
    reminder_interval_hours: Optional[int] = Field(default=48, ge=24, le=720)

    @field_validator('name', 'equipment_type', 'manufacturer', 'model_number', 'serial_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('specifications', mode='before')
    @classmethod
    def sanitize_specs(cls, v: Optional[dict]) -> Optional[dict]:
        return validate_specifications(v)

    @field_validator('approval_due_date', mode='before')
    @classmethod
    def validate_approval_date(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        from datetime import timedelta
        today = date.today()
        min_date = today + timedelta(days=2)
        max_date = today + timedelta(days=365)
        if v < min_date:
            raise ValueError("Approval date must be at least 2 days from today")
        if v > max_date:
            raise ValueError("Approval date must be within 1 year")
        return v


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    equipment_type: Optional[str] = Field(default=None, max_length=100)
    manufacturer: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: Optional[str] = Field(default=None, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    specifications: Optional[dict] = None
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    is_closed: Optional[bool] = None
    approval_due_date: Optional[date] = None
    distribution_emails: Optional[list[str]] = None
    approver_contact_ids: Optional[list[str]] = None
    contractor_signature_url: Optional[str] = Field(default=None, max_length=500)
    supervisor_signature_url: Optional[str] = Field(default=None, max_length=500)
    reminder_interval_hours: Optional[int] = Field(default=None, ge=24, le=720)

    @field_validator('name', 'equipment_type', 'manufacturer', 'model_number', 'serial_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('specifications', mode='before')
    @classmethod
    def sanitize_specs(cls, v: Optional[dict]) -> Optional[dict]:
        return validate_specifications(v)

    @field_validator('approval_due_date', mode='before')
    @classmethod
    def validate_approval_date(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        from datetime import timedelta
        today = date.today()
        min_date = today + timedelta(days=2)
        max_date = today + timedelta(days=365)
        if v < min_date:
            raise ValueError("Approval date must be at least 2 days from today")
        if v > max_date:
            raise ValueError("Approval date must be within 1 year")
        return v


class EquipmentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    equipment_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    specifications: Optional[dict] = None
    installation_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UserResponse] = None
    checklists: list[ChecklistResponse] = []
    is_closed: bool = False
    approval_due_date: Optional[date] = None
    distribution_emails: Optional[list] = None
    approver_contact_ids: Optional[list] = None
    contractor_signature_url: Optional[str] = None
    supervisor_signature_url: Optional[str] = None
    reminder_interval_hours: int = 48
    last_reminder_sent_at: Optional[datetime] = None
    bim_object_id: Optional[str] = None
    bim_model_id: Optional[UUID] = None


class PaginatedEquipmentResponse(BaseModel):
    items: list[EquipmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
