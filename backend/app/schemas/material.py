from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH
)


class MaterialBase(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    material_type: str | None = Field(default=None, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: str | None = Field(default=None, max_length=100)
    quantity: Decimal | None = Field(default=None, ge=0, le=999999999)
    unit: str | None = Field(default=None, max_length=50)
    specifications: dict | None = None
    expected_delivery: date | None = None
    actual_delivery: date | None = None
    storage_location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'material_type', 'manufacturer', 'model_number', 'unit', 'storage_location', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    material_type: str | None = Field(default=None, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    model_number: str | None = Field(default=None, max_length=100)
    quantity: Decimal | None = Field(default=None, ge=0, le=999999999)
    unit: str | None = Field(default=None, max_length=50)
    specifications: dict | None = None
    expected_delivery: date | None = None
    actual_delivery: date | None = None
    storage_location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('name', 'material_type', 'manufacturer', 'model_number', 'unit', 'storage_location', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MaterialReceive(BaseModel):
    quantity_received: Decimal = Field(gt=0, le=999999999)
    notes: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MaterialResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    material_type: str | None = None
    manufacturer: str | None = None
    model_number: str | None = None
    quantity: Decimal | None = None
    unit: str | None = None
    specifications: dict | None = None
    expected_delivery: date | None = None
    actual_delivery: date | None = None
    storage_location: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None

    class Config:
        from_attributes = True
