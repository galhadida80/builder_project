from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.inspection import ProjectInspection, InspectionResult, ConsultantType
from app.models.user import User
from app.schemas.inspection import (
    ProjectInspectionCreate,
    ProjectInspectionUpdate,
    ProjectInspectionResponse,
    InspectionResultCreate,
    InspectionResultResponse
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


@router.get("/projects/{project_id}/inspections", response_model=list[ProjectInspectionResponse])
async def list_inspections(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProjectInspection)
        .options(
            selectinload(ProjectInspection.consultant_type),
            selectinload(ProjectInspection.results)
        )
        .where(ProjectInspection.project_id == project_id)
        .order_by(ProjectInspection.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/inspections", response_model=ProjectInspectionResponse)
async def create_inspection(
    project_id: UUID,
    data: ProjectInspectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = ProjectInspection(**data.model_dump(), project_id=project_id)
    db.add(inspection)
    await db.flush()

    await create_audit_log(db, current_user, "inspection", inspection.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(inspection))

    await db.refresh(inspection, ["consultant_type", "results"])
    return inspection


@router.get("/projects/{project_id}/inspections/{inspection_id}", response_model=ProjectInspectionResponse)
async def get_inspection(project_id: UUID, inspection_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProjectInspection)
        .options(
            selectinload(ProjectInspection.consultant_type),
            selectinload(ProjectInspection.results)
        )
        .where(ProjectInspection.id == inspection_id, ProjectInspection.project_id == project_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


@router.put("/projects/{project_id}/inspections/{inspection_id}", response_model=ProjectInspectionResponse)
async def update_inspection(
    project_id: UUID,
    inspection_id: UUID,
    data: ProjectInspectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ProjectInspection).where(ProjectInspection.id == inspection_id))
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    old_values = get_model_dict(inspection)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(inspection, key, value)

    await create_audit_log(db, current_user, "inspection", inspection.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(inspection))

    await db.refresh(inspection, ["consultant_type", "results"])
    return inspection


@router.delete("/projects/{project_id}/inspections/{inspection_id}")
async def delete_inspection(
    project_id: UUID,
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ProjectInspection).where(ProjectInspection.id == inspection_id))
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    await create_audit_log(db, current_user, "inspection", inspection.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(inspection))

    await db.delete(inspection)
    return {"message": "Inspection deleted"}


@router.post("/projects/{project_id}/inspections/{inspection_id}/results", response_model=InspectionResultResponse)
async def create_inspection_result(
    project_id: UUID,
    inspection_id: UUID,
    data: InspectionResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ProjectInspection).where(ProjectInspection.id == inspection_id))
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    inspection_result = InspectionResult(
        inspection_id=inspection_id,
        **data.model_dump()
    )
    db.add(inspection_result)

    await create_audit_log(
        db, current_user, "inspection_result", inspection_result.id, AuditAction.CREATE,
        project_id=project_id,
        new_values={"inspection_id": str(inspection_id), "stage_number": data.stage_number}
    )

    await db.flush()
    await db.refresh(inspection_result)
    return inspection_result


@router.get("/projects/{project_id}/inspections/{inspection_id}/results", response_model=list[InspectionResultResponse])
async def list_inspection_results(
    project_id: UUID,
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(InspectionResult)
        .where(InspectionResult.inspection_id == inspection_id)
        .order_by(InspectionResult.stage_number)
    )
    return result.scalars().all()
