from __future__ import annotations

from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH,
    CamelCaseModel
)


class MaterialBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    material_type: Optional[str] = Field(default=None, max_length=100)
    manufacturer: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: Optional[str] = Field(default=None, max_length=100)
    quantity: Optional[Decimal] = Field(default=None, ge=0, le=999999999)
    unit: Optional[str] = Field(default=None, max_length=50)
    specifications: Optional[dict] = None
    expected_delivery: Optional[date] = None
    actual_delivery: Optional[date] = None
    storage_location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'material_type', 'manufacturer', 'model_number', 'unit', 'storage_location', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    material_type: Optional[str] = Field(default=None, max_length=100)
    manufacturer: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: Optional[str] = Field(default=None, max_length=100)
    quantity: Optional[Decimal] = Field(default=None, ge=0, le=999999999)
    unit: Optional[str] = Field(default=None, max_length=50)
    specifications: Optional[dict] = None
    expected_delivery: Optional[date] = None
    actual_delivery: Optional[date] = None
    storage_location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'material_type', 'manufacturer', 'model_number', 'unit', 'storage_location', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class MaterialReceive(BaseModel):
    quantity_received: Decimal = Field(gt=0, le=999999999)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class MaterialResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    material_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    specifications: Optional[dict] = None
    expected_delivery: Optional[date] = None
    actual_delivery: Optional[date] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
