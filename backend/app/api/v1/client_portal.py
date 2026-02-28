from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.checklist import ChecklistInstance, ChecklistStatus
from app.models.equipment import ApprovalStatus, Equipment
from app.models.inspection import Finding, FindingStatus, Inspection, InspectionStatus
from app.models.material import Material
from app.models.meeting import Meeting
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.project import ProjectResponse
from app.schemas.project_overview import (
    ProgressMetrics,
    ProjectOverviewResponse,
    ProjectStats,
    TeamStats,
    TimelineEvent,
)
from app.utils import utcnow

router = APIRouter()


@router.get("/health")
async def health_check():
    """Client portal health check endpoint"""
    return {"status": "ok", "service": "client_portal"}


@router.get("/projects", response_model=list[ProjectResponse])
async def list_client_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all projects accessible to the current client/user"""
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(ProjectMember.user_id == current_user.id)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
        .order_by(Project.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_client_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get project details for a specific client project"""
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
        .options(selectinload(Project.members).selectinload(ProjectMember.user))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    return project


@router.get("/projects/{project_id}/overview", response_model=ProjectOverviewResponse)
async def get_client_project_overview(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive project overview with progress, timeline, and statistics"""
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )

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
        select(func.count(Finding.id)).where(
            Finding.status.in_([FindingStatus.OPEN.value, FindingStatus.IN_PROGRESS.value])
        ).join(Inspection).where(Inspection.project_id == project_id)
    )
    open_findings = findings_result.scalar() or 0

    meetings_result = await db.execute(
        select(func.count(Meeting.id)).where(Meeting.project_id == project_id)
    )
    total_meetings = meetings_result.scalar() or 0

    members_result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
        .options(selectinload(ProjectMember.user))
    )
    members = members_result.scalars().all()
    active_members = sum(1 for m in members if m.user and m.user.is_active)
    roles_count = {}
    for m in members:
        role = m.role
        roles_count[role] = roles_count.get(role, 0) + 1

    total_items = (
        inspections_data.total + equipment_data.total +
        materials_data.total + checklists_data.total
    )
    completed_items = (
        inspections_data.completed + equipment_data.submitted +
        materials_data.submitted + checklists_data.completed
    )
    overall_percentage = (completed_items / total_items * 100) if total_items > 0 else 0.0

    timeline_events = []
    audit_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.project_id == project_id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    for log in audit_result.scalars():
        event = TimelineEvent(
            id=log.id,
            date=log.created_at,
            title=f"{log.action.value.title()} {log.entity_type}",
            description=None,
            event_type=log.entity_type,
            entity_id=log.entity_id,
            entity_type=log.entity_type,
            user_name=log.user_full_name or log.user_email,
            metadata={"action": log.action.value}
        )
        timeline_events.append(event)

    days_remaining = None
    days_elapsed = None
    if project.start_date:
        days_elapsed = (utcnow().date() - project.start_date).days
    if project.end_date:
        days_remaining = (project.end_date - utcnow().date()).days

    return ProjectOverviewResponse(
        project_id=project.id,
        project_name=project.name,
        project_status=project.status,
        progress=ProgressMetrics(
            overall_percentage=round(overall_percentage, 2),
            inspections_completed=inspections_data.completed,
            inspections_total=inspections_data.total,
            equipment_submitted=equipment_data.submitted,
            equipment_total=equipment_data.total,
            materials_submitted=materials_data.submitted,
            materials_total=materials_data.total,
            checklists_completed=checklists_data.completed,
            checklists_total=checklists_data.total,
        ),
        timeline=timeline_events,
        team_stats=TeamStats(
            total_members=len(members),
            active_members=active_members,
            roles=roles_count,
        ),
        stats=ProjectStats(
            total_inspections=inspections_data.total,
            pending_inspections=inspections_data.pending,
            total_equipment=equipment_data.total,
            total_materials=materials_data.total,
            total_meetings=total_meetings,
            open_findings=open_findings,
            days_remaining=days_remaining,
            days_elapsed=days_elapsed,
        ),
        last_updated=utcnow(),
        location_lat=project.location_lat,
        location_lng=project.location_lng,
        location_address=project.location_address,
    )


@router.get("/projects/{project_id}/progress", response_model=ProgressMetrics)
async def get_client_project_progress(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get project progress metrics for a client project"""
    result = await db.execute(
        select(Project)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(Project.id == project_id, ProjectMember.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )

    inspections_result = await db.execute(
        select(
            func.count(Inspection.id).label("total"),
            func.count(case((Inspection.status == InspectionStatus.COMPLETED.value, 1))).label("completed")
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

    total_items = (
        inspections_data.total + equipment_data.total +
        materials_data.total + checklists_data.total
    )
    completed_items = (
        inspections_data.completed + equipment_data.submitted +
        materials_data.submitted + checklists_data.completed
    )
    overall_percentage = (completed_items / total_items * 100) if total_items > 0 else 0.0

    return ProgressMetrics(
        overall_percentage=round(overall_percentage, 2),
        inspections_completed=inspections_data.completed,
        inspections_total=inspections_data.total,
        equipment_submitted=equipment_data.submitted,
        equipment_total=equipment_data.total,
        materials_submitted=materials_data.submitted,
        materials_total=materials_data.total,
        checklists_completed=checklists_data.completed,
        checklists_total=checklists_data.total,
    )
