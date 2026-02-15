from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.contact import Contact
from app.models.defect import Defect, DefectAssignee
from app.models.project import Project
from app.models.user import User
from app.schemas.defect import (
    DefectCreate,
    DefectResponse,
    DefectSummaryResponse,
    DefectUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.defect_report_service import generate_defects_report_pdf
from app.services.notification_service import (
    notify_contact,
    notify_project_admins,
    notify_user,
)
from app.services.storage_service import StorageBackend, get_storage_backend

router = APIRouter()

DEFECT_LOAD_OPTIONS = [
    selectinload(Defect.area),
    selectinload(Defect.reporter),
    selectinload(Defect.assigned_contact),
    selectinload(Defect.followup_contact),
    selectinload(Defect.created_by),
    selectinload(Defect.assignees).selectinload(DefectAssignee.contact),
]


async def get_next_defect_number(db: AsyncSession, project_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(Defect.defect_number), 0))
        .where(Defect.project_id == project_id)
    )
    return (result.scalar() or 0) + 1


@router.get("/projects/{project_id}/defects", response_model=list[DefectResponse])
async def list_defects(
    project_id: UUID,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(Defect)
        .options(*DEFECT_LOAD_OPTIONS)
        .where(Defect.project_id == project_id)
    )
    if status:
        query = query.where(Defect.status == status)
    if category:
        query = query.where(Defect.category == category)
    if severity:
        query = query.where(Defect.severity == severity)
    query = query.order_by(Defect.defect_number.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/projects/{project_id}/defects/summary", response_model=DefectSummaryResponse)
async def get_defect_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    status_result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((Defect.status == "open", 1), else_=0)).label("open_count"),
            func.sum(case((Defect.status == "in_progress", 1), else_=0)).label("in_progress_count"),
            func.sum(case((Defect.status == "resolved", 1), else_=0)).label("resolved_count"),
            func.sum(case((Defect.status == "closed", 1), else_=0)).label("closed_count"),
            func.sum(case((Defect.severity == "critical", 1), else_=0)).label("critical_count"),
            func.sum(case((Defect.severity == "high", 1), else_=0)).label("high_count"),
        )
        .where(Defect.project_id == project_id)
    )
    row = status_result.first()

    cat_result = await db.execute(
        select(Defect.category, func.count().label("count"))
        .where(Defect.project_id == project_id)
        .group_by(Defect.category)
    )
    by_category = {r.category: r.count for r in cat_result.all()}

    return DefectSummaryResponse(
        total=row.total or 0,
        open_count=row.open_count or 0,
        in_progress_count=row.in_progress_count or 0,
        resolved_count=row.resolved_count or 0,
        closed_count=row.closed_count or 0,
        critical_count=row.critical_count or 0,
        high_count=row.high_count or 0,
        by_category=by_category,
    )


@router.get("/projects/{project_id}/defects/export-pdf")
async def export_defects_pdf(
    project_id: UUID,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
):
    await verify_project_access(project_id, current_user, db)
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = (
        select(Defect)
        .options(*DEFECT_LOAD_OPTIONS)
        .where(Defect.project_id == project_id)
    )
    if status:
        query = query.where(Defect.status == status)
    if category:
        query = query.where(Defect.category == category)
    if severity:
        query = query.where(Defect.severity == severity)
    query = query.order_by(Defect.defect_number.desc())
    result = await db.execute(query)
    defects = list(result.scalars().all())

    pdf_bytes = await generate_defects_report_pdf(db, defects, project, storage)
    filename = f"defects_report_{project.code}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/projects/{project_id}/defects", response_model=DefectResponse)
async def create_defect(
    project_id: UUID,
    data: DefectCreate,
    member=require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defect_number = await get_next_defect_number(db, project_id)
    create_data = data.model_dump(exclude={"assignee_ids"})
    defect = Defect(
        **create_data,
        project_id=project_id,
        defect_number=defect_number,
        created_by_id=current_user.id,
    )
    db.add(defect)
    await db.flush()

    for contact_id in data.assignee_ids:
        db.add(DefectAssignee(defect_id=defect.id, contact_id=contact_id))
    await db.flush()

    await create_audit_log(
        db, current_user, "defect", defect.id, AuditAction.CREATE,
        project_id=project_id, new_values=get_model_dict(defect),
    )

    project = await db.get(Project, project_id)
    project_name = project.name if project else ""
    await notify_project_admins(
        db, project_id, "defect",
        f"New Defect #{defect_number}",
        f"A new {data.severity} defect was reported: {data.description[:100]}",
        entity_type="defect", entity_id=defect.id,
        project_name=project_name,
    )

    if data.assigned_contact_id:
        contact = await db.get(Contact, data.assigned_contact_id)
        if contact:
            await notify_contact(
                db, contact, "defect",
                f"Defect #{defect_number} assigned to you",
                f"You have been assigned to defect: {data.description[:100]}",
                entity_type="defect", entity_id=defect.id,
                project_name=project_name,
            )

    for contact_id in data.assignee_ids:
        contact = await db.get(Contact, contact_id)
        if contact:
            await notify_contact(
                db, contact, "defect",
                f"Defect #{defect_number} assigned to you",
                f"You have been added as assignee for defect: {data.description[:100]}",
                entity_type="defect", entity_id=defect.id,
                project_name=project_name,
            )

    result = await db.execute(
        select(Defect).options(*DEFECT_LOAD_OPTIONS).where(Defect.id == defect.id)
    )
    return result.scalar_one()


@router.get("/projects/{project_id}/defects/{defect_id}", response_model=DefectResponse)
async def get_defect(
    project_id: UUID,
    defect_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Defect)
        .options(*DEFECT_LOAD_OPTIONS)
        .where(Defect.id == defect_id, Defect.project_id == project_id)
    )
    defect = result.scalar_one_or_none()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


