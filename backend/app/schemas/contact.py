from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.validators import (
    sanitize_string, validate_phone,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_PHONE_LENGTH, MAX_DESCRIPTION_LENGTH
)


class ContactBase(BaseModel):
    contact_type: str = Field(min_length=1, max_length=50)
    company_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    contact_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=MAX_PHONE_LENGTH)
    role_description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    is_primary: bool = False

    @field_validator('contact_type', 'company_name', 'contact_name', 'role_description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone_format(cls, v: str | None) -> str | None:
        return validate_phone(v)


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    contact_type: str | None = Field(default=None, min_length=1, max_length=50)
    company_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    contact_name: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=MAX_PHONE_LENGTH)
    role_description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    is_primary: bool | None = None

    @field_validator('contact_type', 'company_name', 'contact_name', 'role_description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone_format(cls, v: str | None) -> str | None:
        return validate_phone(v)


class ContactResponse(BaseModel):
    id: UUID
    project_id: UUID
    contact_type: str
    company_name: str | None = None
    contact_name: str
    email: str | None = None
    phone: str | None = None
    role_description: str | None = None
    is_primary: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
