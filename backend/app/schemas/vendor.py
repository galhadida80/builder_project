from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
    validate_phone,
)


class VendorPerformanceBase(BaseModel):
    delivery_score: Optional[float] = Field(default=None, ge=0, le=5)
    quality_score: Optional[float] = Field(default=None, ge=0, le=5)
    price_score: Optional[float] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class VendorPerformanceCreate(VendorPerformanceBase):
    project_id: UUID


class VendorPerformanceUpdate(BaseModel):
    delivery_score: Optional[float] = Field(default=None, ge=0, le=5)
    quality_score: Optional[float] = Field(default=None, ge=0, le=5)
    price_score: Optional[float] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class VendorPerformanceResponse(CamelCaseModel):
    id: UUID
    vendor_id: UUID
    project_id: UUID
    delivery_score: Optional[float] = None
    quality_score: Optional[float] = None
    price_score: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class VendorBase(BaseModel):
    company_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    trade: str = Field(min_length=1, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=500)
    license_number: Optional[str] = Field(default=None, max_length=100)
    insurance_expiry: Optional[datetime] = None
    is_verified: bool = False
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    certifications: list[str] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('company_name', 'trade', 'address', 'license_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('contact_phone', mode='before')
    @classmethod
    def validate_phone_format(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone(v)

    @field_validator('certifications', mode='before')
    @classmethod
    def validate_certifications(cls, v: Optional[list]) -> list[str]:
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError('Certifications must be a list')
        if len(v) > 50:
            raise ValueError('Cannot have more than 50 certifications')
        sanitized = []
        for cert in v:
            if not isinstance(cert, str):
                raise ValueError('Certification items must be strings')
            clean_cert = sanitize_string(cert)
            if clean_cert and len(clean_cert) <= 255:
                sanitized.append(clean_cert)
        return sanitized


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    trade: Optional[str] = Field(default=None, min_length=1, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = Field(default=None, max_length=500)
    license_number: Optional[str] = Field(default=None, max_length=100)
    insurance_expiry: Optional[datetime] = None
    is_verified: Optional[bool] = None
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    certifications: Optional[list[str]] = None
    notes: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)

    @field_validator('company_name', 'trade', 'address', 'license_number', 'notes', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('contact_phone', mode='before')
    @classmethod
    def validate_phone_format(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone(v)

    @field_validator('certifications', mode='before')
    @classmethod
    def validate_certifications(cls, v: Optional[list]) -> Optional[list[str]]:
        if v is None:
            return None
        if not isinstance(v, list):
            raise ValueError('Certifications must be a list')
        if len(v) > 50:
            raise ValueError('Cannot have more than 50 certifications')
        sanitized = []
        for cert in v:
            if not isinstance(cert, str):
                raise ValueError('Certification items must be strings')
            clean_cert = sanitize_string(cert)
            if clean_cert and len(clean_cert) <= 255:
                sanitized.append(clean_cert)
        return sanitized


class VendorResponse(CamelCaseModel):
    id: UUID
    company_name: str
    trade: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    license_number: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    is_verified: bool = False
    rating: Optional[float] = None
    certifications: list[str] = []
    notes: Optional[str] = None
    performances: list[VendorPerformanceResponse] = []
    created_at: datetime
    updated_at: datetime


class BulkImportResponse(CamelCaseModel):
    imported_count: int = 0
    skipped_count: int = 0
    errors: list[str] = []
