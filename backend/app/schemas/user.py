from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class UserCreate(UserBase):
    firebase_uid: str


class UserResponse(UserBase):
    id: UUID
    role: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
