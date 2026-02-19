from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.audit import AuditAction
from app.models.contact import Contact
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
    PaginatedEquipmentResponse,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import notify_contact
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/equipment", response_model=list[EquipmentResponse])
async def list_all_equipment(
    project_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_project_ids = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
    query = select(Equipment).options(
        selectinload(Equipment.created_by), selectinload(Equipment.checklists)
    ).where(Equipment.project_id.in_(user_project_ids))
    if project_id:
        query = query.where(Equipment.project_id == project_id)
    if status:
        valid_statuses = {s.value for s in ApprovalStatus}
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        query = query.where(Equipment.status == status)
    result = await db.execute(query.order_by(Equipment.created_at.desc()).limit(limit).offset(offset))
    return result.scalars().all()


@router.get("/projects/{project_id}/equipment", response_model=PaginatedEquipmentResponse)
async def list_equipment(
    project_id: UUID,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    base_filter = Equipment.project_id == project_id
    if status:
        base_filter = and_(base_filter, Equipment.status == status)
    if search:
        escaped = search.replace("%", "\\%").replace("_", "\\_")
        search_filter = f"%{escaped}%"
        base_filter = and_(
            base_filter,
            or_(
                Equipment.name.ilike(search_filter),
                Equipment.equipment_type.ilike(search_filter),
                Equipment.manufacturer.ilike(search_filter),
                Equipment.model_number.ilike(search_filter),
                Equipment.serial_number.ilike(search_filter),
            ),
        )

    count_result = await db.execute(
        select(func.count(Equipment.id)).where(base_filter)
    )
    total = count_result.scalar()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Equipment)
        .options(selectinload(Equipment.created_by), selectinload(Equipment.checklists))
        .where(base_filter)
        .order_by(Equipment.created_at.desc())
        .limit(page_size)
        .offset(offset)
    )
    equipment_list = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedEquipmentResponse(
        items=equipment_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


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
    language = get_language_from_request(request)
    msg = "ציוד נמחק בהצלחה" if language == "he" else "Equipment deleted"
    return {"message": msg}


@router.post("/projects/{project_id}/equipment/{equipment_id}/submit", response_model=EquipmentResponse)
async def submit_equipment_for_approval(
    project_id: UUID,
    equipment_id: UUID,
    body: SubmitForApprovalRequest,
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

    if equipment.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft equipment can be submitted")

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

    steps = []
    if body.consultant_contact_id:
        steps.append(ApprovalStep(
            approval_request_id=approval_request.id, step_order=1,
            approver_role="consultant", contact_id=body.consultant_contact_id
        ))
    if body.inspector_contact_id:
        steps.append(ApprovalStep(
            approval_request_id=approval_request.id, step_order=len(steps) + 1,
            approver_role="inspector", contact_id=body.inspector_contact_id
        ))
    if steps:
        db.add_all(steps)

    if body.consultant_contact_id:
        consultant_result = await db.execute(select(Contact).where(Contact.id == body.consultant_contact_id))
        consultant = consultant_result.scalar_one_or_none()
    else:
        consultant = None
    if body.inspector_contact_id:
        inspector_result = await db.execute(select(Contact).where(Contact.id == body.inspector_contact_id))
        inspector = inspector_result.scalar_one_or_none()
    else:
        inspector = None
    if consultant:
        language = get_language_from_request(request)
        if language == "he":
            notif_title = f"ציוד ממתין לאישורך: {equipment.name}"
            notif_body = f"ציוד '{equipment.name}' הוגש ודורש את בדיקתך."
        else:
            notif_title = f"Equipment awaiting your approval: {equipment.name}"
            notif_body = f"Equipment '{equipment.name}' has been submitted and requires your review."
        await notify_contact(
            db, consultant, "approval",
            notif_title, notif_body,
            entity_type="equipment", entity_id=equipment.id,
        )
    if inspector:
        language = get_language_from_request(request)
        if language == "he":
            notif_title = f"ציוד ממתין לבדיקתך: {equipment.name}"
            notif_body = f"ציוד '{equipment.name}' הוגש ודורש את בדיקתך."
        else:
            notif_title = f"Equipment awaiting your inspection: {equipment.name}"
            notif_body = f"Equipment '{equipment.name}' has been submitted and requires your inspection."
        await notify_contact(
            db, inspector, "approval",
            notif_title, notif_body,
            entity_type="equipment", entity_id=equipment.id,
        )

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
    eq_result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id, Equipment.project_id == project_id)
    )
    if not eq_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Equipment not found in this project")

    checklist = EquipmentChecklist(
        equipment_id=equipment_id,
        checklist_name=data.checklist_name,
        items=[item.model_dump() for item in data.items]
    )
    db.add(checklist)
    await db.flush()
    await db.refresh(checklist)
    return checklist
