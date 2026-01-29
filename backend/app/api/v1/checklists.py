from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.checklist import ChecklistTemplate
from app.models.user import User
from app.schemas.checklist import ChecklistTemplateCreate, ChecklistTemplateUpdate, ChecklistTemplateResponse
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
