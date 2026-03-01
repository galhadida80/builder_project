from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.area import ConstructionArea
from app.models.audit import AuditAction
from app.models.contact import Contact
from app.models.near_miss import NearMiss
from app.models.project import Project
from app.models.user import User
from app.schemas.near_miss import NearMissCreate, NearMissResponse, NearMissUpdate
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import notify_contact, notify_project_admins
from app.utils import utcnow

router = APIRouter()

NEAR_MISS_LOAD_OPTIONS = [
    selectinload(NearMiss.area),
    selectinload(NearMiss.reported_by),
    selectinload(NearMiss.created_by),
]


async def get_next_near_miss_number(db: AsyncSession, project_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(NearMiss.near_miss_number), 0))
        .where(NearMiss.project_id == project_id)
    )
    current_max = result.scalar() or 0
    project_result = await db.execute(
        select(Project).where(Project.id == project_id).with_for_update()
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return current_max + 1


@router.get("/projects/{project_id}/near-misses", response_model=list[NearMissResponse])
async def list_near_misses(
    project_id: UUID,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_anonymous: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    base_query = select(NearMiss).where(NearMiss.project_id == project_id)
    if status:
        base_query = base_query.where(NearMiss.status == status)
    if severity:
        base_query = base_query.where(NearMiss.severity == severity)
    if is_anonymous is not None:
        base_query = base_query.where(NearMiss.is_anonymous == is_anonymous)
    if search:
        search_filter = f"%{search}%"
        base_query = base_query.where(
            or_(
                NearMiss.title.ilike(search_filter),
                NearMiss.description.ilike(search_filter),
                func.cast(NearMiss.near_miss_number, String).ilike(search_filter),
            )
        )
    query = base_query.options(*NEAR_MISS_LOAD_OPTIONS).order_by(NearMiss.near_miss_number.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/projects/{project_id}/near-misses", response_model=NearMissResponse, status_code=201)
async def create_near_miss(
    project_id: UUID,
    near_miss_in: NearMissCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = require_permission(Permission.CREATE),
):
    await verify_project_access(project_id, current_user, db)
    if near_miss_in.area_id:
        area = await db.get(ConstructionArea, near_miss_in.area_id)
        if not area or area.project_id != project_id:
            raise HTTPException(status_code=404, detail="Area not found in this project")
    if near_miss_in.reported_by_id and not near_miss_in.is_anonymous:
        reported_by = await db.get(Contact, near_miss_in.reported_by_id)
        if not reported_by:
            raise HTTPException(status_code=404, detail="Contact not found")
    if near_miss_in.is_anonymous:
        near_miss_in.reported_by_id = None
    near_miss_number = await get_next_near_miss_number(db, project_id)
    near_miss = NearMiss(
        project_id=project_id,
        near_miss_number=near_miss_number,
        title=near_miss_in.title,
        description=near_miss_in.description,
        severity=near_miss_in.severity,
        potential_consequence=near_miss_in.potential_consequence,
        occurred_at=near_miss_in.occurred_at,
        location=near_miss_in.location,
        area_id=near_miss_in.area_id,
        photos=near_miss_in.photos or [],
        is_anonymous=near_miss_in.is_anonymous,
        reported_by_id=near_miss_in.reported_by_id,
        preventive_actions=near_miss_in.preventive_actions,
        status="open",
        created_by_id=current_user.id,
    )
    db.add(near_miss)
    await db.flush()
    await db.refresh(near_miss, attribute_names=["area", "reported_by", "created_by"])
    await create_audit_log(
        db=db, user_id=current_user.id, project_id=project_id, action=AuditAction.CREATE,
        entity_type="NearMiss", entity_id=near_miss.id, new_values=get_model_dict(near_miss),
    )
    await notify_project_admins(
        db=db, project_id=project_id, title="New Near-Miss Report",
        message=f"Near-miss #{near_miss_number}: {near_miss.title}",
        entity_type="near_miss", entity_id=near_miss.id, exclude_user_id=current_user.id,
    )
    if not near_miss.is_anonymous and near_miss.reported_by_id:
        await notify_contact(
            db=db, contact_id=near_miss.reported_by_id, title="Near-Miss Report Received",
            message=f"Your near-miss report #{near_miss_number} has been received and logged.",
        )
    await db.commit()
    return near_miss


@router.get("/projects/{project_id}/near-misses/{near_miss_id}", response_model=NearMissResponse)
async def get_near_miss(
    project_id: UUID,
    near_miss_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(NearMiss)
        .options(*NEAR_MISS_LOAD_OPTIONS)
        .where(NearMiss.id == near_miss_id, NearMiss.project_id == project_id)
    )
    result = await db.execute(query)
    near_miss = result.scalar_one_or_none()
    if not near_miss:
        raise HTTPException(status_code=404, detail="Near-miss not found")
    return near_miss


@router.put("/projects/{project_id}/near-misses/{near_miss_id}", response_model=NearMissResponse)
async def update_near_miss(
    project_id: UUID,
    near_miss_id: UUID,
    near_miss_in: NearMissUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = require_permission(Permission.EDIT),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(NearMiss)
        .options(*NEAR_MISS_LOAD_OPTIONS)
        .where(NearMiss.id == near_miss_id, NearMiss.project_id == project_id)
    )
    result = await db.execute(query)
    near_miss = result.scalar_one_or_none()
    if not near_miss:
        raise HTTPException(status_code=404, detail="Near-miss not found")
    old_values = get_model_dict(near_miss)
    if near_miss_in.area_id is not None:
        area = await db.get(ConstructionArea, near_miss_in.area_id)
        if not area or area.project_id != project_id:
            raise HTTPException(status_code=404, detail="Area not found in this project")
    if near_miss_in.reported_by_id is not None:
        reported_by = await db.get(Contact, near_miss_in.reported_by_id)
        if not reported_by:
            raise HTTPException(status_code=404, detail="Contact not found")
    update_data = near_miss_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(near_miss, field, value)
    near_miss.updated_at = utcnow()
    await db.flush()
    await db.refresh(near_miss, attribute_names=["area", "reported_by", "created_by"])
    await create_audit_log(
        db=db, user_id=current_user.id, project_id=project_id, action=AuditAction.UPDATE,
        entity_type="NearMiss", entity_id=near_miss.id, old_values=old_values,
        new_values=get_model_dict(near_miss),
    )
    await db.commit()
    return near_miss


@router.delete("/projects/{project_id}/near-misses/{near_miss_id}", status_code=204)
async def delete_near_miss(
    project_id: UUID,
    near_miss_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = require_permission(Permission.DELETE),
):
    await verify_project_access(project_id, current_user, db)
    query = select(NearMiss).where(NearMiss.id == near_miss_id, NearMiss.project_id == project_id)
    result = await db.execute(query)
    near_miss = result.scalar_one_or_none()
    if not near_miss:
        raise HTTPException(status_code=404, detail="Near-miss not found")
    await create_audit_log(
        db=db, user_id=current_user.id, project_id=project_id, action=AuditAction.DELETE,
        entity_type="NearMiss", entity_id=near_miss.id, old_values=get_model_dict(near_miss),
    )
    await db.delete(near_miss)
    await db.commit()


@router.get("/projects/{project_id}/near-misses/summary/stats")
async def get_near_miss_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    status_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((NearMiss.status == "open", 1), else_=0)).label("open_count"),
            func.sum(case((NearMiss.status == "in_progress", 1), else_=0)).label("in_progress_count"),
            func.sum(case((NearMiss.status == "resolved", 1), else_=0)).label("resolved_count"),
            func.sum(case((NearMiss.status == "closed", 1), else_=0)).label("closed_count"),
            func.sum(case((NearMiss.severity == "high", 1), else_=0)).label("high_count"),
            func.sum(case((NearMiss.severity == "medium", 1), else_=0)).label("medium_count"),
            func.sum(case((NearMiss.severity == "low", 1), else_=0)).label("low_count"),
            func.sum(case((NearMiss.is_anonymous == True, 1), else_=0)).label("anonymous_count"),
        ).where(NearMiss.project_id == project_id)
    )
    row = status_result.first()
    return {
        "total": row.total or 0,
        "openCount": row.open_count or 0,
        "inProgressCount": row.in_progress_count or 0,
        "resolvedCount": row.resolved_count or 0,
        "closedCount": row.closed_count or 0,
        "highCount": row.high_count or 0,
        "mediumCount": row.medium_count or 0,
        "lowCount": row.low_count or 0,
        "anonymousCount": row.anonymous_count or 0,
    }
