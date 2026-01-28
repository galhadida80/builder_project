from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.inspection import InspectionConsultantType, InspectionStage, Inspection, Finding, InspectionStatus
from app.models.user import User
from app.schemas.inspection import (
    InspectionConsultantTypeCreate,
    InspectionConsultantTypeResponse,
    InspectionStageCreate,
    InspectionStageResponse,
    InspectionCreate,
    InspectionUpdate,
    InspectionResponse,
    InspectionSummaryResponse
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


# Admin Template Endpoints

@router.get("/inspection-consultant-types", response_model=list[InspectionConsultantTypeResponse])
async def list_consultant_types(db: AsyncSession = Depends(get_db)):
    """List all inspection consultant types with their stages"""
    result = await db.execute(
        select(InspectionConsultantType)
        .options(selectinload(InspectionConsultantType.stages))
        .order_by(InspectionConsultantType.name)
    )
    return result.scalars().all()


@router.post("/inspection-consultant-types", response_model=InspectionConsultantTypeResponse)
async def create_consultant_type(
    data: InspectionConsultantTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new inspection consultant type"""
    consultant_type = InspectionConsultantType(**data.model_dump())
    db.add(consultant_type)
    await db.flush()

    await create_audit_log(
        db, current_user, "inspection_consultant_type", consultant_type.id,
        AuditAction.CREATE, new_values=get_model_dict(consultant_type)
    )

    await db.refresh(consultant_type, ["stages"])
    return consultant_type


@router.get("/inspection-consultant-types/{consultant_type_id}", response_model=InspectionConsultantTypeResponse)
async def get_consultant_type(
    consultant_type_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific consultant type with all its stages"""
    result = await db.execute(
        select(InspectionConsultantType)
        .options(selectinload(InspectionConsultantType.stages))
        .where(InspectionConsultantType.id == consultant_type_id)
    )
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")
    return consultant_type


@router.post("/inspection-consultant-types/{consultant_type_id}/stages", response_model=InspectionStageResponse)
async def add_stage_to_consultant_type(
    consultant_type_id: UUID,
    data: InspectionStageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a stage template to a consultant type"""
    # Verify consultant type exists
    result = await db.execute(
        select(InspectionConsultantType)
        .where(InspectionConsultantType.id == consultant_type_id)
    )
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")

    # Create the stage
    stage = InspectionStage(
        **data.model_dump(),
        consultant_type_id=consultant_type_id
    )
    db.add(stage)
    await db.flush()

    await create_audit_log(
        db, current_user, "inspection_stage", stage.id,
        AuditAction.CREATE, new_values=get_model_dict(stage)
    )

    await db.refresh(stage)
    return stage


# Project Inspection Endpoints

@router.get("/projects/{project_id}/inspections", response_model=list[InspectionResponse])
async def list_inspections(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all inspections for a project"""
    result = await db.execute(
        select(Inspection)
        .options(
            selectinload(Inspection.created_by),
            selectinload(Inspection.consultant_type).selectinload(InspectionConsultantType.stages),
            selectinload(Inspection.findings)
        )
        .where(Inspection.project_id == project_id)
        .order_by(Inspection.scheduled_date.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/inspections", response_model=InspectionResponse)
async def create_inspection(
    project_id: UUID,
    data: InspectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new inspection for a project"""
    inspection = Inspection(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(inspection)
    await db.flush()

    await create_audit_log(db, current_user, "inspection", inspection.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(inspection))

    await db.refresh(inspection, ["created_by", "consultant_type", "findings"])
    return inspection


@router.get("/projects/{project_id}/inspections/summary", response_model=InspectionSummaryResponse)
async def get_inspection_summary(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get dashboard summary of inspection progress and findings"""
    # Get inspection counts by status
    status_result = await db.execute(
        select(
            func.count().label('total'),
            func.sum(case((Inspection.status == InspectionStatus.PENDING.value, 1), else_=0)).label('pending'),
            func.sum(case((Inspection.status == InspectionStatus.IN_PROGRESS.value, 1), else_=0)).label('in_progress'),
            func.sum(case((Inspection.status == InspectionStatus.COMPLETED.value, 1), else_=0)).label('completed'),
            func.sum(case((Inspection.status == InspectionStatus.FAILED.value, 1), else_=0)).label('failed'),
            func.sum(case((
                (Inspection.scheduled_date < datetime.utcnow()) &
                (Inspection.status != InspectionStatus.COMPLETED.value), 1
            ), else_=0)).label('overdue')
        )
        .where(Inspection.project_id == project_id)
    )
    status_counts = status_result.first()

    # Get findings grouped by severity
    findings_result = await db.execute(
        select(Finding.severity, func.count(Finding.id).label('count'))
        .join(Inspection, Finding.inspection_id == Inspection.id)
        .where(Inspection.project_id == project_id)
        .group_by(Finding.severity)
    )

    findings_by_severity = {row.severity: row.count for row in findings_result.all()}

    return InspectionSummaryResponse(
        total_inspections=status_counts.total or 0,
        pending_count=status_counts.pending or 0,
        in_progress_count=status_counts.in_progress or 0,
        completed_count=status_counts.completed or 0,
        failed_count=status_counts.failed or 0,
        findings_by_severity=findings_by_severity,
        overdue_count=status_counts.overdue or 0
    )


@router.get("/projects/{project_id}/inspections/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(project_id: UUID, inspection_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific inspection"""
    result = await db.execute(
        select(Inspection)
        .options(
            selectinload(Inspection.created_by),
            selectinload(Inspection.consultant_type).selectinload(InspectionConsultantType.stages),
            selectinload(Inspection.findings)
        )
        .where(Inspection.id == inspection_id, Inspection.project_id == project_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


@router.put("/projects/{project_id}/inspections/{inspection_id}", response_model=InspectionResponse)
async def update_inspection(
    project_id: UUID,
    inspection_id: UUID,
    data: InspectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an inspection"""
    result = await db.execute(select(Inspection).where(Inspection.id == inspection_id))
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    old_values = get_model_dict(inspection)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(inspection, key, value)

    await create_audit_log(db, current_user, "inspection", inspection.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(inspection))

    await db.refresh(inspection, ["created_by", "consultant_type", "findings"])
    return inspection


@router.delete("/projects/{project_id}/inspections/{inspection_id}")
async def delete_inspection(
    project_id: UUID,
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an inspection"""
    result = await db.execute(select(Inspection).where(Inspection.id == inspection_id))
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    await create_audit_log(db, current_user, "inspection", inspection.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(inspection))

    await db.delete(inspection)
    return {"message": "Inspection deleted"}
