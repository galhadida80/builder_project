from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


class ContactBase(BaseModel):
    contact_type: str
    company_name: str | None = None
    contact_name: str
    email: EmailStr | None = None
    phone: str | None = None
    role_description: str | None = None
    is_primary: bool = False


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    contact_type: str | None = None
    company_name: str | None = None
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    role_description: str | None = None
    is_primary: bool | None = None


class ContactResponse(ContactBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
