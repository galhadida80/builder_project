from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.export_tasks import process_export_job
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.export_job import ExportJob, ExportStatus, ExportType
from app.models.organization import Organization
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.export import ExportJobResponse, ExportRequest
from app.services.storage_service import StorageBackend, get_storage_backend
from app.utils.localization import get_language_from_request, translate_message

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/organizations/{organization_id}/exports", response_model=ExportJobResponse)
async def create_organization_export(
    organization_id: UUID,
    data: ExportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None,
):
    """Create a new organization-wide export job."""
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()

    if not organization:
        language = get_language_from_request(request)
        error_message = translate_message('organization_not_found', language)
        raise HTTPException(
            status_code=404,
            detail=error_message or "Organization not found"
        )

    if not current_user.is_super_admin and organization.owner_id != current_user.id:
        language = get_language_from_request(request)
        error_message = translate_message('insufficient_permissions', language)
        raise HTTPException(
            status_code=403,
            detail=error_message or "Only organization owners can export organization data"
        )

    if data.export_type != ExportType.ORGANIZATION:
        language = get_language_from_request(request)
        error_message = translate_message('invalid_export_type_for_organization', language)
        raise HTTPException(
            status_code=400,
            detail=error_message or "Export type must be 'organization' for organization exports"
        )

    job = ExportJob(
        organization_id=organization_id,
        export_format=data.export_format,
        export_type=data.export_type,
        status=ExportStatus.PENDING,
        requested_by_id=current_user.id,
    )
    db.add(job)
    await db.flush()

    background_tasks.add_task(
        process_export_job,
        job.id,
        data.export_format,
        data.export_type,
        None,
        organization_id,
        db,
        storage,
    )

    await db.commit()
    await db.refresh(job, ["requested_by"])

    return job


@router.get("/organizations/{organization_id}/exports", response_model=list[ExportJobResponse])
async def list_organization_exports(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """List all export jobs for an organization."""
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()

    if not organization:
        language = get_language_from_request(request)
        error_message = translate_message('organization_not_found', language)
        raise HTTPException(
            status_code=404,
            detail=error_message or "Organization not found"
        )

    if not current_user.is_super_admin and organization.owner_id != current_user.id:
        language = get_language_from_request(request)
        error_message = translate_message('insufficient_permissions', language)
        raise HTTPException(
            status_code=403,
            detail=error_message or "Insufficient permissions"
        )

    result = await db.execute(
        select(ExportJob)
        .where(ExportJob.organization_id == organization_id)
        .options(selectinload(ExportJob.requested_by))
        .order_by(ExportJob.created_at.desc())
    )
    return result.scalars().all()


@router.post("/exports", response_model=ExportJobResponse)
async def create_all_projects_export(
    data: ExportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
):
    """Create an export job for all projects the user has access to."""
    accessible_projects_query = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )
    result = await db.execute(accessible_projects_query)
    accessible_project_ids = [row[0] for row in result.all()]

    if not accessible_project_ids:
        raise HTTPException(
            status_code=400,
            detail="No accessible projects found"
        )

    job = ExportJob(
        export_format=data.export_format,
        export_type=ExportType.ORGANIZATION,
        status=ExportStatus.PENDING,
        requested_by_id=current_user.id,
    )
    db.add(job)
    await db.flush()

    background_tasks.add_task(
        process_export_job,
        job.id,
        data.export_format,
        ExportType.ORGANIZATION,
        None,
        None,
        db,
        storage,
    )

    await db.commit()
    await db.refresh(job, ["requested_by"])

    return job


@router.get("/exports", response_model=list[ExportJobResponse])
async def list_all_exports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all export jobs for projects the user has access to."""
    accessible_projects = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id
    )

    result = await db.execute(
        select(ExportJob)
        .where(
            (ExportJob.project_id.in_(accessible_projects)) |
            (ExportJob.requested_by_id == current_user.id)
        )
        .options(selectinload(ExportJob.requested_by))
        .order_by(ExportJob.created_at.desc())
    )
    return result.scalars().all()
