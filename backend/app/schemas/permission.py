from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

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


class ResourcePermissionSummary(CamelCaseModel):
    """Summary of resource-level permissions for a user"""
    resource_type: str
    resource_id: UUID
    permission: str
    granted: bool


class UserPermissionSummary(CamelCaseModel):
    """Summary of a user's permissions for the permission matrix"""
    user_id: UUID
    user_name: str
    email: str
    role: str | None
    organization_role: str | None
    project_role: str | None
    effective_permissions: list[str]
    resource_permissions: list[ResourcePermissionSummary]


class PermissionMatrixResponse(CamelCaseModel):
    """Permission matrix showing effective permissions for all users in a project"""
    project_id: UUID
    project_name: str
    members: list[UserPermissionSummary]


class BulkPermissionAssignment(BaseModel):
    """Schema for bulk permission assignment to multiple users"""
    user_ids: list[UUID] = Field(..., min_length=1, description="List of user IDs to assign permissions to")
    role_id: UUID | None = Field(None, description="Role ID to assign (organization or project role)")
    permission_overrides: list[PermissionOverrideRequest] | None = Field(
        None,
        description="Optional permission overrides to apply in addition to role"
    )
