from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    company: str | None = None


class UserCreate(UserBase):
    firebase_uid: str


class UserResponse(UserBase):
    id: UUID
    role: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
