from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


class ResourcePermissionCreate(BaseModel):
    """Schema for creating a resource-scoped permission"""
    project_member_id: UUID
    resource_type: str = Field(..., min_length=1, max_length=50)
    resource_id: UUID
    permission: str = Field(..., min_length=1, max_length=50)
    granted: bool


class ResourcePermissionUpdate(BaseModel):
    """Schema for updating a resource-scoped permission"""
    granted: bool


class ResourcePermissionResponse(CamelCaseModel):
    """Schema for resource permission API responses"""
    id: UUID
    project_member_id: UUID
    resource_type: str
    resource_id: UUID
    permission: str
    granted: bool
    granted_by_id: UUID
    created_at: datetime
