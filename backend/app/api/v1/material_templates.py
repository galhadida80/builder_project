from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.material_template import MaterialTemplate, MaterialTemplateConsultant
from app.models.equipment_template import ConsultantType
from app.models.user import User
from app.schemas.material_template import (
    MaterialTemplateCreate, MaterialTemplateUpdate,
    MaterialTemplateResponse, MaterialTemplateWithConsultantsResponse
)
from app.schemas.equipment_template import ConsultantTypeResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user, get_current_admin_user

router = APIRouter()


@router.get("/material-templates", response_model=list[MaterialTemplateWithConsultantsResponse])
async def list_material_templates(
    category: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(MaterialTemplate).options(
        selectinload(MaterialTemplate.approving_consultants)
        .selectinload(MaterialTemplateConsultant.consultant_type)
    ).order_by(MaterialTemplate.name_he)
    if category:
        query = query.where(MaterialTemplate.category == category)
    if is_active is not None:
        query = query.where(MaterialTemplate.is_active == is_active)
    result = await db.execute(query)
    templates = result.scalars().all()
    response = []
    for tpl in templates:
        base = MaterialTemplateResponse.model_validate(tpl)
        consultants = [
            ConsultantTypeResponse.model_validate(tc.consultant_type)
            for tc in tpl.approving_consultants
            if tc.consultant_type
        ]
        data = MaterialTemplateWithConsultantsResponse(
            **base.model_dump(),
            approving_consultants=consultants,
        )
        response.append(data)
    return response


@router.post("/material-templates", response_model=MaterialTemplateResponse, status_code=201)
async def create_material_template(
    data: MaterialTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    template = MaterialTemplate(**data.model_dump())
    db.add(template)
    await db.flush()
    await create_audit_log(db, current_user, "material_template", template.id, AuditAction.CREATE,
                          new_values=get_model_dict(template))
    await db.refresh(template)
    return template


@router.get("/material-templates/{template_id}", response_model=MaterialTemplateResponse)
async def get_material_template(template_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MaterialTemplate).where(MaterialTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Material template not found")
    return template


@router.put("/material-templates/{template_id}", response_model=MaterialTemplateResponse)
async def update_material_template(
    template_id: UUID,
    data: MaterialTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(MaterialTemplate).where(MaterialTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Material template not found")
    old_values = get_model_dict(template)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(template, key, value)
    await create_audit_log(db, current_user, "material_template", template.id, AuditAction.UPDATE,
                          old_values=old_values, new_values=get_model_dict(template))
    await db.flush()
    await db.refresh(template)
    return template


@router.delete("/material-templates/{template_id}")
async def delete_material_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(MaterialTemplate).where(MaterialTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Material template not found")
    await create_audit_log(db, current_user, "material_template", template.id, AuditAction.DELETE,
                          old_values=get_model_dict(template))
    await db.delete(template)
    await db.commit()
    return {"message": "Material template deleted"}


@router.post("/material-templates/{template_id}/consultants/{consultant_type_id}", status_code=201)
async def add_consultant_to_template(
    template_id: UUID,
    consultant_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(MaterialTemplate).where(MaterialTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Material template not found")
    result = await db.execute(select(ConsultantType).where(ConsultantType.id == consultant_type_id))
    consultant_type = result.scalar_one_or_none()
    if not consultant_type:
        raise HTTPException(status_code=404, detail="Consultant type not found")
    result = await db.execute(
        select(MaterialTemplateConsultant).where(
            MaterialTemplateConsultant.template_id == template_id,
            MaterialTemplateConsultant.consultant_type_id == consultant_type_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Consultant already assigned to template")
    link = MaterialTemplateConsultant(template_id=template_id, consultant_type_id=consultant_type_id)
    db.add(link)
    await db.commit()
    return {"message": "Consultant added to template"}


@router.delete("/material-templates/{template_id}/consultants/{consultant_type_id}")
async def remove_consultant_from_template(
    template_id: UUID,
    consultant_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(
        select(MaterialTemplateConsultant).where(
            MaterialTemplateConsultant.template_id == template_id,
            MaterialTemplateConsultant.consultant_type_id == consultant_type_id
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Consultant not assigned to template")
    await db.delete(link)
    await db.commit()
    return {"message": "Consultant removed from template"}
