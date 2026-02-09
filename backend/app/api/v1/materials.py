from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.material import Material, ApprovalStatus
from app.models.user import User
from app.models.approval import ApprovalRequest, ApprovalStep
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user, verify_project_access
from app.models.project import ProjectMember
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/materials", response_model=list[MaterialResponse])
async def list_all_materials(
    project_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_project_ids = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
    query = select(Material).options(
        selectinload(Material.created_by)
    ).where(Material.project_id.in_(user_project_ids))
    if project_id:
        query = query.where(Material.project_id == project_id)
    result = await db.execute(query.order_by(Material.created_at.desc()))
    return result.scalars().all()


@router.get("/projects/{project_id}/materials", response_model=list[MaterialResponse])
async def list_materials(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Material)
        .options(selectinload(Material.created_by))
        .where(Material.project_id == project_id)
        .order_by(Material.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    project_id: UUID,
    data: MaterialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
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

    await create_audit_log(db, current_user, "material", material.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(material))

    await db.refresh(material, ["created_by"])
    return material


@router.delete("/projects/{project_id}/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    project_id: UUID,
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
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
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/projects/{project_id}/materials/{material_id}/submit", response_model=MaterialResponse)
async def submit_material_for_approval(
    project_id: UUID,
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Material).where(Material.id == material_id, Material.project_id == project_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        language = get_language_from_request(request)
        error_message = translate_message('resources.material_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

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

    step1 = ApprovalStep(approval_request_id=approval_request.id, step_order=1, approver_role="consultant")
    step2 = ApprovalStep(approval_request_id=approval_request.id, step_order=2, approver_role="inspector")
    db.add_all([step1, step2])

    await create_audit_log(db, current_user, "material", material.id, AuditAction.STATUS_CHANGE,
                          project_id=project_id, old_values={"status": old_status},
                          new_values={"status": material.status})

    await db.refresh(material, ["created_by"])
    return material
