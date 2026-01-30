from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH,
    CamelCaseModel
)


class ChecklistItem(BaseModel):
    id: str = Field(max_length=100)
    label: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    is_completed: bool = False
    completed_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('label', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
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
    equipment_type: str | None = Field(default=None, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: str | None = Field(default=None, max_length=100)
    serial_number: str | None = Field(default=None, max_length=100)
    specifications: dict | None = None
    installation_date: datetime | None = None
    warranty_expiry: datetime | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'equipment_type', 'manufacturer', 'model_number', 'serial_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    equipment_type: str | None = Field(default=None, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: str | None = Field(default=None, max_length=100)
    serial_number: str | None = Field(default=None, max_length=100)
    specifications: dict | None = None
    installation_date: datetime | None = None
    warranty_expiry: datetime | None = None
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'equipment_type', 'manufacturer', 'model_number', 'serial_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class EquipmentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    equipment_type: str | None = None
    manufacturer: str | None = None
    model_number: str | None = None
    serial_number: str | None = None
    specifications: dict | None = None
    installation_date: datetime | None = None
    warranty_expiry: datetime | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
    checklists: list[ChecklistResponse] = []
