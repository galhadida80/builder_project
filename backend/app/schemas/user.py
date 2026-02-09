from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.validators import sanitize_string, MIN_NAME_LENGTH, MAX_NAME_LENGTH, CamelCaseModel

MAX_EMAIL_LENGTH = 254
MAX_PASSWORD_LENGTH = 128
MAX_PHONE_LENGTH = 30
MAX_COMPANY_LENGTH = 255
MAX_LANGUAGE_LENGTH = 10


class UserBase(BaseModel):
    email: EmailStr = Field(max_length=MAX_EMAIL_LENGTH)
    full_name: Optional[str] = Field(None, max_length=MAX_NAME_LENGTH)
    phone: Optional[str] = Field(None, max_length=MAX_PHONE_LENGTH)
    company: Optional[str] = Field(None, max_length=MAX_COMPANY_LENGTH)
    language: Optional[str] = Field(None, max_length=MAX_LANGUAGE_LENGTH)

    @field_validator('full_name', 'company', mode='before')
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_string(v) or None


class UserCreate(UserBase):
    firebase_uid: str | None = Field(None, max_length=128)


class UserRegister(BaseModel):
    email: EmailStr = Field(max_length=MAX_EMAIL_LENGTH)
    password: str = Field(min_length=8, max_length=MAX_PASSWORD_LENGTH)
    full_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('full_name', mode='before')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return sanitize_string(v) or ''


class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=MAX_EMAIL_LENGTH)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


class UserResponse(CamelCaseModel, UserBase):
    id: UUID
    role: Optional[str] = None
    is_active: bool
    created_at: datetime


class TokenResponse(CamelCaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
