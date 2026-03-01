from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.project import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskResponse

router = APIRouter()


@router.get("/subcontractors/my-tasks", response_model=list[TaskResponse])
async def get_my_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all tasks assigned to the subcontractor across all projects"""
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
