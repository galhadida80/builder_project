from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.approval import ApprovalRequest
from app.models.audit import AuditLog
from app.models.project import ProjectMember
from app.models.rfi import RFI
from app.models.task import Task
from app.models.user import User
from app.schemas.project_overview import TimelineEvent
from app.schemas.subcontractor import (
    ApprovalStats,
    RFIStats,
    SubcontractorDashboardResponse,
    TaskStats,
)

router = APIRouter()


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
