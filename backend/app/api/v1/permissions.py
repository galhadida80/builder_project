from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, get_effective_permissions_v2, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.permission_audit import PermissionAction, PermissionAudit
from app.models.permission_override import PermissionOverride
from app.models.project import Project, ProjectMember
from app.models.role import OrganizationRole, ProjectRole
from app.models.user import User
from app.schemas.permission import (
    BulkPermissionAssignment,
    PermissionMatrixResponse,
    ResourcePermissionSummary,
    UserPermissionSummary,
)
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/projects/{project_id}/permissions/matrix", response_model=PermissionMatrixResponse)
async def get_permission_matrix(
    project_id: UUID,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get permission matrix showing effective permissions for all users in a project"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        language = get_language_from_request(request)
        error_message = translate_message('resources.project_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    result = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .options(selectinload(ProjectMember.permission_overrides))
        .options(selectinload(ProjectMember.resource_permissions))
        .where(ProjectMember.project_id == project_id)
    )
    members = result.scalars().all()

    user_summaries = []
    for member_obj in members:
        effective_perms = await get_effective_permissions_v2(member_obj, db)

        org_role_name = None

        project_role_name = None
        project_role_result = await db.execute(
            select(ProjectRole)
            .where(ProjectRole.project_id == project_id)
            .where(ProjectRole.name == member_obj.role)
        )
        project_role = project_role_result.scalar_one_or_none()
        if project_role:
            project_role_name = project_role.name

        resource_perm_summaries = [
            ResourcePermissionSummary(
                resource_type=rp.resource_type,
                resource_id=rp.resource_id,
                permission=rp.permission,
                granted=rp.granted
            )
            for rp in member_obj.resource_permissions
        ]

        user_summaries.append(UserPermissionSummary(
            user_id=member_obj.user_id,
            user_name=member_obj.user.full_name or member_obj.user.email,
            email=member_obj.user.email,
            role=member_obj.role,
            organization_role=org_role_name,
            project_role=project_role_name,
            effective_permissions=list(effective_perms),
            resource_permissions=resource_perm_summaries
        ))

    return PermissionMatrixResponse(
        project_id=project_id,
        project_name=project.name,
        members=user_summaries
    )


@router.post("/projects/{project_id}/permissions/bulk-assign")
async def bulk_assign_permissions(
    project_id: UUID,
    assignment: BulkPermissionAssignment,
    member: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Bulk assign permissions to multiple users"""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .where(ProjectMember.user_id.in_(assignment.user_ids))
    )
    project_members = result.scalars().all()

    if len(project_members) != len(assignment.user_ids):
        language = get_language_from_request(request)
        error_message = translate_message('validation.validation_error', language)
        raise HTTPException(
            status_code=400,
            detail=error_message or "Some users are not members of this project"
        )

    role_name = None
    if assignment.role_id:
        role_name = await _resolve_role_name(assignment.role_id, project_id, db, request)
        for pm in project_members:
            pm.role = role_name

    if assignment.permission_overrides:
        for pm in project_members:
            await _apply_permission_overrides(pm, assignment, current_user, project_id, role_name, db)

    await db.commit()

    return {
        "success": True,
        "users_updated": len(project_members)
    }


async def _resolve_role_name(
    role_id: UUID, project_id: UUID, db: AsyncSession, request: Request
) -> str:
    """Resolve a role_id to a role name, checking project and org roles"""
    project_role_result = await db.execute(
        select(ProjectRole).where(ProjectRole.id == role_id)
    )
    project_role = project_role_result.scalar_one_or_none()

    if project_role:
        if project_role.project_id != project_id:
            language = get_language_from_request(request)
            error_message = translate_message('validation.validation_error', language)
            raise HTTPException(status_code=400, detail=error_message or "Role does not belong to this project")
        return project_role.name

    org_role_result = await db.execute(
        select(OrganizationRole).where(OrganizationRole.id == role_id)
    )
    org_role = org_role_result.scalar_one_or_none()

    if not org_role:
        language = get_language_from_request(request)
        error_message = translate_message('resources.resource_not_found', language)
        raise HTTPException(status_code=404, detail=error_message or "Role not found")

    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.organization_id != org_role.organization_id:
        language = get_language_from_request(request)
        error_message = translate_message('validation.validation_error', language)
        raise HTTPException(
            status_code=400,
            detail=error_message or "Role does not belong to this organization"
        )
    return org_role.name


async def _apply_permission_overrides(
    pm: ProjectMember,
    assignment: BulkPermissionAssignment,
    current_user: User,
    project_id: UUID,
    role_name: str | None,
    db: AsyncSession,
) -> None:
    """Apply permission overrides and create audit log for a project member"""
    for override_req in assignment.permission_overrides:
        existing_override_result = await db.execute(
            select(PermissionOverride)
            .where(PermissionOverride.project_member_id == pm.id)
            .where(PermissionOverride.permission == override_req.permission)
        )
        existing_override = existing_override_result.scalar_one_or_none()

        if existing_override:
            existing_override.granted = override_req.granted
        else:
            new_override = PermissionOverride(
                project_member_id=pm.id,
                permission=override_req.permission,
                granted=override_req.granted,
                granted_by_id=current_user.id
            )
            db.add(new_override)

    audit = PermissionAudit(
        action=PermissionAction.PERMISSION_OVERRIDE_ADDED.value,
        user_id=current_user.id,
        target_user_id=pm.user_id,
        project_id=project_id,
        entity_type="project_member",
        entity_id=pm.id,
        new_values={
            "role": role_name if role_name else pm.role,
            "permission_overrides": [
                {"permission": po.permission, "granted": po.granted}
                for po in assignment.permission_overrides
            ] if assignment.permission_overrides else []
        }
    )
    db.add(audit)
