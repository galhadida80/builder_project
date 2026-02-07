from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    validate_specifications,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH,
    CamelCaseModel
)


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

    @field_validator('name', 'equipment_type', 'manufacturer', 'model_number', 'serial_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('specifications', mode='before')
    @classmethod
    def sanitize_specs(cls, v: Optional[dict]) -> Optional[dict]:
        return validate_specifications(v)


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

    @field_validator('name', 'equipment_type', 'manufacturer', 'model_number', 'serial_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('specifications', mode='before')
    @classmethod
    def sanitize_specs(cls, v: Optional[dict]) -> Optional[dict]:
        return validate_specifications(v)


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
