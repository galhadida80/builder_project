from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, get_current_user
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.checklist import ChecklistInstance, ChecklistStatus
from app.models.discussion import Discussion
from app.models.equipment import ApprovalStatus, Equipment
from app.models.file import File
from app.models.inspection import Finding, FindingStatus, Inspection, InspectionStatus
from app.models.material import Material
from app.models.meeting import Meeting
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.client_portal import ClientPortalAuthRequest, ClientPortalAuthResponse
from app.schemas.discussion import DiscussionCreate, DiscussionResponse
from app.schemas.file import FileResponse
from app.schemas.project import ProjectResponse
from app.schemas.project_overview import (
    ProgressMetrics,
    ProjectOverviewResponse,
    ProjectStats,
    TeamStats,
    TimelineEvent,
)
from app.services.client_portal_service import authenticate_client_portal_access
from app.services.websocket_manager import manager
from app.utils import utcnow

router = APIRouter()


@router.get("/health")
async def health_check():
    """Client portal health check endpoint"""
    return {"status": "ok", "service": "client_portal"}


@router.post("/auth", response_model=ClientPortalAuthResponse)
async def authenticate_client(
    request: ClientPortalAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate client portal user with email and access token"""
    # Call existing service function
    portal_access = await authenticate_client_portal_access(
        db, request.email, request.access_token
    )

    if not portal_access:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or inactive access"
        )

    # Update last accessed timestamp
    portal_access.last_accessed_at = utcnow()
    await db.commit()

    # Create JWT token
    token = create_access_token(
        user_id=portal_access.user.id,
        is_super_admin=portal_access.user.is_super_admin
    )

    return ClientPortalAuthResponse(
        access_token=token,
        token_type="bearer",
        user_email=portal_access.user.email,
        user_full_name=portal_access.user.full_name,
        project_id=portal_access.project_id,
        project_name=portal_access.project.name,
        can_view_budget=portal_access.can_view_budget,
        can_view_documents=portal_access.can_view_documents,
        can_submit_feedback=portal_access.can_submit_feedback
    )


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


@router.get("/projects/{project_id}/photos", response_model=list[FileResponse])
async def list_client_project_photos(
    project_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get photos for a client project"""
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

    query = (
        select(File)
        .where(
            File.project_id == project_id,
            or_(
                File.file_type.like("image/%"),
                File.entity_type == "photo"
            )
        )
        .options(selectinload(File.uploaded_by))
        .order_by(File.uploaded_at.desc())
        .limit(limit)
        .offset(offset)
    )
    files_result = await db.execute(query)
    return files_result.scalars().all()


@router.get("/projects/{project_id}/documents", response_model=list[FileResponse])
async def list_client_project_documents(
    project_id: UUID,
    entity_type: str = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get documents for a client project"""
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

    query = (
        select(File)
        .where(File.project_id == project_id)
        .options(selectinload(File.uploaded_by))
    )
    if entity_type:
        query = query.where(File.entity_type == entity_type)

    query = query.order_by(File.uploaded_at.desc()).limit(limit).offset(offset)
    files_result = await db.execute(query)
    return files_result.scalars().all()


@router.get("/projects/{project_id}/feedback", response_model=list[DiscussionResponse])
async def list_client_project_feedback(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get feedback discussions for a client project"""
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

    discussions_result = await db.execute(
        select(Discussion)
        .options(
            selectinload(Discussion.author),
            selectinload(Discussion.replies).selectinload(Discussion.author)
        )
        .where(
            Discussion.project_id == project_id,
            Discussion.entity_type == "project",
            Discussion.parent_id.is_(None)
        )
        .order_by(Discussion.created_at.desc())
    )
    return discussions_result.scalars().all()


@router.post("/projects/{project_id}/feedback", response_model=DiscussionResponse)
async def create_client_project_feedback(
    project_id: UUID,
    data: DiscussionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit feedback for a client project"""
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

    if data.parent_id:
        parent_result = await db.execute(
            select(Discussion).where(
                Discussion.id == data.parent_id,
                Discussion.project_id == project_id
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent discussion not found"
            )

    discussion = Discussion(
        project_id=project_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content
    )
    db.add(discussion)
    await db.flush()

    created_result = await db.execute(
        select(Discussion)
        .options(selectinload(Discussion.author))
        .where(Discussion.id == discussion.id)
    )
    created = created_result.scalar_one()

    await manager.broadcast_to_project(str(project_id), {
        "type": "feedback_created",
        "entityType": data.entity_type,
        "entityId": str(data.entity_id),
        "discussionId": str(created.id),
        "authorName": current_user.full_name
    })

    return created
