import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi import File as FastAPIFile
from sqlalchemy import select
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
    PermitCreate,
    PermitResponse,
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
