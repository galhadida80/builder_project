from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    MAX_NAME_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    PhoneStr,
    SanitizedStrOptional,
    sanitize_string,
)


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    company: SanitizedStrOptional = Field(default=None, max_length=255)
    language: Literal["en", "he"] | None = None

    @field_validator('full_name', mode='before')
    @classmethod
    def sanitize_name(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class UserCreate(UserBase):
    phone: PhoneStr = Field(default=None, max_length=50)
    firebase_uid: str | None = Field(default=None, max_length=255)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('full_name', mode='before')
    @classmethod
    def sanitize_register_name(cls, v: str) -> str:
        return sanitize_string(v) or ''


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(CamelCaseModel, UserBase):
    id: UUID
    role: Optional[str] = None
    is_active: bool
    is_super_admin: bool = False
    created_at: datetime
    phone: Optional[str] = None
    language: Optional[str] = None
    signature_url: Optional[str] = None


class TokenResponse(CamelCaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    phone: PhoneStr = Field(None, max_length=50)
    company: SanitizedStrOptional = Field(None, max_length=255)
    language: Literal["en", "he"] | None = None

    @field_validator('full_name', mode='before')
    @classmethod
    def sanitize_update_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return sanitize_string(v) or None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(CamelCaseModel):
    message: str
