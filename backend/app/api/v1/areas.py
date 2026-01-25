from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.area import ConstructionArea, AreaProgress
from app.models.user import User
from app.schemas.area import AreaCreate, AreaUpdate, AreaResponse, AreaProgressCreate, AreaProgressResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


@router.get("/projects/{project_id}/areas", response_model=list[AreaResponse])
async def list_areas(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConstructionArea)
        .options(
            selectinload(ConstructionArea.progress_updates).selectinload(AreaProgress.reported_by),
            selectinload(ConstructionArea.children)
        )
        .where(ConstructionArea.project_id == project_id, ConstructionArea.parent_id.is_(None))
        .order_by(ConstructionArea.name)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/areas", response_model=AreaResponse)
async def create_area(
    project_id: UUID,
    data: AreaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    area = ConstructionArea(**data.model_dump(), project_id=project_id)
    db.add(area)
    await db.flush()

    await create_audit_log(db, current_user, "area", area.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(area))

    await db.refresh(area, ["progress_updates", "children"])
    return area


@router.get("/projects/{project_id}/areas/{area_id}", response_model=AreaResponse)
async def get_area(project_id: UUID, area_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConstructionArea)
        .options(
            selectinload(ConstructionArea.progress_updates).selectinload(AreaProgress.reported_by),
            selectinload(ConstructionArea.children)
        )
        .where(ConstructionArea.id == area_id, ConstructionArea.project_id == project_id)
    )
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    return area


@router.put("/projects/{project_id}/areas/{area_id}", response_model=AreaResponse)
async def update_area(
    project_id: UUID,
    area_id: UUID,
    data: AreaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConstructionArea).where(ConstructionArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    old_values = get_model_dict(area)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(area, key, value)

    await create_audit_log(db, current_user, "area", area.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(area))

    await db.refresh(area, ["progress_updates", "children"])
    return area


@router.delete("/projects/{project_id}/areas/{area_id}")
async def delete_area(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConstructionArea).where(ConstructionArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    await create_audit_log(db, current_user, "area", area.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(area))

    await db.delete(area)
    return {"message": "Area deleted"}


@router.post("/projects/{project_id}/areas/{area_id}/progress", response_model=AreaProgressResponse)
async def add_progress_update(
    project_id: UUID,
    area_id: UUID,
    data: AreaProgressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConstructionArea).where(ConstructionArea.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")

    progress = AreaProgress(
        area_id=area_id,
        reported_by_id=current_user.id,
        progress_percentage=data.progress_percentage,
        notes=data.notes,
        photos=data.photos or []
    )
    db.add(progress)

    area.current_progress = data.progress_percentage

    await create_audit_log(
        db, current_user, "area_progress", progress.id, AuditAction.CREATE,
        project_id=project_id,
        new_values={"area_id": str(area_id), "progress_percentage": data.progress_percentage}
    )

    await db.flush()
    await db.refresh(progress, ["reported_by"])
    return progress


@router.get("/projects/{project_id}/areas/{area_id}/progress", response_model=list[AreaProgressResponse])
async def list_area_progress(
    project_id: UUID,
    area_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AreaProgress)
        .options(selectinload(AreaProgress.reported_by))
        .where(AreaProgress.area_id == area_id)
        .order_by(AreaProgress.reported_at.desc())
    )
    return result.scalars().all()
