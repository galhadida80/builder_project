from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel

PermissionLiteral = Literal[
    "create", "edit", "delete", "approve",
    "view_all", "manage_members", "manage_settings"
]


class PermissionOverrideRequest(BaseModel):
    permission: PermissionLiteral
    granted: bool


class PermissionOverrideResponse(CamelCaseModel):
    id: UUID
    permission: str
    granted: bool
    granted_by_id: UUID
    created_at: datetime


class EffectivePermissionsResponse(CamelCaseModel):
    role: str
    permissions: list[str]
    overrides: list[PermissionOverrideResponse]
