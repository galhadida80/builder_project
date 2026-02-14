from enum import Enum
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.user import User


class Permission(str, Enum):
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    APPROVE = "approve"
    VIEW_ALL = "view_all"
    MANAGE_MEMBERS = "manage_members"
    MANAGE_SETTINGS = "manage_settings"


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "project_admin": {p.value for p in Permission},
    "supervisor": {
        Permission.CREATE.value,
        Permission.EDIT.value,
        Permission.APPROVE.value,
        Permission.VIEW_ALL.value,
    },
    "consultant": {
        Permission.VIEW_ALL.value,
        Permission.APPROVE.value,
        Permission.CREATE.value,
    },
    "contractor": {
        Permission.CREATE.value,
        Permission.EDIT.value,
        Permission.VIEW_ALL.value,
    },
    "inspector": {
        Permission.CREATE.value,
        Permission.EDIT.value,
        Permission.VIEW_ALL.value,
    },
}


async def get_effective_permissions(member: ProjectMember, db: AsyncSession) -> set[str]:
    from app.models.permission_override import PermissionOverride

    base = set(ROLE_PERMISSIONS.get(member.role, set()))
    result = await db.execute(
        select(PermissionOverride).where(PermissionOverride.project_member_id == member.id)
    )
    overrides = result.scalars().all()
    for override in overrides:
        if override.granted:
            base.add(override.permission)
        else:
            base.discard(override.permission)
    return base


def require_permission(permission: Permission):
    async def dependency(
        project_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> ProjectMember:
        if getattr(current_user, "is_super_admin", False):
            result = await db.execute(
                select(ProjectMember).where(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == current_user.id,
                )
            )
            member = result.scalar_one_or_none()
            if member:
                return member
            placeholder = ProjectMember(
                project_id=project_id,
                user_id=current_user.id,
                role="project_admin",
            )
            return placeholder

        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this project",
            )

        effective = await get_effective_permissions(member, db)
        if permission.value not in effective:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission.value}' required",
            )
        return member

    return Depends(dependency)


async def check_permission(permission: Permission, project_id: UUID, user_id: UUID, db: AsyncSession) -> None:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user and user.is_super_admin:
        return

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )

    effective = await get_effective_permissions(member, db)
    if permission.value not in effective:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{permission.value}' required",
        )
