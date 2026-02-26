from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.area import AreaProgress, ConstructionArea
from app.models.audit import AuditAction
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.area import AreaCreate, AreaProgressCreate, AreaProgressResponse, AreaResponse, AreaUpdate
from app.services.area_structure_service import validate_area_hierarchy
from app.services.audit_service import create_audit_log, get_model_dict
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/projects/{project_id}/areas", response_model=list[AreaResponse])
async def list_areas(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ConstructionArea)
        .options(
            selectinload(ConstructionArea.progress_updates).selectinload(AreaProgress.reported_by),
            selectinload(ConstructionArea.children).selectinload(ConstructionArea.progress_updates),
            selectinload(ConstructionArea.children).selectinload(ConstructionArea.children),
        )
        .where(ConstructionArea.project_id == project_id, ConstructionArea.parent_id.is_(None))
        .order_by(ConstructionArea.name)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/areas", response_model=AreaResponse)
async def create_area(
    project_id: UUID,
    data: AreaCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.parent_id:
        parent_result = await db.execute(
            select(ConstructionArea).where(
                ConstructionArea.id == data.parent_id,
                ConstructionArea.project_id == project_id,
            )
        )
        if not parent_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Parent area not found in this project")

    if data.area_level:
        error = await validate_area_hierarchy(db, data.parent_id, data.area_level, project_id)
        if error:
            raise HTTPException(status_code=400, detail=error)

    area = ConstructionArea(**data.model_dump(), project_id=project_id)
    db.add(area)
    await db.flush()

    await create_audit_log(db, current_user, "area", area.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(area))

    await db.refresh(area, ["progress_updates", "children"])
    return area


@router.get("/projects/{project_id}/areas/{area_id}", response_model=AreaResponse)
async def get_area(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ConstructionArea)
        .options(
            selectinload(ConstructionArea.progress_updates).selectinload(AreaProgress.reported_by),
            selectinload(ConstructionArea.children).selectinload(ConstructionArea.progress_updates),
            selectinload(ConstructionArea.children).selectinload(ConstructionArea.children),
        )
        .where(ConstructionArea.id == area_id, ConstructionArea.project_id == project_id)
    )
    area = result.scalar_one_or_none()
    if not area:
        language = get_language_from_request(request)
        error_message = translate_message('resources.area_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return area


@router.put("/projects/{project_id}/areas/{area_id}", response_model=AreaResponse)
async def update_area(
    project_id: UUID,
    area_id: UUID,
    data: AreaUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(ConstructionArea).where(ConstructionArea.id == area_id, ConstructionArea.project_id == project_id)
    )
    area = result.scalar_one_or_none()
    if not area:
        language = get_language_from_request(request)
        error_message = translate_message('resources.area_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    update_data = data.model_dump(exclude_unset=True)
    new_level = update_data.get("area_level", area.area_level)
    if new_level:
        error = await validate_area_hierarchy(db, area.parent_id, new_level, project_id)
        if error:
            raise HTTPException(status_code=400, detail=error)

    old_values = get_model_dict(area)
    for key, value in update_data.items():
        setattr(area, key, value)

    await create_audit_log(db, current_user, "area", area.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(area))

    await db.refresh(area, ["progress_updates", "children"])
    return area


@router.delete("/projects/{project_id}/areas/{area_id}")
async def delete_area(
    project_id: UUID,
    area_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(ConstructionArea).where(ConstructionArea.id == area_id, ConstructionArea.project_id == project_id)
    )
    area = result.scalar_one_or_none()
    if not area:
        language = get_language_from_request(request)
        error_message = translate_message('resources.area_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "area", area.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(area))

    await db.delete(area)
    return {"message": "Area deleted"}


@router.post("/projects/{project_id}/areas/{area_id}/progress", response_model=AreaProgressResponse)
async def add_progress_update(
    project_id: UUID,
    area_id: UUID,
    data: AreaProgressCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(ConstructionArea).where(ConstructionArea.id == area_id, ConstructionArea.project_id == project_id)
    )
    area = result.scalar_one_or_none()
    if not area:
        language = get_language_from_request(request)
        error_message = translate_message('resources.area_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    progress = AreaProgress(
        area_id=area_id,
        reported_by_id=current_user.id,
        progress_percentage=data.progress_percentage,
        notes=data.notes,
        photos=data.photos or []
    )
    db.add(progress)
    area.current_progress = data.progress_percentage
    await db.flush()

    await create_audit_log(
        db, current_user, "area_progress", progress.id, AuditAction.CREATE,
        project_id=project_id,
        new_values={"area_id": str(area_id), "progress_percentage": float(data.progress_percentage)}
    )
    await db.refresh(progress, ["reported_by"])
    return progress


@router.get("/projects/{project_id}/areas/{area_id}/progress", response_model=list[AreaProgressResponse])
async def list_area_progress(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    area_result = await db.execute(
        select(ConstructionArea.id).where(
            ConstructionArea.id == area_id, ConstructionArea.project_id == project_id
        )
    )
    if not area_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Area not found in this project")

    result = await db.execute(
        select(AreaProgress)
        .options(selectinload(AreaProgress.reported_by))
        .where(AreaProgress.area_id == area_id)
        .order_by(AreaProgress.reported_at.desc())
    )
    return result.scalars().all()
