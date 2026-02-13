from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.core.validators import CamelCaseModel

RoleLiteral = Literal[
    "project_admin", "supervisor", "consultant", "contractor", "inspector"
]


class InvitationCreate(BaseModel):
    email: EmailStr
    role: RoleLiteral


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
