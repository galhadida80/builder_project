from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import ROLE_PERMISSIONS, Permission, get_effective_permissions, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction, AuditLog
from app.models.checklist import ChecklistInstance, ChecklistStatus
from app.models.equipment import ApprovalStatus, Equipment
from app.models.inspection import Finding, FindingStatus, Inspection, InspectionStatus
from app.models.material import Material
from app.models.meeting import Meeting
from app.models.permission_override import PermissionOverride
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.permission import EffectivePermissionsResponse, PermissionOverrideRequest, PermissionOverrideResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.project_overview import (
    ProgressMetrics,
    ProjectOverviewResponse,
    ProjectStats,
    TeamStats,
    TimelineEvent,
)
from app.services.audit_service import create_audit_log, get_model_dict

router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(ProjectMember.user_id == current_user.id)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(**data.model_dump(), created_by_id=current_user.id)
    db.add(project)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail=f"Project code '{data.code}' already exists")

    member = ProjectMember(project_id=project.id, user_id=current_user.id, role="project_admin")
    db.add(member)

    await create_audit_log(db, current_user, "project", project.id, AuditAction.CREATE,
                          project_id=project.id, new_values=get_model_dict(project))

    await db.commit()
    await db.refresh(project, ["members"])
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_values = get_model_dict(project)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)

    await create_audit_log(db, current_user, "project", project.id, AuditAction.UPDATE,
                          project_id=project.id, old_values=old_values, new_values=get_model_dict(project))

    await db.commit()
    await db.refresh(project, ["members"])
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await create_audit_log(db, current_user, "project", project.id, AuditAction.DELETE,
                          project_id=project.id, old_values=get_model_dict(project))

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}


