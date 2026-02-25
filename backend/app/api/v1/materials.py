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
from app.models.material import ApprovalStatus, Material
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.approval import SubmitForApprovalRequest
from app.schemas.material import MaterialCreate, MaterialResponse, MaterialUpdate, PaginatedMaterialResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.entity_version_service import create_version
from app.services.notification_service import notify_contact
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/materials", response_model=list[MaterialResponse])
async def list_all_materials(
    project_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_statuses = {"draft", "submitted", "under_review", "approved", "rejected", "revision_requested"}
    if status and status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {sorted(valid_statuses)}")
    user_project_ids = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
    query = select(Material).options(
        selectinload(Material.created_by)
    ).where(Material.project_id.in_(user_project_ids))
    if project_id:
        query = query.where(Material.project_id == project_id)
    if status:
        query = query.where(Material.status == status)
    result = await db.execute(query.order_by(Material.created_at.desc()).limit(limit).offset(offset))
    return result.scalars().all()


@router.get("/projects/{project_id}/materials", response_model=PaginatedMaterialResponse)
async def list_materials(
    project_id: UUID,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    base_filter = Material.project_id == project_id
    if status:
        base_filter = and_(base_filter, Material.status == status)
    if search:
        escaped = search.replace("%", "\\%").replace("_", "\\_")
        search_filter = f"%{escaped}%"
        base_filter = and_(
            base_filter,
            or_(
                Material.name.ilike(search_filter),
                Material.material_type.ilike(search_filter),
                Material.manufacturer.ilike(search_filter),
                Material.model_number.ilike(search_filter),
                Material.storage_location.ilike(search_filter),
            ),
        )

    count_result = await db.execute(
        select(func.count()).select_from(Material).where(base_filter)
    )
    total = count_result.scalar()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.created_by))
        .where(base_filter)
        .order_by(Material.created_at.desc())
        .limit(page_size)
        .offset(offset)
    )
    materials = result.scalars().all()
    total_pages = (total + page_size - 1) // page_size

    return PaginatedMaterialResponse(
        items=materials,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/projects/{project_id}/materials", response_model=MaterialResponse)
async def create_material(
    project_id: UUID,
    data: MaterialCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = Material(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(material)
    await db.flush()

    await create_audit_log(db, current_user, "material", material.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(material))

    await db.refresh(material, ["created_by"])
    return material


@router.get("/projects/{project_id}/materials/{material_id}", response_model=MaterialResponse)
async def get_material(
    project_id: UUID,
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.created_by))
        .where(Material.id == material_id, Material.project_id == project_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        language = get_language_from_request(request)
        error_message = translate_message('resources.material_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return material


@router.put("/projects/{project_id}/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    project_id: UUID,
    material_id: UUID,
    data: MaterialUpdate,
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.project_id == project_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        language = get_language_from_request(request)
        error_message = translate_message('resources.material_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    old_values = get_model_dict(material)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(material, key, value)

    await create_version(db, project_id, "material", material_id, old_values, get_model_dict(material), current_user.id)

    await create_audit_log(db, current_user, "material", material.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(material))

    await db.refresh(material, ["created_by"])
    return material


@router.delete("/projects/{project_id}/materials/{material_id}")
async def delete_material(
    project_id: UUID,
    material_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.project_id == project_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        language = get_language_from_request(request)
        error_message = translate_message('resources.material_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    await create_audit_log(db, current_user, "material", material.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(material))

    await db.delete(material)
    language = get_language_from_request(request)
    msg = "חומר נמחק בהצלחה" if language == "he" else "Material deleted"
    return {"message": msg}


@router.post("/projects/{project_id}/materials/{material_id}/submit", response_model=MaterialResponse)
async def submit_material_for_approval(
    project_id: UUID,
    material_id: UUID,
    body: SubmitForApprovalRequest,
    member: ProjectMember = require_permission(Permission.APPROVE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.project_id == project_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        language = get_language_from_request(request)
        error_message = translate_message('resources.material_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    if material.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft materials can be submitted")

    old_status = material.status
    material.status = ApprovalStatus.SUBMITTED.value

    approval_request = ApprovalRequest(
        project_id=project_id,
        entity_type="material",
        entity_id=material_id,
        current_status=ApprovalStatus.SUBMITTED.value,
        created_by_id=current_user.id
    )
    db.add(approval_request)
    await db.flush()

    consultant = None
    inspector = None
    if body.consultant_contact_id:
        consultant_result = await db.execute(
            select(Contact).where(Contact.id == body.consultant_contact_id, Contact.project_id == project_id)
        )
        consultant = consultant_result.scalar_one_or_none()
        if not consultant:
            raise HTTPException(status_code=400, detail="Consultant contact not found in this project")
    if body.inspector_contact_id:
        inspector_result = await db.execute(
            select(Contact).where(Contact.id == body.inspector_contact_id, Contact.project_id == project_id)
        )
        inspector = inspector_result.scalar_one_or_none()
        if not inspector:
            raise HTTPException(status_code=400, detail="Inspector contact not found in this project")

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
    if consultant:
        language = get_language_from_request(request)
        if language == "he":
            notif_title = f"חומר ממתין לאישורך: {material.name}"
            notif_body = f"חומר '{material.name}' הוגש ודורש את בדיקתך."
        else:
            notif_title = f"Material awaiting your approval: {material.name}"
            notif_body = f"Material '{material.name}' has been submitted and requires your review."
        await notify_contact(
            db, consultant, "approval",
            notif_title, notif_body,
            entity_type="material", entity_id=material.id,
        )
    if inspector:
        language = get_language_from_request(request)
        if language == "he":
            notif_title = f"חומר ממתין לבדיקתך: {material.name}"
            notif_body = f"חומר '{material.name}' הוגש ודורש את בדיקתך."
        else:
            notif_title = f"Material awaiting your inspection: {material.name}"
            notif_body = f"Material '{material.name}' has been submitted and requires your inspection."
        await notify_contact(
            db, inspector, "approval",
            notif_title, notif_body,
            entity_type="material", entity_id=material.id,
        )

    await create_audit_log(db, current_user, "material", material.id, AuditAction.STATUS_CHANGE,
                          project_id=project_id, old_values={"status": old_status},
                          new_values={"status": material.status})

    await db.refresh(material, ["created_by"])
    return material
