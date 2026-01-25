from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None
    company: str | None = None


class UserCreate(UserBase):
    firebase_uid: str


class UserResponse(UserBase):
    id: UUID
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
