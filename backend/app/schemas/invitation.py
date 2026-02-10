from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.validators import CamelCaseModel


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str = Field(min_length=1, max_length=50)


class InvitationResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    email: str
    role: str
    token: str
    status: str
    invite_url: str
    invited_by_id: UUID
    expires_at: datetime
    created_at: datetime
