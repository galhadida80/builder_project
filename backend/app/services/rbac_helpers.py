from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permission_audit import PermissionAction, PermissionAudit
from app.models.resource_permission import ResourcePermission
from app.models.role import OrganizationRole, ProjectRole


async def get_effective_permissions(
    role: ProjectRole | OrganizationRole,
) -> list[str]:
    """
    Calculate effective permissions for a role, including inherited permissions.

    For OrganizationRole: returns role's own permissions
    For ProjectRole: merges inherited permissions from org role with project-specific permissions
    """
    permissions = list(role.permissions or [])

    if isinstance(role, ProjectRole) and role.inherits_from:
        parent_permissions = role.inherits_from.permissions or []
        permissions.extend(parent_permissions)

    seen = set()
    unique_permissions = []
    for perm in permissions:
        if perm not in seen:
            seen.add(perm)
            unique_permissions.append(perm)

    return unique_permissions


async def check_resource_permission(
    db: AsyncSession,
    project_member_id: UUID,
    resource_type: str,
    resource_id: UUID,
    permission: str,
) -> bool:
    """
    Check if a project member has a specific permission on a specific resource.

    Returns True if the permission is granted, False otherwise.
    Resource permissions can be explicitly granted or denied via the granted field.
    """
    query = (
        select(ResourcePermission)
        .where(ResourcePermission.project_member_id == project_member_id)
        .where(ResourcePermission.resource_type == resource_type)
        .where(ResourcePermission.resource_id == resource_id)
        .where(ResourcePermission.permission == permission)
    )
    result = await db.execute(query)
    resource_permission = result.scalar_one_or_none()

    if not resource_permission:
        return False

    return resource_permission.granted


async def create_permission_audit(
    db: AsyncSession,
    action: PermissionAction,
    user_id: UUID,
    entity_type: str,
    entity_id: UUID,
    organization_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
) -> PermissionAudit:
    """Create a permission audit log entry"""
    audit = PermissionAudit(
        action=action.value,
        user_id=user_id,
        organization_id=organization_id,
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
    )
    db.add(audit)
    return audit