@router.get("/{project_id}/overview", response_model=ProjectOverviewResponse)
async def get_project_overview(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    inspections_result = await db.execute(
        select(
            func.count(Inspection.id).label("total"),
            func.count(case((Inspection.status == InspectionStatus.COMPLETED.value, 1))).label("completed"),
            func.count(case((Inspection.status == InspectionStatus.PENDING.value, 1))).label("pending")
        ).where(Inspection.project_id == project_id)
    )
    inspections_data = inspections_result.one()

    equipment_result = await db.execute(
        select(
            func.count(Equipment.id).label("total"),
            func.count(case((Equipment.status == ApprovalStatus.SUBMITTED.value, 1))).label("submitted")
        ).where(Equipment.project_id == project_id)
    )
    equipment_data = equipment_result.one()

    materials_result = await db.execute(
        select(
            func.count(Material.id).label("total"),
            func.count(case((Material.status == ApprovalStatus.SUBMITTED.value, 1))).label("submitted")
        ).where(Material.project_id == project_id)
    )
    materials_data = materials_result.one()

    checklists_result = await db.execute(
        select(
            func.count(ChecklistInstance.id).label("total"),
            func.count(case((ChecklistInstance.status == ChecklistStatus.COMPLETED.value, 1))).label("completed")
        ).where(ChecklistInstance.project_id == project_id)
    )
    checklists_data = checklists_result.one()

    findings_result = await db.execute(
        select(func.count(Finding.id))
        .join(Inspection, Finding.inspection_id == Inspection.id)
        .where(Inspection.project_id == project_id, Finding.status == FindingStatus.OPEN.value)
    )
    open_findings = findings_result.scalar() or 0

    meetings_result = await db.execute(
        select(func.count(Meeting.id)).where(Meeting.project_id == project_id)
    )
    total_meetings = meetings_result.scalar() or 0

    total_items = (
        inspections_data.total + equipment_data.total +
        materials_data.total + checklists_data.total
    )
    equipment_approved_result = await db.execute(
        select(
            func.count(case((Equipment.status == ApprovalStatus.APPROVED.value, 1))).label("approved")
        ).where(Equipment.project_id == project_id)
    )
    equipment_approved = equipment_approved_result.scalar() or 0

    materials_approved_result = await db.execute(
        select(
            func.count(case((Material.status == ApprovalStatus.APPROVED.value, 1))).label("approved")
        ).where(Material.project_id == project_id)
    )
    materials_approved = materials_approved_result.scalar() or 0

    completed_items = (
        inspections_data.completed + equipment_approved +
        materials_approved + checklists_data.completed
    )
    overall_percentage = (completed_items / total_items * 100) if total_items > 0 else 0.0

    progress = ProgressMetrics(
        overall_percentage=round(overall_percentage, 2),
        inspections_completed=inspections_data.completed,
        inspections_total=inspections_data.total,
        equipment_submitted=equipment_data.submitted,
        equipment_total=equipment_data.total,
        materials_submitted=materials_data.submitted,
        materials_total=materials_data.total,
        checklists_completed=checklists_data.completed,
        checklists_total=checklists_data.total
    )

    audit_logs_result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.project_id == project_id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    audit_logs = audit_logs_result.scalars().all()

    timeline = [
        TimelineEvent(
            id=log.id,
            date=log.created_at,
            title=f"{log.action.replace('_', ' ').title()} {log.entity_type}",
            description=f"{log.entity_type.capitalize()} {log.action}",
            event_type=log.entity_type,
            entity_id=log.entity_id,
            entity_type=log.entity_type,
            user_name=log.user.full_name if log.user else None
        )
        for log in audit_logs
    ]

    members_result = await db.execute(
        select(ProjectMember.role, func.count(ProjectMember.id))
        .where(ProjectMember.project_id == project_id)
        .group_by(ProjectMember.role)
    )
    role_counts = dict(members_result.all())

    total_members_result = await db.execute(
        select(func.count(ProjectMember.id)).where(ProjectMember.project_id == project_id)
    )
    total_members = total_members_result.scalar() or 0

    team_stats = TeamStats(
        total_members=total_members,
        active_members=total_members,
        roles=role_counts
    )

    days_elapsed = None
    days_remaining = None
    if project.start_date:
        days_elapsed = (datetime.now(timezone.utc).date() - project.start_date).days
    if project.estimated_end_date:
        days_remaining = (project.estimated_end_date - datetime.now(timezone.utc).date()).days

    stats = ProjectStats(
        total_inspections=inspections_data.total,
        pending_inspections=inspections_data.pending,
        total_equipment=equipment_data.total,
        total_materials=materials_data.total,
        total_meetings=total_meetings,
        open_findings=open_findings,
        days_remaining=days_remaining,
        days_elapsed=days_elapsed
    )

    return ProjectOverviewResponse(
        project_id=project.id,
        project_name=project.name,
        project_code=project.code,
        project_status=project.status,
        progress=progress,
        timeline=timeline,
        team_stats=team_stats,
        stats=stats,
        last_updated=datetime.now(timezone.utc)
    )


@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: UUID,
    data: ProjectMemberCreate,
    caller: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User is already a member of this project")

    member = ProjectMember(project_id=project_id, user_id=data.user_id, role=data.role)
    db.add(member)
    await db.flush()
    await db.commit()
    await db.refresh(member, ["user"])
    return member


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    caller: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    return {"message": "Member removed"}


@router.get("/{project_id}/members/{member_id}/permissions", response_model=EffectivePermissionsResponse)
async def get_member_permissions(
    project_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    effective = await get_effective_permissions(member, db)

    override_result = await db.execute(
        select(PermissionOverride).where(PermissionOverride.project_member_id == member.id)
    )
    overrides = [
        PermissionOverrideResponse(
            id=o.id, permission=o.permission, granted=o.granted,
            granted_by_id=o.granted_by_id, created_at=o.created_at,
        )
        for o in override_result.scalars().all()
    ]

    return EffectivePermissionsResponse(
        role=member.role,
        permissions=sorted(effective),
        overrides=overrides,
    )


@router.put("/{project_id}/members/{member_id}/permissions")
async def set_member_permissions(
    project_id: UUID,
    member_id: UUID,
    data: list[PermissionOverrideRequest],
    caller: ProjectMember = require_permission(Permission.MANAGE_MEMBERS),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    existing = await db.execute(
        select(PermissionOverride).where(PermissionOverride.project_member_id == member.id)
    )
    for override in existing.scalars().all():
        await db.delete(override)

    role_defaults = ROLE_PERMISSIONS.get(member.role, set())
    for item in data:
        is_default = item.permission in role_defaults
        if (item.granted and is_default) or (not item.granted and not is_default):
            continue
        override = PermissionOverride(
            project_member_id=member.id,
            permission=item.permission,
            granted=item.granted,
            granted_by_id=current_user.id,
        )
        db.add(override)

    await db.commit()
    return {"message": "Permissions updated"}
