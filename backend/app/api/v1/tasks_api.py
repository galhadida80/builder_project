import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.project import Project
from app.models.task import Task, TaskDependency
from app.models.user import User
from app.schemas.task import (
    TaskBulkUpdate,
    TaskCreate,
    TaskDependencyResponse,
    TaskResponse,
    TaskSummaryResponse,
    TaskUpdate,
)
from app.services.notification_service import notify_user
from app.services.permit_service import check_milestone_permit_requirements
from app.utils import utcnow

logger = logging.getLogger(__name__)

router = APIRouter()

TASK_LOAD_OPTIONS = [
    selectinload(Task.assignee),
    selectinload(Task.reporter),
    selectinload(Task.created_by),
    selectinload(Task.dependencies),
]


async def get_next_task_number(db: AsyncSession, project_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(Task.task_number), 0))
        .where(Task.project_id == project_id)
    )
    return (result.scalar() or 0) + 1


@router.get("/projects/{project_id}/tasks", response_model=list[TaskResponse])
async def list_tasks(
    project_id: UUID,
    status: Optional[str] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    priority: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(Task)
        .options(*TASK_LOAD_OPTIONS)
        .where(Task.project_id == project_id)
    )
    if status:
        query = query.where(Task.status == status)
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)
    if priority:
        query = query.where(Task.priority == priority)
    query = query.order_by(Task.task_number.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/projects/{project_id}/tasks/summary", response_model=TaskSummaryResponse)
async def get_task_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((Task.status == "not_started", 1), else_=0)).label("not_started_count"),
            func.sum(case((Task.status == "in_progress", 1), else_=0)).label("in_progress_count"),
            func.sum(case((Task.status == "completed", 1), else_=0)).label("completed_count"),
            func.sum(case((Task.status == "on_hold", 1), else_=0)).label("on_hold_count"),
            func.sum(case(
                (
                    (Task.due_date < func.current_date()) & (Task.status.notin_(["completed", "cancelled"])),
                    1,
                ),
                else_=0,
            )).label("overdue_count"),
        )
        .where(Task.project_id == project_id)
        .where(Task.status != "cancelled")
    )
    row = result.first()
    return TaskSummaryResponse(
        total=row.total or 0,
        not_started_count=row.not_started_count or 0,
        in_progress_count=row.in_progress_count or 0,
        completed_count=row.completed_count or 0,
        on_hold_count=row.on_hold_count or 0,
        overdue_count=row.overdue_count or 0,
    )


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse)
async def create_task(
    project_id: UUID,
    data: TaskCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task_number = await get_next_task_number(db, project_id)
    task = Task(
        **data.model_dump(),
        project_id=project_id,
        task_number=task_number,
        reporter_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(task)
    await db.flush()

    if task.assignee_id and task.assignee_id != current_user.id:
        try:
            project = await db.get(Project, project_id)
            project_name = project.name if project else ""
            assignee = await db.get(User, task.assignee_id)
            await notify_user(
                db, task.assignee_id, "UPDATE",
                f"Task #{task_number} assigned to you",
                f"You have been assigned a new task: {task.title}",
                entity_type="task", entity_id=task.id,
                email=assignee.email if assignee else None,
                project_name=project_name,
                language=assignee.language or "en" if assignee else "en",
                project_id=project_id,
            )
        except Exception:
            logger.exception("Failed to send task assignment notification")

    result = await db.execute(
        select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task.id)
    )
    return result.scalar_one()


@router.get("/projects/{project_id}/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    project_id: UUID,
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Task)
        .options(*TASK_LOAD_OPTIONS)
        .where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/projects/{project_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: UUID,
    task_id: UUID,
    data: TaskUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(task, key, value)

    if data.status == "completed" and old_status != "completed":
        task.completed_at = utcnow()

    if data.status and data.status != old_status and task.created_by_id and task.created_by_id != current_user.id:
        try:
            project = await db.get(Project, project_id)
            project_name = project.name if project else ""
            creator = await db.get(User, task.created_by_id)
            await notify_user(
                db, task.created_by_id, "UPDATE",
                f"Task #{task.task_number} status changed",
                f"Status changed from {old_status} to {data.status}",
                entity_type="task", entity_id=task.id,
                email=creator.email if creator else None,
                project_name=project_name,
                language=creator.language or "en" if creator else "en",
                project_id=project_id,
            )
        except Exception:
            logger.exception("Failed to send task status change notification")

    result = await db.execute(
        select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task.id)
    )
    return result.scalar_one()


@router.patch("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user, db)

    if task.is_milestone:
        missing_permits = await check_milestone_permit_requirements(db, task)
        if missing_permits:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Cannot complete milestone: missing required permits",
                    "missing_permits": missing_permits,
                }
            )

    old_status = task.status
    task.status = "completed"
    task.completed_at = utcnow()

    if task.created_by_id and task.created_by_id != current_user.id:
        try:
            project = await db.get(Project, task.project_id)
            project_name = project.name if project else ""
            creator = await db.get(User, task.created_by_id)
            await notify_user(
                db, task.created_by_id, "UPDATE",
                f"Task #{task.task_number} completed",
                f"Task {task.title} has been completed",
                entity_type="task", entity_id=task.id,
                email=creator.email if creator else None,
                project_name=project_name,
                language=creator.language or "en" if creator else "en",
                project_id=task.project_id,
            )
        except Exception:
            logger.exception("Failed to send task completion notification")

    result = await db.execute(
        select(Task).options(*TASK_LOAD_OPTIONS).where(Task.id == task.id)
    )
    return result.scalar_one()


