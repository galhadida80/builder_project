from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
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

    @field_validator('specifications', mode='before')
    @classmethod
    def sanitize_specs(cls, v: Optional[dict]) -> Optional[dict]:
        return validate_specifications(v)
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

    @field_validator('specifications', mode='before')
    @classmethod
    def sanitize_specs(cls, v: Optional[dict]) -> Optional[dict]:
        return validate_specifications(v)
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


class PaginatedMaterialResponse(BaseModel):
    items: list[MaterialResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
