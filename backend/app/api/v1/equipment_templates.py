from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.equipment_template import EquipmentTemplate
from app.models.equipment_submission import EquipmentSubmission
from app.models.user import User
from app.schemas.equipment_template import EquipmentTemplateCreate, EquipmentTemplateUpdate, EquipmentTemplateResponse
from app.schemas.equipment_submission import EquipmentSubmissionCreate, EquipmentSubmissionUpdate, EquipmentSubmissionResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user, get_current_admin_user

router = APIRouter()


@router.get("/equipment-templates", response_model=list[EquipmentTemplateResponse])
async def list_equipment_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EquipmentTemplate)
        .options(selectinload(EquipmentTemplate.created_by))
        .order_by(EquipmentTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.post("/equipment-templates", response_model=EquipmentTemplateResponse)
async def create_equipment_template(
    data: EquipmentTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    template = EquipmentTemplate(**data.model_dump(), created_by_id=current_user.id)
    db.add(template)
    await db.flush()

    await create_audit_log(db, current_user, "equipment_template", template.id, AuditAction.CREATE,
                          new_values=get_model_dict(template))

    await db.refresh(template, ["created_by"])
    return template


@router.get("/equipment-templates/{template_id}", response_model=EquipmentTemplateResponse)
async def get_equipment_template(template_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EquipmentTemplate)
        .options(selectinload(EquipmentTemplate.created_by))
        .where(EquipmentTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Equipment template not found")
    return template


@router.put("/equipment-templates/{template_id}", response_model=EquipmentTemplateResponse)
async def update_equipment_template(
    template_id: UUID,
    data: EquipmentTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(EquipmentTemplate).where(EquipmentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Equipment template not found")

    old_values = get_model_dict(template)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(template, key, value)

    await create_audit_log(db, current_user, "equipment_template", template.id, AuditAction.UPDATE,
                          old_values=old_values, new_values=get_model_dict(template))

    await db.refresh(template, ["created_by"])
    return template


@router.delete("/equipment-templates/{template_id}")
async def delete_equipment_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = await db.execute(select(EquipmentTemplate).where(EquipmentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Equipment template not found")

    await create_audit_log(db, current_user, "equipment_template", template.id, AuditAction.DELETE,
                          old_values=get_model_dict(template))

    await db.delete(template)
    return {"message": "Equipment template deleted"}


@router.get("/projects/{project_id}/equipment-submissions", response_model=list[EquipmentSubmissionResponse])
async def list_equipment_submissions(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EquipmentSubmission)
        .options(selectinload(EquipmentSubmission.created_by))
        .where(EquipmentSubmission.project_id == project_id)
        .order_by(EquipmentSubmission.created_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/equipment-submissions", response_model=EquipmentSubmissionResponse)
async def create_equipment_submission(
    project_id: UUID,
    data: EquipmentSubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    submission = EquipmentSubmission(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(submission)
    await db.flush()

    await create_audit_log(db, current_user, "equipment_submission", submission.id, AuditAction.CREATE,
                          project_id=project_id, new_values=get_model_dict(submission))

    await db.refresh(submission, ["created_by"])
    return submission


@router.get("/projects/{project_id}/equipment-submissions/{submission_id}", response_model=EquipmentSubmissionResponse)
async def get_equipment_submission(project_id: UUID, submission_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EquipmentSubmission)
        .options(selectinload(EquipmentSubmission.created_by))
        .where(EquipmentSubmission.id == submission_id, EquipmentSubmission.project_id == project_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Equipment submission not found")
    return submission


@router.put("/projects/{project_id}/equipment-submissions/{submission_id}", response_model=EquipmentSubmissionResponse)
async def update_equipment_submission(
    project_id: UUID,
    submission_id: UUID,
    data: EquipmentSubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EquipmentSubmission).where(EquipmentSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Equipment submission not found")

    old_values = get_model_dict(submission)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(submission, key, value)

    await create_audit_log(db, current_user, "equipment_submission", submission.id, AuditAction.UPDATE,
                          project_id=project_id, old_values=old_values, new_values=get_model_dict(submission))

    await db.refresh(submission, ["created_by"])
    return submission


@router.delete("/projects/{project_id}/equipment-submissions/{submission_id}")
async def delete_equipment_submission(
    project_id: UUID,
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(EquipmentSubmission).where(EquipmentSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Equipment submission not found")

    await create_audit_log(db, current_user, "equipment_submission", submission.id, AuditAction.DELETE,
                          project_id=project_id, old_values=get_model_dict(submission))

    await db.delete(submission)
    return {"message": "Equipment submission deleted"}
