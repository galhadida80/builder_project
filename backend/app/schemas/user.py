from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.validators import sanitize_string, MIN_NAME_LENGTH, MAX_NAME_LENGTH, CamelCaseModel


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    company: str | None = None


class UserCreate(UserBase):
    firebase_uid: str | None = None


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)

    @field_validator('full_name', mode='before')
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return sanitize_string(v) or ''


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(CamelCaseModel, UserBase):
    id: UUID
    role: str | None = None
    is_active: bool
    created_at: datetime


class TokenResponse(CamelCaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
