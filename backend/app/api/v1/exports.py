from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.export_tasks import process_export_job
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.export_job import ExportFormat, ExportJob, ExportStatus, ExportType
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.export import ExportJobResponse, ExportRequest
from app.services.storage_service import StorageBackend, get_storage_backend
from app.utils.localization import get_language_from_request, translate_message

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/projects/{project_id}/exports", response_model=ExportJobResponse)
async def create_project_export(
    project_id: UUID,
    data: ExportRequest,
    background_tasks: BackgroundTasks,
    member: ProjectMember = require_permission(Permission.MANAGE_SETTINGS),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None,
):
    """Create a new project export job."""
    if data.export_type != ExportType.PROJECT:
        language = get_language_from_request(request)
        error_message = translate_message('invalid_export_type_for_project', language)
        raise HTTPException(
            status_code=400,
            detail=error_message or "Export type must be 'project' for project exports"
        )

    job = ExportJob(
        project_id=project_id,
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
        project_id,
        None,
        db,
        storage,
    )

    await db.commit()
    await db.refresh(job, ["requested_by"])

    return job


@router.get("/projects/{project_id}/exports", response_model=list[ExportJobResponse])
async def list_project_exports(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all export jobs for a project."""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ExportJob)
        .where(ExportJob.project_id == project_id)
        .options(selectinload(ExportJob.requested_by))
        .order_by(ExportJob.created_at.desc())
    )
    return result.scalars().all()


@router.get("/projects/{project_id}/exports/{export_id}", response_model=ExportJobResponse)
async def get_export_job(
    project_id: UUID,
    export_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    """Get export job status and details."""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ExportJob)
        .where(ExportJob.id == export_id, ExportJob.project_id == project_id)
        .options(selectinload(ExportJob.requested_by))
    )
    job = result.scalar_one_or_none()

    if not job:
        language = get_language_from_request(request)
        error_message = translate_message('export_job_not_found', language)
        raise HTTPException(
            status_code=404,
            detail=error_message or "Export job not found"
        )

    return job


@router.get("/projects/{project_id}/exports/{export_id}/download")
async def download_export_file(
    project_id: UUID,
    export_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None,
):
    """Download the export file."""
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ExportJob).where(
            ExportJob.id == export_id,
            ExportJob.project_id == project_id
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        language = get_language_from_request(request)
        error_message = translate_message('export_job_not_found', language)
        raise HTTPException(
            status_code=404,
            detail=error_message or "Export job not found"
        )

    if job.status != ExportStatus.COMPLETED:
        language = get_language_from_request(request)
        error_message = translate_message('export_not_ready', language)
        raise HTTPException(
            status_code=400,
            detail=error_message or f"Export is not ready. Current status: {job.status}"
        )

    if not job.file_path:
        raise HTTPException(status_code=500, detail="Export file path is missing")

    try:
        content = await storage.get_file_content(job.file_path)
    except Exception as e:
        logger.exception(f"Failed to retrieve export file {job.file_path}")
        raise HTTPException(status_code=500, detail="Failed to retrieve export file")

    filename = Path(job.file_path).name
    media_type_map = {
        ExportFormat.JSON: "application/json",
        ExportFormat.CSV: "text/csv; charset=utf-8",
        ExportFormat.ZIP: "application/zip",
    }
    media_type = media_type_map.get(job.export_format, "application/octet-stream")

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\""
        }
    )