@router.delete("/projects/{project_id}/tasks/{task_id}")
async def delete_task(
    project_id: UUID,
    task_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    return {"message": "Task deleted"}


@router.post("/projects/{project_id}/tasks/{task_id}/dependencies", response_model=TaskDependencyResponse)
async def add_dependency(
    project_id: UUID,
    task_id: UUID,
    depends_on_id: UUID = Query(...),
    dependency_type: str = Query(default="finish_to_start"),
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")

    result = await db.execute(
        select(Task).where(Task.id == depends_on_id, Task.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dependency task not found")

    if task_id == depends_on_id:
        raise HTTPException(status_code=400, detail="A task cannot depend on itself")

    existing = await db.execute(
        select(TaskDependency).where(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_id == depends_on_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Dependency already exists")

    dep = TaskDependency(
        task_id=task_id,
        depends_on_id=depends_on_id,
        dependency_type=dependency_type,
    )
    db.add(dep)
    await db.flush()
    await db.refresh(dep)
    return dep


@router.delete("/projects/{project_id}/tasks/{task_id}/dependencies/{dep_id}")
async def remove_dependency(
    project_id: UUID,
    task_id: UUID,
    dep_id: UUID,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")

    result = await db.execute(
        select(TaskDependency).where(
            TaskDependency.id == dep_id,
            TaskDependency.task_id == task_id,
        )
    )
    dep = result.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")

    await db.delete(dep)
    return {"message": "Dependency removed"}


@router.post("/projects/{project_id}/tasks/bulk", response_model=list[TaskResponse])
async def bulk_update_tasks(
    project_id: UUID,
    data: TaskBulkUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(
            Task.id.in_(data.task_ids),
            Task.project_id == project_id,
        )
    )
    tasks = result.scalars().all()

    if len(tasks) != len(data.task_ids):
        raise HTTPException(status_code=404, detail="One or more tasks not found in this project")

    for task in tasks:
        if data.status is not None:
            old_status = task.status
            task.status = data.status
            if data.status == "completed" and old_status != "completed":
                task.completed_at = utcnow()
        if data.assignee_id is not None:
            task.assignee_id = data.assignee_id

    await db.flush()

    result = await db.execute(
        select(Task)
        .options(*TASK_LOAD_OPTIONS)
        .where(Task.id.in_(data.task_ids))
        .order_by(Task.task_number.desc())
    )
    return result.scalars().all()
