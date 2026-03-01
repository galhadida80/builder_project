from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.organizations import verify_org_access
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.role import OrganizationRole
from app.models.user import User
from app.schemas.role import OrganizationRoleCreate, OrganizationRoleResponse, OrganizationRoleUpdate

router = APIRouter()


@router.get("/organizations/{org_id}/roles", response_model=list[OrganizationRoleResponse])
async def list_organization_roles(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all roles for an organization"""
    await verify_org_access(org_id, current_user, db)

    result = await db.execute(
        select(OrganizationRole)
        .where(OrganizationRole.organization_id == org_id)
        .order_by(OrganizationRole.name)
    )
    roles = result.scalars().all()
    return [OrganizationRoleResponse.model_validate(role) for role in roles]


@router.post("/organizations/{org_id}/roles", response_model=OrganizationRoleResponse, status_code=201)
async def create_organization_role(
    org_id: UUID,
    data: OrganizationRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom role for an organization"""
    await verify_org_access(org_id, current_user, db, require_admin=True)

    if data.organization_id != org_id:
        raise HTTPException(status_code=400, detail="Organization ID mismatch")

    existing = await db.execute(
        select(OrganizationRole).where(
            OrganizationRole.organization_id == org_id,
            OrganizationRole.name == data.name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Role name already exists in this organization")

    role = OrganizationRole(
        organization_id=org_id,
        name=data.name,
        description=data.description,
        permissions=data.permissions,
        is_system_role=False,
        created_by_id=current_user.id,
    )
    db.add(role)
    await db.flush()

    return OrganizationRoleResponse.model_validate(role)


@router.get("/organizations/{org_id}/roles/{role_id}", response_model=OrganizationRoleResponse)
async def get_organization_role(
    org_id: UUID,
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific organization role by ID"""
    await verify_org_access(org_id, current_user, db)

    result = await db.execute(
        select(OrganizationRole).where(
            OrganizationRole.id == role_id,
            OrganizationRole.organization_id == org_id,
        )
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return OrganizationRoleResponse.model_validate(role)


@router.put("/organizations/{org_id}/roles/{role_id}", response_model=OrganizationRoleResponse)
async def update_organization_role(
    org_id: UUID,
    role_id: UUID,
    data: OrganizationRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing organization role"""
    await verify_org_access(org_id, current_user, db, require_admin=True)

    result = await db.execute(
        select(OrganizationRole).where(
            OrganizationRole.id == role_id,
            OrganizationRole.organization_id == org_id,
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
                select(OrganizationRole).where(
                    OrganizationRole.organization_id == org_id,
                    OrganizationRole.name == data.name,
                    OrganizationRole.id != role_id
                )
            )
            if dup.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Role name already exists in this organization")
            role.name = data.name

    if data.description is not None:
        role.description = data.description
    if data.permissions is not None:
        role.permissions = data.permissions

    await db.flush()
    return OrganizationRoleResponse.model_validate(role)


@router.delete("/organizations/{org_id}/roles/{role_id}")
async def delete_organization_role(
    org_id: UUID,
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an organization role"""
    await verify_org_access(org_id, current_user, db, require_admin=True)

    result = await db.execute(
        select(OrganizationRole).where(
            OrganizationRole.id == role_id,
            OrganizationRole.organization_id == org_id,
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
