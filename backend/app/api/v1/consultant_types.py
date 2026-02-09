from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.equipment_template import ConsultantType
from app.models.consultant_assignment import ConsultantAssignment
from app.models.inspection_template import InspectionStageTemplate
from app.models.user import User
from app.schemas.equipment_template import ConsultantTypeCreate, ConsultantTypeUpdate, ConsultantTypeResponse
from app.schemas.inspection_template import (
    InspectionStageTemplateCreate, InspectionStageTemplateUpdate, InspectionStageTemplateResponse
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


@router.get("/consultant-types", response_model=list[ConsultantTypeResponse])
async def list_consultant_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConsultantType)
        .order_by(ConsultantType.name)
    )
    return result.scalars().all()


@router.post("/consultant-types", response_model=ConsultantTypeResponse, status_code=201)
async def create_consultant_type(
    data: ConsultantTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    consultant_type = ConsultantType(**data.model_dump())
    db.add(consultant_type)
    await db.flush()

    await create_audit_log(db, current_user, "consultant_type", consultant_type.id, AuditAction.CREATE,
                          new_values=get_model_dict(consultant_type))

    await db.refresh(consultant_type)
    return consultant_type


@router.get("/consultant-types/{consultant_type_id}", response_model=ConsultantTypeResponse)
async def get_consultant_type(consultant_type_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConsultantType)
        .where(ConsultantType.id == consultant_type_id)
    )
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")
    return consultant_type


@router.put("/consultant-types/{consultant_type_id}", response_model=ConsultantTypeResponse)
async def update_consultant_type(
    consultant_type_id: UUID,
    data: ConsultantTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConsultantType).where(ConsultantType.id == consultant_type_id))
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")

    old_values = get_model_dict(consultant_type)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(consultant_type, key, value)

    await create_audit_log(db, current_user, "consultant_type", consultant_type.id, AuditAction.UPDATE,
                          old_values=old_values, new_values=get_model_dict(consultant_type))

    await db.refresh(consultant_type)
    return consultant_type


@router.delete("/consultant-types/{consultant_type_id}")
async def delete_consultant_type(
    consultant_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ConsultantType).where(ConsultantType.id == consultant_type_id))
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")

    await create_audit_log(db, current_user, "consultant_type", consultant_type.id, AuditAction.DELETE,
                          old_values=get_model_dict(consultant_type))

    await db.delete(consultant_type)
    return {"message": "Consultant type deleted"}


@router.get("/consultant-types/{consultant_type_id}/templates", response_model=list[InspectionStageTemplateResponse])
async def list_templates(
    consultant_type_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(InspectionStageTemplate)
        .where(InspectionStageTemplate.consultant_type_id == consultant_type_id)
        .order_by(InspectionStageTemplate.version.desc())
    )
    return result.scalars().all()


@router.post("/consultant-types/{consultant_type_id}/templates", response_model=InspectionStageTemplateResponse, status_code=201)
async def create_template(
    consultant_type_id: UUID,
    data: InspectionStageTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify consultant type exists
    result = await db.execute(select(ConsultantType).where(ConsultantType.id == consultant_type_id))
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")

    template = InspectionStageTemplate(**data.model_dump())
    db.add(template)
    await db.flush()

    await create_audit_log(db, current_user, "inspection_stage_template", template.id, AuditAction.CREATE,
                          new_values=get_model_dict(template))

    await db.refresh(template)
    return template


@router.get("/consultant-types/{consultant_type_id}/templates/{template_id}", response_model=InspectionStageTemplateResponse)
async def get_template(
    consultant_type_id: UUID,
    template_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(InspectionStageTemplate)
        .where(
            InspectionStageTemplate.id == template_id,
            InspectionStageTemplate.consultant_type_id == consultant_type_id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/consultant-types/{consultant_type_id}/templates/{template_id}", response_model=InspectionStageTemplateResponse)
async def update_template(
    consultant_type_id: UUID,
    template_id: UUID,
    data: InspectionStageTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(InspectionStageTemplate)
        .where(
            InspectionStageTemplate.id == template_id,
            InspectionStageTemplate.consultant_type_id == consultant_type_id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    old_values = get_model_dict(template)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(template, key, value)

    await create_audit_log(db, current_user, "inspection_stage_template", template.id, AuditAction.UPDATE,
                          old_values=old_values, new_values=get_model_dict(template))

    await db.refresh(template)
    return template


@router.delete("/consultant-types/{consultant_type_id}/templates/{template_id}")
async def delete_template(
    consultant_type_id: UUID,
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(InspectionStageTemplate)
        .where(
            InspectionStageTemplate.id == template_id,
            InspectionStageTemplate.consultant_type_id == consultant_type_id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await create_audit_log(db, current_user, "inspection_stage_template", template.id, AuditAction.DELETE,
                          old_values=get_model_dict(template))

    await db.delete(template)
    return {"message": "Template deleted"}


@router.get("/projects/{project_id}/consultant-assignments")
async def list_project_consultant_assignments(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ConsultantAssignment)
        .options(
            selectinload(ConsultantAssignment.consultant),
            selectinload(ConsultantAssignment.consultant_type),
        )
        .where(
            ConsultantAssignment.project_id == project_id,
            ConsultantAssignment.status.in_(["active", "pending"]),
        )
        .order_by(ConsultantAssignment.created_at.desc())
    )
    assignments = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "consultant_id": str(a.consultant_id),
            "consultant_type_id": str(a.consultant_type_id) if a.consultant_type_id else None,
            "consultant_name": a.consultant.full_name if a.consultant else None,
            "consultant_email": a.consultant.email if a.consultant else None,
            "consultant_type_name": a.consultant_type.name if a.consultant_type else None,
            "consultant_type_name_he": a.consultant_type.name_he if a.consultant_type else None,
            "status": a.status,
        }
        for a in assignments
    ]
