import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi import File as FastAPIFile
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.file import File
from app.models.permit import Permit
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.file import FileResponse
from app.schemas.permit import (
    PermitComplianceReportResponse,
    PermitCreate,
    PermitResponse,
    PermitStatusUpdate,
    PermitUpdate,
)
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.notification_service import notify_project_admins
from app.services.storage_service import StorageBackend, generate_storage_path, get_storage_backend

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# Project Permit Endpoints

@router.get("/permits", response_model=list[PermitResponse])
async def list_permits(
    project_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all permits for a project (flat GET with query param)"""
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id query parameter is required")

    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(Permit.project_id == project_id)
        .order_by(Permit.expiration_date.asc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/permits", response_model=list[PermitResponse])
async def list_permits_nested(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all permits for a project (nested GET)"""
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(Permit.project_id == project_id)
        .order_by(Permit.expiration_date.asc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/permits/compliance-report", response_model=PermitComplianceReportResponse)
async def get_permit_compliance_report(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get compliance report with permit status and expiration tracking"""
    await verify_project_access(project_id, current_user, db)

    # Calculate expiring soon threshold (30 days from now)
    today = datetime.now().date()
    expiring_threshold = today + timedelta(days=30)

    # Get permit counts by status
    status_result = await db.execute(
        select(
            func.count().label('total'),
            func.sum(case((Permit.status == 'not_applied', 1), else_=0)).label('not_applied'),
            func.sum(case((Permit.status == 'applied', 1), else_=0)).label('applied'),
            func.sum(case((Permit.status == 'under_review', 1), else_=0)).label('under_review'),
            func.sum(case((Permit.status == 'approved', 1), else_=0)).label('approved'),
            func.sum(case((Permit.status == 'conditional', 1), else_=0)).label('conditional'),
            func.sum(case((Permit.status == 'rejected', 1), else_=0)).label('rejected'),
            func.sum(case((Permit.status == 'expired', 1), else_=0)).label('expired'),
            func.sum(case((
                (Permit.expiration_date.isnot(None)) &
                (Permit.expiration_date <= expiring_threshold) &
                (Permit.expiration_date > today) &
                (Permit.status != 'expired'), 1
            ), else_=0)).label('expiring_soon')
        )
        .where(Permit.project_id == project_id)
    )
    status_row = status_result.one()

    # Get permit counts by type
    type_result = await db.execute(
        select(Permit.permit_type, func.count().label('count'))
        .where(Permit.project_id == project_id)
        .group_by(Permit.permit_type)
    )
    permits_by_type = {row.permit_type: row.count for row in type_result}

    return PermitComplianceReportResponse(
        total_permits=status_row.total or 0,
        not_applied_count=status_row.not_applied or 0,
        applied_count=status_row.applied or 0,
        under_review_count=status_row.under_review or 0,
        approved_count=status_row.approved or 0,
        conditional_count=status_row.conditional or 0,
        rejected_count=status_row.rejected or 0,
        expired_count=status_row.expired or 0,
        expiring_soon_count=status_row.expiring_soon or 0,
        permits_by_type=permits_by_type
    )


@router.post("/projects/{project_id}/permits", response_model=PermitResponse)
async def create_permit(
    project_id: UUID,
    data: PermitCreate,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new permit for a project"""
    permit = Permit(**data.model_dump(), project_id=project_id, created_by_id=current_user.id)
    db.add(permit)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=422, detail="Invalid data or duplicate entry")

    await create_audit_log(
        db, current_user, "permit", permit.id, AuditAction.CREATE,
        project_id=project_id, new_values=get_model_dict(permit)
    )

    try:
        project = await db.get(Project, project_id)
        project_name = project.name if project else ""
        await notify_project_admins(
            db, project_id, "PERMIT",
            "New permit created",
            f"A new {permit.permit_type.replace('_', ' ')} permit has been created",
            entity_type="permit", entity_id=permit.id,
            project_name=project_name,
        )
    except Exception:
        logger.exception("Failed to send permit created notification")

    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(Permit.id == permit.id)
    )
    return result.scalar_one()


@router.get("/permits/{permit_id}", response_model=PermitResponse)
async def get_permit(
    permit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific permit by ID"""
    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(Permit.id == permit_id)
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    await verify_project_access(permit.project_id, current_user, db)
    return permit


@router.put("/permits/{permit_id}", response_model=PermitResponse)
async def update_permit(
    permit_id: UUID,
    data: PermitUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a permit"""
    result = await db.execute(
        select(Permit).where(Permit.id == permit_id)
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    # Check permission via project membership
    member_result = await db.execute(
        select(ProjectMember)
        .where(
            ProjectMember.project_id == permit.project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this permit")

    old_values = get_model_dict(permit)

    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(permit, field, value)

    await db.flush()

    await create_audit_log(
        db, current_user, "permit", permit.id, AuditAction.UPDATE,
        project_id=permit.project_id, old_values=old_values, new_values=get_model_dict(permit)
    )

    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(Permit.id == permit.id)
    )
    return result.scalar_one()


@router.patch("/permits/{permit_id}/status", response_model=PermitResponse)
async def update_permit_status(
    permit_id: UUID,
    data: PermitStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update permit status with audit trail"""
    result = await db.execute(
        select(Permit).where(Permit.id == permit_id)
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    # Check permission via project membership
    member_result = await db.execute(
        select(ProjectMember)
        .where(
            ProjectMember.project_id == permit.project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this permit")

    old_values = get_model_dict(permit)

    # Update status
    permit.status = data.status

    await db.flush()

    await create_audit_log(
        db, current_user, "permit", permit.id, AuditAction.UPDATE,
        project_id=permit.project_id, old_values=old_values, new_values=get_model_dict(permit)
    )

    result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.created_by))
        .where(Permit.id == permit.id)
    )
    return result.scalar_one()


@router.delete("/permits/{permit_id}")
async def delete_permit(
    permit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a permit"""
    result = await db.execute(
        select(Permit).where(Permit.id == permit_id)
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    # Check permission via project membership
    member_result = await db.execute(
        select(ProjectMember)
        .where(
            ProjectMember.project_id == permit.project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    member = member_result.scalar_one_or_none()
    if not member and not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this permit")

    await create_audit_log(
        db, current_user, "permit", permit.id, AuditAction.DELETE,
        project_id=permit.project_id, old_values=get_model_dict(permit)
    )

    await db.delete(permit)
    await db.flush()

    return {"status": "deleted"}


@router.post("/permits/{permit_id}/documents", response_model=FileResponse, status_code=201)
async def upload_permit_document(
    permit_id: UUID,
    file: UploadFile = FastAPIFile(...),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend)
):
    """Upload a document for a specific permit"""
    # Get the permit to verify it exists and get project_id
    result = await db.execute(
        select(Permit).where(Permit.id == permit_id)
    )
    permit = result.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    # Verify project access is already handled by require_permission

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 50 MB limit")

    storage_path = generate_storage_path(
        user_id=current_user.id,
        project_id=permit.project_id,
        entity_type="permit",
        entity_id=permit_id,
        filename=file.filename or "unnamed"
    )
    file_size = await storage.save_file(file, storage_path)
    file_record = File(
        project_id=permit.project_id,
        entity_type="permit",
        entity_id=permit_id,
        filename=file.filename or "unnamed",
        file_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        storage_path=storage_path,
        uploaded_by_id=current_user.id
    )
    db.add(file_record)
    await db.flush()

    await create_audit_log(
        db, current_user, "file", file_record.id, AuditAction.CREATE,
        project_id=permit.project_id,
        new_values={"filename": file.filename, "entity_type": "permit", "entity_id": str(permit_id)}
    )

    await db.commit()
    await db.refresh(file_record, ["uploaded_by"])
    return file_record
