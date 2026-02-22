from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.approval import ApprovalStep
from app.models.contact import Contact
from app.models.defect import Defect, DefectAssignee
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI
from app.models.task import Task
from app.models.user import User
from app.schemas.user import WorkItemBrief, WorkSummaryResponse

router = APIRouter()


@router.get("/me/work-summary", response_model=WorkSummaryResponse)
async def get_work_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    projects_q = select(func.count()).select_from(ProjectMember).join(
        Project, Project.id == ProjectMember.project_id
    ).where(ProjectMember.user_id == user.id, Project.status == "active")
    projects_count = (await db.execute(projects_q)).scalar() or 0

    tasks_q = select(func.count()).select_from(Task).where(
        Task.assignee_id == user.id,
        Task.status.in_(["not_started", "in_progress"]),
    )
    open_tasks = (await db.execute(tasks_q)).scalar() or 0

    rfis_q = select(func.count()).select_from(RFI).where(
        RFI.assigned_to_id == user.id,
        RFI.status.in_(["open", "waiting_response"]),
    )
    open_rfis = (await db.execute(rfis_q)).scalar() or 0

    approvals_q = select(func.count()).select_from(ApprovalStep).join(
        Contact, Contact.id == ApprovalStep.contact_id
    ).where(Contact.user_id == user.id, ApprovalStep.status == "pending")
    pending_approvals = (await db.execute(approvals_q)).scalar() or 0

    defects_direct_q = select(Defect.id).join(
        Contact, Contact.id == Defect.assigned_contact_id
    ).where(Contact.user_id == user.id, Defect.status.in_(["open", "in_progress"]))

    defects_junction_q = select(Defect.id).join(
        DefectAssignee, DefectAssignee.defect_id == Defect.id
    ).join(
        Contact, Contact.id == DefectAssignee.contact_id
    ).where(Contact.user_id == user.id, Defect.status.in_(["open", "in_progress"]))

    combined = defects_direct_q.union(defects_junction_q).subquery()
    defects_count_q = select(func.count()).select_from(combined)
    open_defects = (await db.execute(defects_count_q)).scalar() or 0

    recent_items: list[WorkItemBrief] = []

    recent_tasks = await db.execute(
        select(Task.id, Task.title, Task.status, Task.updated_at, Project.name).join(
            Project, Project.id == Task.project_id
        ).where(
            Task.assignee_id == user.id,
            Task.status.in_(["not_started", "in_progress"]),
        ).order_by(Task.updated_at.desc()).limit(5)
    )
    for row in recent_tasks:
        recent_items.append(WorkItemBrief(
            id=row.id, entity_type="task", title=row.title,
            status=row.status, project_name=row.name, updated_at=row.updated_at,
        ))

    recent_rfis = await db.execute(
        select(RFI.id, RFI.subject, RFI.status, RFI.updated_at, Project.name).join(
            Project, Project.id == RFI.project_id
        ).where(
            RFI.assigned_to_id == user.id,
            RFI.status.in_(["open", "waiting_response"]),
        ).order_by(RFI.updated_at.desc()).limit(5)
    )
    for row in recent_rfis:
        recent_items.append(WorkItemBrief(
            id=row.id, entity_type="rfi", title=row.subject,
            status=row.status, project_name=row.name, updated_at=row.updated_at,
        ))

    recent_items.sort(key=lambda x: x.updated_at, reverse=True)
    recent_items = recent_items[:5]

    return WorkSummaryResponse(
        projects_count=projects_count,
        open_tasks=open_tasks,
        open_rfis=open_rfis,
        pending_approvals=pending_approvals,
        open_defects=open_defects,
        recent_items=recent_items,
    )
