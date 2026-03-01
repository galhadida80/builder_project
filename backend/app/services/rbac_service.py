from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.permission_audit import PermissionAction
from app.models.project import Project
from app.models.role import OrganizationRole, ProjectRole
from app.schemas.role import (
    OrganizationRoleCreate,
    OrganizationRoleUpdate,
    ProjectRoleCreate,
    ProjectRoleUpdate,
)
from app.services.rbac_helpers import create_permission_audit
from app.utils import utcnow


class RBACService:
    """Service for managing role-based access control operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_organization_role(
        self,
        role_data: OrganizationRoleCreate,
        created_by_id: UUID
    ) -> OrganizationRole:
        """Create a new organization-level custom role"""
        role = OrganizationRole(
            organization_id=role_data.organization_id,
            name=role_data.name,
            description=role_data.description,
            permissions=role_data.permissions,
            created_by_id=created_by_id
        )
        self.db.add(role)
        await self.db.flush()
        await create_permission_audit(
            self.db,
            action=PermissionAction.ROLE_CREATED,
            user_id=created_by_id,
            organization_id=role_data.organization_id,
            entity_type="organization_role",
            entity_id=role.id,
            new_values={
                "name": role_data.name,
                "permissions": role_data.permissions
            }
        )
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def get_organization_role(
        self,
        role_id: UUID
    ) -> Optional[OrganizationRole]:
        """Get an organization role by ID"""
        query = (
            select(OrganizationRole)
            .options(selectinload(OrganizationRole.organization))
            .options(selectinload(OrganizationRole.created_by))
            .where(OrganizationRole.id == role_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_organization_roles(
        self,
        organization_id: UUID
    ) -> list[OrganizationRole]:
        """List all roles for an organization"""
        query = (
            select(OrganizationRole)
            .where(OrganizationRole.organization_id == organization_id)
            .order_by(OrganizationRole.name)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_organization_role(
        self,
        role_id: UUID,
        role_data: OrganizationRoleUpdate,
        updated_by_id: UUID
    ) -> Optional[OrganizationRole]:
        """Update an organization role"""
        role = await self.get_organization_role(role_id)
        if not role:
            return None

        old_values = {
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions
        }

        if role_data.name is not None:
            role.name = role_data.name
        if role_data.description is not None:
            role.description = role_data.description
        if role_data.permissions is not None:
            role.permissions = role_data.permissions

        role.updated_at = utcnow()

        await create_permission_audit(
            self.db,
            action=PermissionAction.ROLE_UPDATED,
            user_id=updated_by_id,
            organization_id=role.organization_id,
            entity_type="organization_role",
            entity_id=role_id,
            old_values=old_values,
            new_values={
                "name": role.name,
                "description": role.description,
                "permissions": role.permissions
            }
        )
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def delete_organization_role(
        self,
        role_id: UUID,
        deleted_by_id: UUID
    ) -> bool:
        """Delete an organization role"""
        role = await self.get_organization_role(role_id)
        if not role or role.is_system_role:
            return False

        await create_permission_audit(
            self.db,
            action=PermissionAction.ROLE_DELETED,
            user_id=deleted_by_id,
            organization_id=role.organization_id,
            entity_type="organization_role",
            entity_id=role_id,
            old_values={
                "name": role.name,
                "permissions": role.permissions
            }
        )

        await self.db.delete(role)
        await self.db.commit()
        return True

    async def create_project_role(
        self,
        role_data: ProjectRoleCreate,
        created_by_id: UUID
    ) -> ProjectRole:
        """Create a new project-level custom role"""
        role = ProjectRole(
            project_id=role_data.project_id,
            name=role_data.name,
            description=role_data.description,
            permissions=role_data.permissions,
            inherits_from_id=role_data.inherits_from_id,
            created_by_id=created_by_id
        )
        self.db.add(role)
        await self.db.flush()

        project = await self.db.get(Project, role_data.project_id)
        await create_permission_audit(
            self.db,
            action=PermissionAction.ROLE_CREATED,
            user_id=created_by_id,
            organization_id=project.organization_id if project else None,
            project_id=role_data.project_id,
            entity_type="project_role",
            entity_id=role.id,
            new_values={
                "name": role_data.name,
                "permissions": role_data.permissions,
                "inherits_from_id": str(role_data.inherits_from_id) if role_data.inherits_from_id else None
            }
        )
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def get_project_role(
        self,
        role_id: UUID
    ) -> Optional[ProjectRole]:
        """Get a project role by ID"""
        query = (
            select(ProjectRole)
            .options(selectinload(ProjectRole.project))
            .options(selectinload(ProjectRole.inherits_from))
            .options(selectinload(ProjectRole.created_by))
            .where(ProjectRole.id == role_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_project_roles(
        self,
        project_id: UUID
    ) -> list[ProjectRole]:
        """List all roles for a project"""
        query = (
            select(ProjectRole)
            .where(ProjectRole.project_id == project_id)
            .order_by(ProjectRole.name)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_project_role(
        self,
        role_id: UUID,
        role_data: ProjectRoleUpdate,
        updated_by_id: UUID
    ) -> Optional[ProjectRole]:
        """Update a project role"""
        role = await self.get_project_role(role_id)
        if not role:
            return None

        old_values = {
            "name": role.name,
            "description": role.description,
            "permissions": role.permissions,
            "inherits_from_id": str(role.inherits_from_id) if role.inherits_from_id else None
        }

        if role_data.name is not None:
            role.name = role_data.name
        if role_data.description is not None:
            role.description = role_data.description
        if role_data.permissions is not None:
            role.permissions = role_data.permissions
        if role_data.inherits_from_id is not None:
            role.inherits_from_id = role_data.inherits_from_id

        role.updated_at = utcnow()

        project = await self.db.get(Project, role.project_id)
        await create_permission_audit(
            self.db,
            action=PermissionAction.ROLE_UPDATED,
            user_id=updated_by_id,
            organization_id=project.organization_id if project else None,
            project_id=role.project_id,
            entity_type="project_role",
            entity_id=role_id,
            old_values=old_values,
            new_values={
                "name": role.name,
                "description": role.description,
                "permissions": role.permissions,
                "inherits_from_id": str(role.inherits_from_id) if role.inherits_from_id else None
            }
        )
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def delete_project_role(
        self,
        role_id: UUID,
        deleted_by_id: UUID
    ) -> bool:
        """Delete a project role"""
        role = await self.get_project_role(role_id)
        if not role or role.is_system_role:
            return False

        project = await self.db.get(Project, role.project_id)
        await create_permission_audit(
            self.db,
            action=PermissionAction.ROLE_DELETED,
            user_id=deleted_by_id,
            organization_id=project.organization_id if project else None,
            project_id=role.project_id,
            entity_type="project_role",
            entity_id=role_id,
            old_values={
                "name": role.name,
                "permissions": role.permissions
            }
        )

        await self.db.delete(role)
        await self.db.commit()
        return True
