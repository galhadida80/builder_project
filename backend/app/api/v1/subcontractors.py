import logging
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.audit import AuditLog
from app.models.invitation import InvitationStatus, ProjectInvitation
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI, RFIResponse as RFIResponseModel
from app.models.subcontractor import SubcontractorProfile
from app.models.task import Task
from app.models.user import User
from app.schemas.approval import ApprovalRequestResponse
from app.schemas.project_overview import TimelineEvent
from app.schemas.rfi import PaginatedRFIResponse, RFIListResponse
from app.schemas.subcontractor import (
    ApprovalStats,
    RFIStats,
    SubcontractorDashboardResponse,
    SubcontractorInviteRequest,
    SubcontractorInviteResponse,
    SubcontractorProfileCreate,
    SubcontractorProfileResponse,
    SubcontractorProfileUpdate,
    TaskStats,
)
from app.schemas.task import TaskResponse
from app.services.email_renderer import render_subcontractor_invite_email
from app.services.email_service import EmailService
from app.utils import utcnow
from app.utils.localization import get_language_from_request

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


@router.get("/projects/{project_id}/subcontractors", response_model=list[SubcontractorProfileResponse])
async def list_subcontractors(
    project_id: UUID,
    trade: str = Query(None),
    verified_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    members_result = await db.execute(
        select(ProjectMember.user_id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.role == "subcontractor",
        )
    )
    sub_user_ids = [row[0] for row in members_result.all()]
    if not sub_user_ids:
        return []

    query = (
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.user_id.in_(sub_user_ids))
    )
    if trade:
        query = query.where(SubcontractorProfile.trade == trade)
    if verified_only:
        query = query.where(SubcontractorProfile.is_verified.is_(True))

    result = await db.execute(query.order_by(SubcontractorProfile.company_name))
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/subcontractors/invite",
    response_model=SubcontractorInviteResponse,
    status_code=201,
)
async def invite_subcontractor(
    project_id: UUID,
    data: SubcontractorInviteRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.email == data.email,
            ProjectInvitation.status == InvitationStatus.PENDING.value,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Pending invitation already exists for this email")

    invitation = ProjectInvitation(
        project_id=project_id,
        email=data.email,
        role="subcontractor",
        invited_by_id=current_user.id,
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    invite_url = f"{settings.frontend_base_url}/invite?token={invitation.token}"
    language = get_language_from_request(request)

    try:
        email_service = EmailService()
        if email_service.enabled:
            invited_by_name = current_user.full_name or current_user.email
            subject, body_html = render_subcontractor_invite_email(
                project_name=project.name,
                company_name=data.company_name,
                trade=data.trade,
                invited_by=invited_by_name,
                invite_url=invite_url,
                language=language,
                message=data.message or "",
            )
            background_tasks.add_task(
                email_service.send_notification,
                to_email=data.email,
                subject=subject,
                body_html=body_html,
            )
    except Exception:
        logger.warning("Failed to send subcontractor invite email to %s", data.email, exc_info=True)

    return SubcontractorInviteResponse(
        id=invitation.id,
        email=invitation.email,
        trade=data.trade,
        company_name=data.company_name,
        token=invitation.token,
        invite_url=invite_url,
        expires_at=invitation.expires_at,
    )


@router.get("/subcontractors/invite/accept")
async def accept_subcontractor_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectInvitation).where(ProjectInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation token")

    if invitation.status != InvitationStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Invitation is {invitation.status}")

    if invitation.expires_at < utcnow():
        invitation.status = InvitationStatus.EXPIRED.value
        await db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    project_result = await db.execute(select(Project).where(Project.id == invitation.project_id))
    project = project_result.scalar_one_or_none()

    return {
        "email": invitation.email,
        "role": invitation.role,
        "projectName": project.name if project else None,
        "projectId": str(invitation.project_id),
    }


@router.get("/subcontractors/me", response_model=SubcontractorProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Subcontractor profile not found")
    return profile


@router.get("/subcontractors/dashboard", response_model=SubcontractorDashboardResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard summary statistics for subcontractor"""
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )

    today = date.today()
    upcoming_threshold = today + timedelta(days=7)

    tasks_result = await db.execute(
        select(
            func.count(Task.id).label("total"),
            func.count(case((Task.status == "in_progress", 1))).label("in_progress"),
            func.count(case((Task.status == "completed", 1))).label("completed"),
            func.count(case((
                (Task.due_date < today) & (Task.status != "completed"), 1
            ))).label("overdue"),
        ).where(
            Task.project_id.in_(user_project_ids),
            Task.assignee_id == current_user.id,
        )
    )
    tasks_data = tasks_result.one()

    rfis_result = await db.execute(
        select(
            func.count(RFI.id).label("total"),
            func.count(case((RFI.status == "open", 1))).label("open"),
            func.count(case((RFI.status == "waiting_response", 1))).label("waiting_response"),
            func.count(case((RFI.status == "answered", 1))).label("answered"),
        ).where(RFI.project_id.in_(user_project_ids))
    )
    rfis_data = rfis_result.one()

    approvals_result = await db.execute(
        select(ApprovalRequest.id, ApprovalRequest.current_status)
        .where(ApprovalRequest.project_id.in_(user_project_ids))
    )
    approvals = approvals_result.all()
    approval_stats = {
        "total": len(approvals),
        "pending": sum(1 for a in approvals if a.current_status == "pending"),
        "approved": sum(1 for a in approvals if a.current_status == "approved"),
        "rejected": sum(1 for a in approvals if a.current_status == "rejected"),
    }

    upcoming_deadlines_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id.in_(user_project_ids),
            Task.assignee_id == current_user.id,
            Task.due_date.between(today, upcoming_threshold),
            Task.status != "completed",
        )
    )
    upcoming_deadlines = upcoming_deadlines_result.scalar() or 0

    return SubcontractorDashboardResponse(
        task_stats=TaskStats(
            total=tasks_data.total,
            in_progress=tasks_data.in_progress,
            completed=tasks_data.completed,
            overdue=tasks_data.overdue,
        ),
        rfi_stats=RFIStats(
            total=rfis_data.total,
            open=rfis_data.open,
            waiting_response=rfis_data.waiting_response,
            answered=rfis_data.answered,
        ),
        approval_stats=ApprovalStats(
            total=approval_stats["total"],
            pending=approval_stats["pending"],
            approved=approval_stats["approved"],
            rejected=approval_stats["rejected"],
        ),
        upcoming_deadlines=upcoming_deadlines,
    )


@router.post("/subcontractors/me", response_model=SubcontractorProfileResponse, status_code=201)
async def create_my_profile(
    data: SubcontractorProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(SubcontractorProfile).where(SubcontractorProfile.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Profile already exists")

    profile = SubcontractorProfile(
        user_id=current_user.id,
        company_name=data.company_name,
        trade=data.trade,
        license_number=data.license_number,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,
        address=data.address,
        insurance_expiry=data.insurance_expiry,
        notes=data.notes,
        certifications=data.certifications,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile, ["user"])
    return profile


@router.patch("/subcontractors/me", response_model=SubcontractorProfileResponse)
async def update_my_profile(
    data: SubcontractorProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Subcontractor profile not found")

    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("is_verified", None)
    for key, value in update_data.items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile, ["user"])
    return profile


@router.patch("/subcontractors/{profile_id}/verify", response_model=SubcontractorProfileResponse)
async def verify_subcontractor(
    profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not getattr(current_user, "is_super_admin", False):
        raise HTTPException(status_code=403, detail="Only admins can verify subcontractors")

    result = await db.execute(
        select(SubcontractorProfile)
        .options(selectinload(SubcontractorProfile.user))
        .where(SubcontractorProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.is_verified = not profile.is_verified
    await db.commit()
    await db.refresh(profile, ["user"])
    return profile


@router.get("/subcontractors/my-tasks", response_model=list[TaskResponse])
async def get_my_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )
    query = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.reporter),
            selectinload(Task.created_by),
            selectinload(Task.dependencies),
        )
        .where(
            Task.project_id.in_(user_project_ids),
            Task.assignee_id == current_user.id,
        )
    )
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    query = query.order_by(Task.task_number.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/subcontractors/my-approvals", response_model=list[ApprovalRequestResponse])
async def get_my_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )
    result = await db.execute(
        select(ApprovalRequest)
        .options(
            selectinload(ApprovalRequest.created_by),
            selectinload(ApprovalRequest.steps).selectinload(ApprovalStep.approved_by)
        )
        .where(ApprovalRequest.project_id.in_(user_project_ids))
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/subcontractors/my-rfis", response_model=PaginatedRFIResponse)
async def get_my_rfis(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )

    query = select(RFI).where(RFI.project_id.in_(user_project_ids))

    if status:
        query = query.where(RFI.status == status)
    if priority:
        query = query.where(RFI.priority == priority)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (RFI.subject.ilike(search_pattern)) |
            (RFI.question.ilike(search_pattern)) |
            (RFI.rfi_number.ilike(search_pattern))
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(RFI.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rfis = result.scalars().all()

    rfi_ids = [rfi.id for rfi in rfis]
    count_result = await db.execute(
        select(RFIResponseModel.rfi_id, func.count(RFIResponseModel.id).label("cnt"))
        .where(RFIResponseModel.rfi_id.in_(rfi_ids))
        .group_by(RFIResponseModel.rfi_id)
    )
    response_counts = {row.rfi_id: row.cnt for row in count_result.all()}

    rfi_responses = []
    for rfi in rfis:
        rfi_responses.append(RFIListResponse(
            id=rfi.id,
            project_id=rfi.project_id,
            rfi_number=rfi.rfi_number,
            subject=rfi.subject,
            to_email=rfi.to_email,
            to_name=rfi.to_name,
            category=rfi.category,
            priority=rfi.priority,
            status=rfi.status,
            due_date=rfi.due_date,
            created_at=rfi.created_at,
            sent_at=rfi.sent_at,
            responded_at=rfi.responded_at,
            response_count=response_counts.get(rfi.id, 0),
            related_equipment_id=rfi.related_equipment_id,
            related_material_id=rfi.related_material_id
        ))

    total_pages = (total + page_size - 1) // page_size

    return PaginatedRFIResponse(
        items=rfi_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/projects/{project_id}/subcontractors/portal", response_model=dict)
async def get_portal_data(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    profile_result = await db.execute(
        select(SubcontractorProfile).where(SubcontractorProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()

    return {
        "has_profile": profile is not None,
        "is_verified": profile.is_verified if profile else False,
        "role": member.role if member else None,
        "company_name": profile.company_name if profile else None,
        "trade": profile.trade if profile else None,
    }


@router.get("/subcontractors/activity-feed", response_model=list[TimelineEvent])
async def get_activity_feed(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get activity feed for subcontractor across all their projects"""
    user_project_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == "subcontractor",
    )

    audit_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.project_id.in_(user_project_ids))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )

    timeline_events = []
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

    return timeline_events
