from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.checklist import ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate, ChecklistInstance, ChecklistItemResponse
from app.models.user import User
from app.schemas.checklist import (
    ChecklistTemplateCreate, ChecklistTemplateUpdate, ChecklistTemplateResponse,
    ChecklistSubSectionCreate, ChecklistSubSectionUpdate, ChecklistSubSectionResponse,
    ChecklistItemTemplateCreate, ChecklistItemTemplateUpdate, ChecklistItemTemplateResponse,
    ChecklistInstanceCreate, ChecklistInstanceUpdate, ChecklistInstanceResponse,
    ChecklistItemResponseCreate, ChecklistItemResponseUpdate, ChecklistItemResponseResponse
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


@router.get("/checklist-templates", response_model=list[ChecklistTemplateResponse])
async def list_all_checklist_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistTemplate)
        .options(selectinload(ChecklistTemplate.created_by), selectinload(ChecklistTemplate.subsections))
        .order_by(ChecklistTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/checklist-templates", response_model=list[ChecklistTemplateResponse])
async def list_checklist_templates(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistTemplate)
        .options(selectinload(ChecklistTemplate.created_by), selectinload(ChecklistTemplate.subsections))
        .where(ChecklistTemplate.project_id == project_id)
        .order_by(ChecklistTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/checklist-templates", response_model=ChecklistTemplateResponse)
async def create_checklist_template(
    project_id: UUID,
    data: ChecklistTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklist_template = ChecklistTemplate(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(checklist_template)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_template", checklist_template.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(checklist_template))

    await db.refresh(checklist_template, ["created_by", "subsections"])
    return checklist_template


@router.get("/projects/{project_id}/checklist-templates/{template_id}", response_model=ChecklistTemplateResponse)
async def get_checklist_template(project_id: UUID, template_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistTemplate)
        .options(selectinload(ChecklistTemplate.created_by), selectinload(ChecklistTemplate.subsections))
        .where(ChecklistTemplate.id == template_id, ChecklistTemplate.project_id == project_id)
    )
    checklist_template = result.scalar_one_or_none()
    if not checklist_template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    return checklist_template


@router.put("/projects/{project_id}/checklist-templates/{template_id}", response_model=ChecklistTemplateResponse)
async def update_checklist_template(
    project_id: UUID,
    template_id: UUID,
    data: ChecklistTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    checklist_template = result.scalar_one_or_none()
    if not checklist_template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    old_values = get_model_dict(checklist_template)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(checklist_template, key, value)

    await create_audit_log(db, current_user, "checklist_template", checklist_template.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(checklist_template))

    await db.refresh(checklist_template, ["created_by", "subsections"])
    return checklist_template


@router.delete("/projects/{project_id}/checklist-templates/{template_id}")
async def delete_checklist_template(
    project_id: UUID,
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    checklist_template = result.scalar_one_or_none()
    if not checklist_template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    await create_audit_log(db, current_user, "checklist_template", checklist_template.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(checklist_template))

    await db.delete(checklist_template)
    return {"message": "Checklist template deleted"}


@router.post("/checklist-templates/{template_id}/subsections", response_model=ChecklistSubSectionResponse)
async def create_checklist_subsection(
    template_id: UUID,
    data: ChecklistSubSectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify template exists
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    subsection = ChecklistSubSection(**data.model_dump(), template_id=template_id)
    db.add(subsection)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.CREATE,
                          project_id=template.project_id, new_values=get_model_dict(subsection))

    await db.refresh(subsection, ["items"])
    return subsection


@router.get("/checklist-templates/{template_id}/subsections", response_model=list[ChecklistSubSectionResponse])
async def list_checklist_subsections(
    template_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.items))
        .where(ChecklistSubSection.template_id == template_id)
        .order_by(ChecklistSubSection.order)
    )
    return result.scalars().all()


@router.get("/checklist-templates/{template_id}/subsections/{subsection_id}", response_model=ChecklistSubSectionResponse)
async def get_checklist_subsection(
    template_id: UUID,
    subsection_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.items))
        .where(ChecklistSubSection.id == subsection_id, ChecklistSubSection.template_id == template_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")
    return subsection


@router.put("/checklist-templates/{template_id}/subsections/{subsection_id}", response_model=ChecklistSubSectionResponse)
async def update_checklist_subsection(
    template_id: UUID,
    subsection_id: UUID,
    data: ChecklistSubSectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChecklistSubSection)
        .where(ChecklistSubSection.id == subsection_id, ChecklistSubSection.template_id == template_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")

    old_values = get_model_dict(subsection)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(subsection, key, value)

    # Get template for project_id
    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.UPDATE,
                          project_id=template.project_id, old_values=old_values, new_values=get_model_dict(subsection))

    await db.refresh(subsection, ["items"])
    return subsection


@router.delete("/checklist-templates/{template_id}/subsections/{subsection_id}")
async def delete_checklist_subsection(
    template_id: UUID,
    subsection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChecklistSubSection)
        .where(ChecklistSubSection.id == subsection_id, ChecklistSubSection.template_id == template_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")

    # Get template for project_id
    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.DELETE,
                          project_id=template.project_id, old_values=get_model_dict(subsection))

    await db.delete(subsection)
    return {"message": "Checklist subsection deleted"}


@router.post("/subsections/{subsection_id}/items", response_model=ChecklistItemTemplateResponse, status_code=201)
async def create_checklist_item_template(
    subsection_id: UUID,
    data: ChecklistItemTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify subsection exists
    result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")

    item = ChecklistItemTemplate(**data.model_dump(), subsection_id=subsection_id)
    db.add(item)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_item_template", item.id, AuditAction.CREATE,
                          project_id=subsection.template.project_id, new_values=get_model_dict(item))

    await db.refresh(item)
    return item


@router.get("/subsections/{subsection_id}/items", response_model=list[ChecklistItemTemplateResponse])
async def list_checklist_item_templates(
    subsection_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChecklistItemTemplate)
        .where(ChecklistItemTemplate.subsection_id == subsection_id)
        .order_by(ChecklistItemTemplate.created_at)
    )
    return result.scalars().all()


@router.get("/subsections/{subsection_id}/items/{item_id}", response_model=ChecklistItemTemplateResponse)
async def get_checklist_item_template(
    subsection_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChecklistItemTemplate)
        .where(ChecklistItemTemplate.id == item_id, ChecklistItemTemplate.subsection_id == subsection_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item template not found")
    return item


@router.put("/subsections/{subsection_id}/items/{item_id}", response_model=ChecklistItemTemplateResponse)
async def update_checklist_item_template(
    subsection_id: UUID,
    item_id: UUID,
    data: ChecklistItemTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChecklistItemTemplate)
        .where(ChecklistItemTemplate.id == item_id, ChecklistItemTemplate.subsection_id == subsection_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item template not found")

    old_values = get_model_dict(item)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    # Get subsection and template for project_id
    subsection_result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = subsection_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_item_template", item.id, AuditAction.UPDATE,
                          project_id=subsection.template.project_id, old_values=old_values, new_values=get_model_dict(item))

    await db.refresh(item)
    return item


@router.delete("/subsections/{subsection_id}/items/{item_id}")
async def delete_checklist_item_template(
    subsection_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChecklistItemTemplate)
        .where(ChecklistItemTemplate.id == item_id, ChecklistItemTemplate.subsection_id == subsection_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item template not found")

    # Get subsection and template for project_id
    subsection_result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = subsection_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_item_template", item.id, AuditAction.DELETE,
                          project_id=subsection.template.project_id, old_values=get_model_dict(item))

    await db.delete(item)
    return {"message": "Checklist item template deleted"}


@router.get("/checklist-instances", response_model=list[ChecklistInstanceResponse])
async def list_all_checklist_instances(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistInstance)
        .options(selectinload(ChecklistInstance.created_by), selectinload(ChecklistInstance.responses))
        .order_by(ChecklistInstance.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/checklist-instances", response_model=list[ChecklistInstanceResponse])
async def list_checklist_instances(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistInstance)
        .options(selectinload(ChecklistInstance.created_by), selectinload(ChecklistInstance.responses))
        .where(ChecklistInstance.project_id == project_id)
        .order_by(ChecklistInstance.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/checklist-instances", response_model=ChecklistInstanceResponse, status_code=201)
async def create_checklist_instance(
    project_id: UUID,
    data: ChecklistInstanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checklist_instance = ChecklistInstance(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(checklist_instance)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_instance", checklist_instance.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(checklist_instance))

    await db.refresh(checklist_instance, ["created_by", "responses"])
    return checklist_instance


@router.get("/projects/{project_id}/checklist-instances/{instance_id}", response_model=ChecklistInstanceResponse)
async def get_checklist_instance(project_id: UUID, instance_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistInstance)
        .options(selectinload(ChecklistInstance.created_by), selectinload(ChecklistInstance.responses))
        .where(ChecklistInstance.id == instance_id, ChecklistInstance.project_id == project_id)
    )
    checklist_instance = result.scalar_one_or_none()
    if not checklist_instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")
    return checklist_instance


@router.put("/projects/{project_id}/checklist-instances/{instance_id}", response_model=ChecklistInstanceResponse)
async def update_checklist_instance(
    project_id: UUID,
    instance_id: UUID,
    data: ChecklistInstanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    checklist_instance = result.scalar_one_or_none()
    if not checklist_instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")

    old_values = get_model_dict(checklist_instance)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(checklist_instance, key, value)

    await create_audit_log(db, current_user, "checklist_instance", checklist_instance.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(checklist_instance))

    await db.refresh(checklist_instance, ["created_by", "responses"])
    return checklist_instance


@router.delete("/projects/{project_id}/checklist-instances/{instance_id}")
async def delete_checklist_instance(
    project_id: UUID,
    instance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    checklist_instance = result.scalar_one_or_none()
    if not checklist_instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")

    await create_audit_log(db, current_user, "checklist_instance", checklist_instance.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(checklist_instance))

    await db.delete(checklist_instance)
    return {"message": "Checklist instance deleted"}


@router.post("/checklist-instances/{instance_id}/responses", response_model=ChecklistItemResponseResponse, status_code=201)
async def create_checklist_item_response(
    instance_id: UUID,
    data: ChecklistItemResponseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify instance exists
    result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")

    response = ChecklistItemResponse(**data.model_dump(), instance_id=instance_id, completed_by_id=current_user.id)
    db.add(response)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_item_response", response.id, AuditAction.CREATE,
                          project_id=instance.project_id, new_values=get_model_dict(response))

    await db.refresh(response)
    return response


@router.get("/checklist-instances/{instance_id}/responses", response_model=list[ChecklistItemResponseResponse])
async def list_checklist_item_responses(
    instance_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChecklistItemResponse)
        .where(ChecklistItemResponse.instance_id == instance_id)
        .order_by(ChecklistItemResponse.created_at)
    )
    return result.scalars().all()


@router.get("/checklist-instances/{instance_id}/responses/{response_id}", response_model=ChecklistItemResponseResponse)
async def get_checklist_item_response(
    instance_id: UUID,
    response_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChecklistItemResponse)
        .where(ChecklistItemResponse.id == response_id, ChecklistItemResponse.instance_id == instance_id)
    )
    response = result.scalar_one_or_none()
    if not response:
        raise HTTPException(status_code=404, detail="Checklist item response not found")
    return response


@router.put("/checklist-instances/{instance_id}/responses/{response_id}", response_model=ChecklistItemResponseResponse)
async def update_checklist_item_response(
    instance_id: UUID,
    response_id: UUID,
    data: ChecklistItemResponseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChecklistItemResponse)
        .where(ChecklistItemResponse.id == response_id, ChecklistItemResponse.instance_id == instance_id)
    )
    response = result.scalar_one_or_none()
    if not response:
        raise HTTPException(status_code=404, detail="Checklist item response not found")

    old_values = get_model_dict(response)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(response, key, value)

    # Update completed_by if status changes
    if data.status and response.status != data.status:
        response.completed_by_id = current_user.id

    # Get instance for project_id
    instance_result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = instance_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_item_response", response.id, AuditAction.UPDATE,
                          project_id=instance.project_id, old_values=old_values, new_values=get_model_dict(response))

    await db.refresh(response)
    return response


@router.delete("/checklist-instances/{instance_id}/responses/{response_id}")
async def delete_checklist_item_response(
    instance_id: UUID,
    response_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChecklistItemResponse)
        .where(ChecklistItemResponse.id == response_id, ChecklistItemResponse.instance_id == instance_id)
    )
    response = result.scalar_one_or_none()
    if not response:
        raise HTTPException(status_code=404, detail="Checklist item response not found")

    # Get instance for project_id
    instance_result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = instance_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_item_response", response.id, AuditAction.DELETE,
                          project_id=instance.project_id, old_values=get_model_dict(response))

    await db.delete(response)
    return {"message": "Checklist item response deleted"}
