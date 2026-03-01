from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


class CustomRolePermissions(BaseModel):
    """Schema for defining permissions list for a custom role"""
    permissions: list[str] = Field(
        default_factory=list,
        description="List of permission strings (e.g., 'create', 'edit', 'delete', 'approve')"
    )


class RoleBase(BaseModel):
    """Base schema for role fields"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    permissions: list[str] | None = None


class OrganizationRoleCreate(RoleBase):
    """Schema for creating an organization-level custom role"""
    organization_id: UUID


class OrganizationRoleUpdate(BaseModel):
    """Schema for updating an organization-level custom role"""
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    permissions: list[str] | None = None


class OrganizationRoleResponse(CamelCaseModel):
    """Schema for organization role API responses"""
    id: UUID
    organization_id: UUID
    name: str
    description: str | None
    permissions: list[str] | None
    is_system_role: bool
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


class ProjectRoleCreate(RoleBase):
    """Schema for creating a project-level custom role"""
    project_id: UUID
    inherits_from_id: UUID | None = None


class ProjectRoleUpdate(BaseModel):
    """Schema for updating a project-level custom role"""
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    permissions: list[str] | None = None
    inherits_from_id: UUID | None = None


class ProjectRoleResponse(CamelCaseModel):
    """Schema for project role API responses"""
    id: UUID
    project_id: UUID
    name: str
    description: str | None
    permissions: list[str] | None
    inherits_from_id: UUID | None
    is_system_role: bool
    created_by_id: UUID | None
    created_at: datetime
    updated_at: datetime


# Alias for backward compatibility with verification
RoleCreate = OrganizationRoleCreate
RoleResponse = OrganizationRoleResponse