@router.put("/projects/{project_id}/defects/{defect_id}", response_model=DefectResponse)
async def update_defect(
    project_id: UUID,
    defect_id: UUID,
    data: DefectUpdate,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Defect).where(Defect.id == defect_id, Defect.project_id == project_id)
    )
    defect = result.scalar_one_or_none()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    old_values = get_model_dict(defect)
    old_status = defect.status
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(defect, key, value)

    if data.status == "resolved" and old_status != "resolved":
        defect.resolved_at = datetime.utcnow()

    await create_audit_log(
        db, current_user, "defect", defect.id, AuditAction.UPDATE,
        project_id=project_id, old_values=old_values, new_values=get_model_dict(defect),
    )

    if data.status and data.status != old_status:
        project = await db.get(Project, project_id)
        project_name = project.name if project else ""

        await db.refresh(defect, ["reporter", "followup_contact", "assignees"])
        if defect.reporter and defect.reporter.user_id:
            await notify_user(
                db, defect.reporter.user_id, "defect",
                f"Defect #{defect.defect_number} status changed",
                f"Status changed from {old_status} to {data.status}",
                entity_type="defect", entity_id=defect.id,
                project_name=project_name,
            )
        if defect.followup_contact and defect.followup_contact.user_id:
            await notify_user(
                db, defect.followup_contact.user_id, "defect",
                f"Defect #{defect.defect_number} status changed",
                f"Status changed from {old_status} to {data.status}",
                entity_type="defect", entity_id=defect.id,
                project_name=project_name,
            )
        for assignee in defect.assignees:
            if assignee.contact and assignee.contact.user_id:
                await notify_contact(
                    db, assignee.contact, "defect",
                    f"Defect #{defect.defect_number} status changed",
                    f"Status changed from {old_status} to {data.status}",
                    entity_type="defect", entity_id=defect.id,
                    project_name=project_name,
                )

        if data.status == "resolved":
            await notify_project_admins(
                db, project_id, "defect",
                f"Defect #{defect.defect_number} resolved",
                f"Defect has been resolved: {defect.description[:100]}",
                entity_type="defect", entity_id=defect.id,
                project_name=project_name,
            )

    result = await db.execute(
        select(Defect).options(*DEFECT_LOAD_OPTIONS).where(Defect.id == defect.id)
    )
    return result.scalar_one()


@router.delete("/projects/{project_id}/defects/{defect_id}")
async def delete_defect(
    project_id: UUID,
    defect_id: UUID,
    member=require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Defect).where(Defect.id == defect_id, Defect.project_id == project_id)
    )
    defect = result.scalar_one_or_none()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    await create_audit_log(
        db, current_user, "defect", defect.id, AuditAction.DELETE,
        project_id=project_id, old_values=get_model_dict(defect),
    )
    await db.delete(defect)
    return {"message": "Defect deleted"}


@router.post("/projects/{project_id}/defects/{defect_id}/assignees", response_model=DefectResponse)
async def add_assignee(
    project_id: UUID,
    defect_id: UUID,
    contact_id: UUID = Query(...),
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Defect).where(Defect.id == defect_id, Defect.project_id == project_id)
    )
    defect = result.scalar_one_or_none()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    existing = await db.execute(
        select(DefectAssignee).where(
            DefectAssignee.defect_id == defect_id,
            DefectAssignee.contact_id == contact_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Contact already assigned")

    db.add(DefectAssignee(defect_id=defect_id, contact_id=contact_id))
    await db.flush()

    contact = await db.get(Contact, contact_id)
    if contact:
        project = await db.get(Project, project_id)
        await notify_contact(
            db, contact, "defect",
            f"Defect #{defect.defect_number} assigned to you",
            f"You have been added as assignee for defect: {defect.description[:100]}",
            entity_type="defect", entity_id=defect.id,
            project_name=project.name if project else "",
        )

    result = await db.execute(
        select(Defect).options(*DEFECT_LOAD_OPTIONS).where(Defect.id == defect.id)
    )
    return result.scalar_one()


@router.delete("/projects/{project_id}/defects/{defect_id}/assignees/{contact_id}")
async def remove_assignee(
    project_id: UUID,
    defect_id: UUID,
    contact_id: UUID,
    member=require_permission(Permission.EDIT),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Defect).where(Defect.id == defect_id, Defect.project_id == project_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Defect not found")

    result = await db.execute(
        select(DefectAssignee).where(
            DefectAssignee.defect_id == defect_id,
            DefectAssignee.contact_id == contact_id,
        )
    )
    assignee = result.scalar_one_or_none()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")

    await db.delete(assignee)
    return {"message": "Assignee removed"}
