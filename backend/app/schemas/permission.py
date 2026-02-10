from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel


class PermissionOverrideRequest(BaseModel):
    permission: str
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
