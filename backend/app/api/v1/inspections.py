from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.inspection import InspectionConsultantType, InspectionStage
from app.models.user import User
from app.schemas.inspection import (
    InspectionConsultantTypeCreate,
    InspectionConsultantTypeResponse,
    InspectionStageCreate,
    InspectionStageResponse
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
