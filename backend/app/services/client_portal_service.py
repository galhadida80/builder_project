from __future__ import annotations

from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.area import ConstructionArea
from app.models.budget import BudgetLineItem, ChangeOrder, CostEntry
from app.models.client_portal_access import ClientPortalAccess
from app.models.discussion import Discussion
from app.models.file import File
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.client_portal import (
    ClientPortalBudgetSummaryResponse,
    ClientPortalDocumentResponse,
    ClientPortalFeedbackCreate,
    ClientPortalFeedbackResponse,
    ClientPortalMilestoneResponse,
    ClientPortalOverviewResponse,
    ClientPortalPhotoResponse,
    ClientPortalProgressResponse,
    ClientPortalProjectResponse,
)
from app.utils import utcnow


async def authenticate_client_portal_access(
    db: AsyncSession,
    email: str,
    access_token: str
) -> Optional[ClientPortalAccess]:
    query = (
        select(ClientPortalAccess)
        .options(selectinload(ClientPortalAccess.user))
        .options(selectinload(ClientPortalAccess.project))
        .join(User)
        .where(
            User.email == email,
            ClientPortalAccess.access_token == access_token,
            ClientPortalAccess.is_active == True
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def update_last_accessed(
    db: AsyncSession,
    access_id: UUID
) -> None:
    query = select(ClientPortalAccess).where(ClientPortalAccess.id == access_id)
    result = await db.execute(query)
    access = result.scalar_one_or_none()
    if access:
        access.last_accessed_at = utcnow()
        await db.commit()


async def get_client_project_overview(
    db: AsyncSession,
    access: ClientPortalAccess
) -> ClientPortalOverviewResponse:
    project_data = await get_project_data(db, access.project_id)
    progress_data = await get_project_progress(db, access.project_id)
    budget_data = None
    if access.can_view_budget and access.project.budget_visible_to_clients:
        budget_data = await get_budget_summary(db, access.project_id)
    recent_photos = await get_recent_photos(db, access.project_id, limit=6)
    upcoming_milestones = await get_upcoming_milestones(db, access.project_id, limit=5)

    return ClientPortalOverviewResponse(
        project=project_data,
        progress=progress_data,
        budget_summary=budget_data,
        recent_photos=recent_photos,
        upcoming_milestones=upcoming_milestones
    )


async def get_project_data(
    db: AsyncSession,
    project_id: UUID
) -> ClientPortalProjectResponse:
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one()

    days_remaining = None
    if project.estimated_end_date:
        today = utcnow().date()
        if project.estimated_end_date >= today:
            days_remaining = (project.estimated_end_date - today).days

    return ClientPortalProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        address=project.address,
        start_date=project.start_date,
        estimated_end_date=project.estimated_end_date,
        status=project.status,
        website=project.website,
        image_url=project.image_url,
        location_lat=project.location_lat,
        location_lng=project.location_lng,
        location_address=project.location_address,
        days_remaining=days_remaining,
        budget_visible_to_clients=project.budget_visible_to_clients,
        milestone_tracking_enabled=project.milestone_tracking_enabled
    )


async def get_project_progress(
    db: AsyncSession,
    project_id: UUID
) -> ClientPortalProgressResponse:
    task_query = select(Task).where(Task.project_id == project_id)
    result = await db.execute(task_query)
    tasks = result.scalars().all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "completed")
    in_progress_tasks = sum(1 for t in tasks if t.status == "in_progress")
    completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    milestone_tasks = [t for t in tasks if t.priority == "high"]
    total_milestones = len(milestone_tasks)
    completed_milestones = sum(1 for t in milestone_tasks if t.status == "completed")
    upcoming_milestones = sum(
        1 for t in milestone_tasks
        if t.status != "completed" and t.due_date and t.due_date >= utcnow().date()
    )

    on_track = True
    if total_tasks > 0:
        overdue_tasks = sum(
            1 for t in tasks
            if t.status != "completed" and t.due_date and t.due_date < utcnow().date()
        )
        on_track = overdue_tasks == 0

    return ClientPortalProgressResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        completion_percentage=round(completion_percentage, 2),
        total_milestones=total_milestones,
        completed_milestones=completed_milestones,
        upcoming_milestones=upcoming_milestones,
        on_track=on_track,
        last_updated=utcnow()
    )


