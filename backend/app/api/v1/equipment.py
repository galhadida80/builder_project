from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.audit import AuditAction
from app.models.equipment import ApprovalStatus, Equipment, EquipmentChecklist
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.approval import SubmitForApprovalRequest
from app.schemas.equipment import (
    ChecklistCreate,
    ChecklistResponse,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/equipment", response_model=list[EquipmentResponse])
async def list_all_equipment(
    project_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_project_ids = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
    query = select(Equipment).options(
        selectinload(Equipment.created_by), selectinload(Equipment.checklists)
    ).where(Equipment.project_id.in_(user_project_ids))
    if project_id:
        query = query.where(Equipment.project_id == project_id)
    result = await db.execute(query.order_by(Equipment.created_at.desc()))
    return result.scalars().all()


@router.get("/projects/{project_id}/equipment", response_model=list[EquipmentResponse])
async def list_equipment(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Equipment)
        .options(selectinload(Equipment.created_by), selectinload(Equipment.checklists))
        .where(Equipment.project_id == project_id)
        .order_by(Equipment.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/equipment", response_model=EquipmentResponse)
async def create_equipment(
    project_id: UUID,
    data: EquipmentCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    equipment = Equipment(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(equipment)
    await db.flush()

    await create_audit_log(db, current_user, "equipment", equipment.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(equipment))

    await db.refresh(equipment, ["created_by", "checklists"])
    return equipment


@router.get("/projects/{project_id}/equipment/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    project_id: UUID,
    equipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Equipment)
        .options(selectinload(Equipment.created_by), selectinload(Equipment.checklists))
        .where(Equipment.id == equipment_id, Equipment.project_id == project_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        language = get_language_from_request(request)
        error_message = translate_message('resources.equipment_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return equipment


@router.put("/projects/{project_id}/equipment/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    project_id: UUID,
    equipment_id: UUID,
    data: EquipmentUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id, Equipment.project_id == project_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        language = get_language_from_request(request)
        error_message = translate_message('resources.equipment_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    old_values = get_model_dict(equipment)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(equipment, key, value)

    await create_audit_log(db, current_user, "equipment", equipment.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(equipment))

    await db.refresh(equipment, ["created_by", "checklists"])
    return equipment


@router.delete("/projects/{project_id}/equipment/{equipment_id}")
async def delete_equipment(
    project_id: UUID,
    equipment_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id, Equipment.project_id == project_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        language = get_language_from_request(request)
        error_message = translate_message('resources.equipment_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "equipment", equipment.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(equipment))

    await db.delete(equipment)
    return {"message": "Equipment deleted"}


@router.post("/projects/{project_id}/equipment/{equipment_id}/submit", response_model=EquipmentResponse)
async def submit_equipment_for_approval(
    project_id: UUID,
    equipment_id: UUID,
    body: SubmitForApprovalRequest = SubmitForApprovalRequest(),
    member: ProjectMember = require_permission(Permission.APPROVE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id, Equipment.project_id == project_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        language = get_language_from_request(request)
        error_message = translate_message('resources.equipment_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    old_status = equipment.status
    equipment.status = ApprovalStatus.SUBMITTED.value

    approval_request = ApprovalRequest(
        project_id=project_id,
        entity_type="equipment",
        entity_id=equipment_id,
        current_status=ApprovalStatus.SUBMITTED.value,
        created_by_id=current_user.id
    )
    db.add(approval_request)
    await db.flush()

    step1 = ApprovalStep(
        approval_request_id=approval_request.id, step_order=1,
        approver_role="consultant", contact_id=body.consultant_contact_id
    )
    step2 = ApprovalStep(
        approval_request_id=approval_request.id, step_order=2,
        approver_role="inspector", contact_id=body.inspector_contact_id
    )
    db.add_all([step1, step2])

    await create_audit_log(db, current_user, "equipment", equipment.id, AuditAction.STATUS_CHANGE,
                          project_id=project_id, old_values={"status": old_status},
                          new_values={"status": equipment.status})

    await db.refresh(equipment, ["created_by", "checklists"])
    return equipment


@router.post("/projects/{project_id}/equipment/{equipment_id}/checklists", response_model=ChecklistResponse)
async def create_checklist(
    project_id: UUID,
    equipment_id: UUID,
    data: ChecklistCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    checklist = EquipmentChecklist(
        equipment_id=equipment_id,
        checklist_name=data.checklist_name,
        items=[item.model_dump() for item in data.items]
    )
    db.add(checklist)
    await db.flush()
    await db.refresh(checklist)
    return checklist
