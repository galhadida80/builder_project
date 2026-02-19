from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, check_permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.checklist import (
    ChecklistInstance,
    ChecklistItemResponse,
    ChecklistItemTemplate,
    ChecklistSubSection,
    ChecklistTemplate,
)
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.checklist import (
    ChecklistInstanceCreate,
    ChecklistInstanceResponse,
    ChecklistInstanceUpdate,
    ChecklistItemResponseCreate,
    ChecklistItemResponseResponse,
    ChecklistItemResponseUpdate,
    ChecklistItemTemplateCreate,
    ChecklistItemTemplateResponse,
    ChecklistItemTemplateUpdate,
    ChecklistSubSectionCreate,
    ChecklistSubSectionResponse,
    ChecklistSubSectionUpdate,
    ChecklistTemplateCreate,
    ChecklistTemplateResponse,
    ChecklistTemplateUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import notify_project_admins, notify_user

router = APIRouter()


@router.get("/checklist-templates", response_model=list[ChecklistTemplateResponse])
async def list_all_checklist_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChecklistTemplate)
        .options(
            selectinload(ChecklistTemplate.created_by),
            selectinload(ChecklistTemplate.subsections).selectinload(ChecklistSubSection.items),
        )
        .order_by(ChecklistTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/checklist-templates", response_model=list[ChecklistTemplateResponse])
async def list_checklist_templates(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ChecklistTemplate)
        .options(
            selectinload(ChecklistTemplate.created_by),
            selectinload(ChecklistTemplate.subsections).selectinload(ChecklistSubSection.items),
        )
        .where(or_(ChecklistTemplate.project_id == project_id, ChecklistTemplate.project_id.is_(None)))
        .order_by(ChecklistTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/checklist-templates", response_model=ChecklistTemplateResponse)
async def create_checklist_template(
    project_id: UUID,
    data: ChecklistTemplateCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dump = data.model_dump()
    if "metadata" in dump:
        dump["extra_data"] = dump.pop("metadata")
    checklist_template = ChecklistTemplate(**dump, project_id=project_id, created_by_id=current_user.id)
    db.add(checklist_template)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_template", checklist_template.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(checklist_template))

    await db.refresh(checklist_template, ["created_by", "subsections"])
    return checklist_template


@router.get("/projects/{project_id}/checklist-templates/{template_id}", response_model=ChecklistTemplateResponse)
async def get_checklist_template(
    project_id: UUID,
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(ChecklistTemplate)
        .options(
            selectinload(ChecklistTemplate.created_by),
            selectinload(ChecklistTemplate.subsections).selectinload(ChecklistSubSection.items),
        )
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
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    checklist_template = result.scalar_one_or_none()
    if not checklist_template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    old_values = get_model_dict(checklist_template)
    for key, value in data.model_dump(exclude_unset=True).items():
        attr = "extra_data" if key == "metadata" else key
        setattr(checklist_template, attr, value)

    await create_audit_log(db, current_user, "checklist_template", checklist_template.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(checklist_template))

    await db.refresh(checklist_template, ["created_by", "subsections"])
    return checklist_template


@router.delete("/projects/{project_id}/checklist-templates/{template_id}")
async def delete_checklist_template(
    project_id: UUID,
    template_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
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
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    await check_permission(Permission.CREATE, template.project_id, current_user.id, db)

    dump = data.model_dump()
    if "metadata" in dump:
        dump["extra_data"] = dump.pop("metadata")
    subsection = ChecklistSubSection(**dump, template_id=template_id)
    db.add(subsection)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.CREATE,
                          project_id=template.project_id, new_values=get_model_dict(subsection))

    await db.refresh(subsection, ["items"])
    return subsection


@router.get("/checklist-templates/{template_id}/subsections", response_model=list[ChecklistSubSectionResponse])
async def list_checklist_subsections(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    await verify_project_access(template.project_id, current_user, db)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    await verify_project_access(template.project_id, current_user, db)

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

    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one()

    await check_permission(Permission.EDIT, template.project_id, current_user.id, db)

    old_values = get_model_dict(subsection)

    for key, value in data.model_dump(exclude_unset=True).items():
        attr = "extra_data" if key == "metadata" else key
        setattr(subsection, attr, value)

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

    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one()

    await check_permission(Permission.DELETE, template.project_id, current_user.id, db)

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
    result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")

    await check_permission(Permission.CREATE, subsection.template.project_id, current_user.id, db)

    dump = data.model_dump()
    if "metadata" in dump:
        dump["extra_data"] = dump.pop("metadata")
    item = ChecklistItemTemplate(**dump, subsection_id=subsection_id)
    db.add(item)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_item_template", item.id, AuditAction.CREATE,
                          project_id=subsection.template.project_id, new_values=get_model_dict(item))

    await db.refresh(item)
    return item


@router.get("/subsections/{subsection_id}/items", response_model=list[ChecklistItemTemplateResponse])
async def list_checklist_item_templates(
    subsection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub_result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = sub_result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")
    await verify_project_access(subsection.template.project_id, current_user, db)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub_result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = sub_result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")
    await verify_project_access(subsection.template.project_id, current_user, db)

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
        attr = "extra_data" if key == "metadata" else key
        setattr(item, attr, value)

    subsection_result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = subsection_result.scalar_one()

    await check_permission(Permission.EDIT, subsection.template.project_id, current_user.id, db)

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

    subsection_result = await db.execute(
        select(ChecklistSubSection)
        .options(selectinload(ChecklistSubSection.template))
        .where(ChecklistSubSection.id == subsection_id)
    )
    subsection = subsection_result.scalar_one()

    await check_permission(Permission.DELETE, subsection.template.project_id, current_user.id, db)

    await create_audit_log(db, current_user, "checklist_item_template", item.id, AuditAction.DELETE,
                          project_id=subsection.template.project_id, old_values=get_model_dict(item))

    await db.delete(item)
    return {"message": "Checklist item template deleted"}


@router.get("/checklist-instances", response_model=list[ChecklistInstanceResponse])
async def list_all_checklist_instances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChecklistInstance)
        .options(selectinload(ChecklistInstance.created_by), selectinload(ChecklistInstance.responses))
        .order_by(ChecklistInstance.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/checklist-instances", response_model=list[ChecklistInstanceResponse])
async def list_checklist_instances(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
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
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dump = data.model_dump()
    if "metadata" in dump:
        dump["extra_data"] = dump.pop("metadata")
    checklist_instance = ChecklistInstance(**dump, project_id=project_id, created_by_id=current_user.id)
    db.add(checklist_instance)
    await db.flush()

    await create_audit_log(db, current_user, "checklist_instance", checklist_instance.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(checklist_instance))

    await db.refresh(checklist_instance, ["created_by", "responses"])
    return checklist_instance


@router.get("/projects/{project_id}/checklist-instances/{instance_id}", response_model=ChecklistInstanceResponse)
async def get_checklist_instance(
    project_id: UUID,
    instance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
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
    member: ProjectMember = require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    checklist_instance = result.scalar_one_or_none()
    if not checklist_instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")

    old_values = get_model_dict(checklist_instance)
    for key, value in data.model_dump(exclude_unset=True).items():
        attr = "extra_data" if key == "metadata" else key
        setattr(checklist_instance, attr, value)

    if data.status == "completed" and old_values.get("status") != "completed":
        await notify_project_admins(
            db, project_id, "update",
            f"Checklist completed: {checklist_instance.unit_identifier}",
            f"Checklist '{checklist_instance.unit_identifier}' has been marked as completed.",
            entity_type="checklist_instance", entity_id=checklist_instance.id,
        )

    await create_audit_log(db, current_user, "checklist_instance", checklist_instance.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(checklist_instance))

    await db.refresh(checklist_instance, ["created_by", "responses"])
    return checklist_instance


@router.delete("/projects/{project_id}/checklist-instances/{instance_id}")
async def delete_checklist_instance(
    project_id: UUID,
    instance_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
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
    result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")

    await check_permission(Permission.CREATE, instance.project_id, current_user.id, db)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    instance_result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = instance_result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")
    await verify_project_access(instance.project_id, current_user, db)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    instance_result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = instance_result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Checklist instance not found")
    await verify_project_access(instance.project_id, current_user, db)

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
    old_status = response.status

    instance_result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = instance_result.scalar_one()

    await check_permission(Permission.EDIT, instance.project_id, current_user.id, db)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(response, key, value)

    if data.status and data.status != old_status:
        response.completed_by_id = current_user.id

    if data.status == "rejected" and old_status != "rejected" and instance.created_by_id:
        creator_result = await db.execute(select(User).where(User.id == instance.created_by_id))
        creator = creator_result.scalar_one_or_none()
        if creator:
            await notify_user(
                db, creator.id, "update",
                f"Checklist item rejected: {instance.unit_identifier}",
                f"A checklist item in '{instance.unit_identifier}' has been rejected.",
                entity_type="checklist_instance", entity_id=instance.id,
                email=creator.email, language=creator.language or "en",
            )

    await create_audit_log(db, current_user, "checklist_item_response", response.id, AuditAction.UPDATE,
                          project_id=instance.project_id, old_values=old_values, new_values=get_model_dict(response))

    await db.flush()
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

    instance_result = await db.execute(select(ChecklistInstance).where(ChecklistInstance.id == instance_id))
    instance = instance_result.scalar_one()

    await check_permission(Permission.DELETE, instance.project_id, current_user.id, db)

    await create_audit_log(db, current_user, "checklist_item_response", response.id, AuditAction.DELETE,
                          project_id=instance.project_id, old_values=get_model_dict(response))

    await db.delete(response)
    return {"message": "Checklist item response deleted"}