async def get_budget_summary(
    db: AsyncSession,
    project_id: UUID
) -> ClientPortalBudgetSummaryResponse:
    budget_query = select(BudgetLineItem).where(BudgetLineItem.project_id == project_id)
    budget_result = await db.execute(budget_query)
    budget_items = budget_result.scalars().all()

    total_budgeted = sum(item.budgeted_amount for item in budget_items)

    cost_query = (
        select(func.sum(CostEntry.amount))
        .where(CostEntry.project_id == project_id)
    )
    cost_result = await db.execute(cost_query)
    total_actual = cost_result.scalar() or Decimal(0)

    total_variance = total_budgeted - total_actual
    variance_percentage = 0.0
    if total_budgeted > 0:
        variance_percentage = float((total_variance / total_budgeted) * 100)

    change_order_query = (
        select(ChangeOrder)
        .where(
            ChangeOrder.project_id == project_id,
            ChangeOrder.status == "approved"
        )
    )
    co_result = await db.execute(change_order_query)
    change_orders = co_result.scalars().all()

    approved_change_orders = len(change_orders)
    total_change_order_amount = sum(co.amount for co in change_orders)

    return ClientPortalBudgetSummaryResponse(
        total_budgeted=total_budgeted,
        total_actual=total_actual,
        total_variance=total_variance,
        variance_percentage=round(variance_percentage, 2),
        approved_change_orders=approved_change_orders,
        total_change_order_amount=total_change_order_amount
    )


async def get_recent_photos(
    db: AsyncSession,
    project_id: UUID,
    limit: int = 10
) -> list[ClientPortalPhotoResponse]:
    query = (
        select(File)
        .where(
            File.project_id == project_id,
            File.file_type.in_(["image/jpeg", "image/png", "image/jpg", "image/webp"])
        )
        .order_by(File.uploaded_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    files = result.scalars().all()

    area_ids = [f.entity_id for f in files if f.entity_type == "area"]
    area_map = {}
    if area_ids:
        area_query = select(ConstructionArea).where(ConstructionArea.id.in_(area_ids))
        area_result = await db.execute(area_query)
        areas = area_result.scalars().all()
        area_map = {area.id: area for area in areas}

    photos = []
    for file in files:
        area_name = None
        floor_number = None
        if file.entity_type == "area" and file.entity_id in area_map:
            area = area_map[file.entity_id]
            area_name = area.name
            floor_number = area.floor_number

        photos.append(ClientPortalPhotoResponse(
            id=file.id,
            filename=file.filename,
            file_type=file.file_type,
            file_size=file.file_size,
            storage_path=file.storage_path,
            uploaded_at=file.uploaded_at,
            entity_type=file.entity_type,
            entity_id=file.entity_id,
            area_name=area_name,
            floor_number=floor_number
        ))

    return photos


async def get_client_documents(
    db: AsyncSession,
    project_id: UUID,
    limit: int = 20
) -> list[ClientPortalDocumentResponse]:
    document_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]

    query = (
        select(File)
        .where(
            File.project_id == project_id,
            File.file_type.in_(document_types)
        )
        .order_by(File.uploaded_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    files = result.scalars().all()

    documents = []
    for file in files:
        category = None
        if file.entity_type == "rfi":
            category = "RFI"
        elif file.entity_type == "inspection":
            category = "Inspection"
        elif file.entity_type == "approval":
            category = "Approval"
        elif file.entity_type == "project":
            category = "General"

        documents.append(ClientPortalDocumentResponse(
            id=file.id,
            filename=file.filename,
            file_type=file.file_type,
            file_size=file.file_size,
            storage_path=file.storage_path,
            uploaded_at=file.uploaded_at,
            entity_type=file.entity_type,
            category=category
        ))

    return documents


async def get_upcoming_milestones(
    db: AsyncSession,
    project_id: UUID,
    limit: int = 5
) -> list[ClientPortalMilestoneResponse]:
    today = utcnow().date()

    query = (
        select(Task)
        .where(
            Task.project_id == project_id,
            Task.priority == "high",
            Task.status != "completed"
        )
        .order_by(Task.due_date.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    tasks = result.scalars().all()

    milestones = []
    for task in tasks:
        is_overdue = task.due_date and task.due_date < today
        completion_percentage = 0.0
        if task.status == "in_progress":
            completion_percentage = 50.0

        milestones.append(ClientPortalMilestoneResponse(
            id=task.id,
            title=task.title,
            description=task.description,
            target_date=task.due_date,
            completed_at=task.completed_at,
            status=task.status,
            completion_percentage=completion_percentage,
            is_overdue=is_overdue
        ))

    return milestones


async def create_client_feedback(
    db: AsyncSession,
    access: ClientPortalAccess,
    feedback_data: ClientPortalFeedbackCreate
) -> ClientPortalFeedbackResponse:
    entity_id = feedback_data.entity_id or access.project_id
    entity_type = feedback_data.entity_type or "project"

    discussion = Discussion(
        project_id=access.project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        author_id=access.user_id,
        content=f"**{feedback_data.subject}**\n\n{feedback_data.content}"
    )
    db.add(discussion)
    await db.commit()
    await db.refresh(discussion)

    query = select(User).where(User.id == access.user_id)
    result = await db.execute(query)
    user = result.scalar_one()

    return ClientPortalFeedbackResponse(
        id=discussion.id,
        subject=feedback_data.subject,
        content=feedback_data.content,
        entity_type=entity_type,
        entity_id=entity_id,
        submitted_by=user.full_name or user.email,
        submitted_at=discussion.created_at,
        status="pending"
    )
