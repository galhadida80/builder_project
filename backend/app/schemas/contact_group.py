from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MIN_NAME_LENGTH, CamelCaseModel
from app.schemas.contact import ContactResponse


class ContactGroupCreate(BaseModel):
    name: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    contact_ids: list[UUID] = Field(default_factory=list)


class ContactGroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    contact_ids: Optional[list[UUID]] = None


class ContactGroupListResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: Optional[str] = None
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class ContactGroupResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: Optional[str] = None
    contacts: list[ContactResponse] = []
    created_at: datetime
    updated_at: datetime


class AddMembersRequest(BaseModel):
    contact_ids: list[UUID]
