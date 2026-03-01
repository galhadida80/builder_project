from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.role import ProjectRole
from app.models.user import User
from app.schemas.role import ProjectRoleCreate, ProjectRoleResponse, ProjectRoleUpdate

router = APIRouter()


@router.get("/projects/{project_id}/roles", response_model=list[ProjectRoleResponse])
async def list_project_roles(
    project_id: UUID,
    member: ProjectMember = require_permission(Permission.VIEW_ALL),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all custom roles for a project"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ProjectRole)
        .where(ProjectRole.project_id == project_id)
        .order_by(ProjectRole.name)
    )
    roles = result.scalars().all()
    return [ProjectRoleResponse.model_validate(role) for role in roles]


@router.post("/projects/{project_id}/roles", response_model=ProjectRoleResponse, status_code=201)
async def create_project_role(
    project_id: UUID,
    data: ProjectRoleCreate,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom role for a project"""
    await verify_project_access(project_id, current_user, db)

    if data.project_id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch")

    existing = await db.execute(
        select(ProjectRole).where(
            ProjectRole.project_id == project_id,
            ProjectRole.name == data.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Role name already exists in this project")

    role = ProjectRole(
        project_id=project_id,
        name=data.name,
        description=data.description,
        permissions=data.permissions,
        inherits_from_id=data.inherits_from_id,
        is_system_role=False,
        created_by_id=current_user.id,
    )
    db.add(role)
    await db.flush()

    return ProjectRoleResponse.model_validate(role)


@router.get("/projects/{project_id}/roles/{role_id}", response_model=ProjectRoleResponse)
async def get_project_role(
    project_id: UUID,
    role_id: UUID,
    member: ProjectMember = require_permission(Permission.VIEW_ALL),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific project role by ID"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ProjectRole).where(
            ProjectRole.id == role_id,
            ProjectRole.project_id == project_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return ProjectRoleResponse.model_validate(role)


@router.put("/projects/{project_id}/roles/{role_id}", response_model=ProjectRoleResponse)
async def update_project_role(
    project_id: UUID,
    role_id: UUID,
    data: ProjectRoleUpdate,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing project role"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ProjectRole).where(
            ProjectRole.id == role_id,
            ProjectRole.project_id == project_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system_role:
        raise HTTPException(status_code=403, detail="Cannot modify system roles")

    if data.name is not None:
        if data.name != role.name:
            dup = await db.execute(
                select(ProjectRole).where(
                    ProjectRole.project_id == project_id,
                    ProjectRole.name == data.name,
                    ProjectRole.id != role_id,
                )
            )
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Role name already exists in this project")
            role.name = data.name

    if data.description is not None:
        role.description = data.description
    if data.permissions is not None:
        role.permissions = data.permissions
    if data.inherits_from_id is not None:
        role.inherits_from_id = data.inherits_from_id

    await db.flush()
    return ProjectRoleResponse.model_validate(role)


@router.delete("/projects/{project_id}/roles/{role_id}")
async def delete_project_role(
    project_id: UUID,
    role_id: UUID,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project role"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ProjectRole).where(
            ProjectRole.id == role_id,
            ProjectRole.project_id == project_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system_role:
        raise HTTPException(status_code=403, detail="Cannot delete system roles")

    await db.delete(role)
    await db.flush()

    return {"message": "Role deleted"}
