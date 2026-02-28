from __future__ import annotations

import io
import logging
import zipfile
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.export_job import ExportFormat, ExportJob, ExportStatus, ExportType
from app.models.organization import Organization
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.export import ExportJobResponse, ExportRequest
from app.services.export_service import ExportService
from app.services.storage_service import StorageBackend, get_storage_backend
from app.utils import utcnow
from app.utils.localization import get_language_from_request, translate_message

logger = logging.getLogger(__name__)

router = APIRouter()


async def process_export_job(
    job_id: UUID,
    export_format: ExportFormat,
    export_type: ExportType,
    project_id: Optional[UUID],
    organization_id: Optional[UUID],
    db: AsyncSession,
    storage: StorageBackend,
):
    """Background task to process export job."""
    import json as json_module

    try:
        job = await db.get(ExportJob, job_id)
        if not job:
            logger.error(f"Export job {job_id} not found")
            return

        job.status = ExportStatus.PROCESSING
        job.updated_at = utcnow()
        await db.commit()

        export_service = ExportService(db)
        storage_path = f"exports/{job_id}"
        filename = ""
        file_size = 0

        if export_format == ExportFormat.JSON:
            if export_type == ExportType.PROJECT and project_id:
                data = await export_service.export_project_json(project_id)
                content = json_module.dumps(data, indent=2, default=str).encode("utf-8")
                filename = f"project_{project_id}_export.json"
                storage_path = f"exports/{job_id}/{filename}"
                file_size = await storage.save_bytes(content, storage_path)
            elif export_type == ExportType.ORGANIZATION and organization_id:
                # Export all projects in the organization
                result = await db.execute(
                    select(Project).where(Project.organization_id == organization_id)
                )
                projects = result.scalars().all()

                org_data = {
                    "schema_version": "1.0",
                    "export_date": utcnow().isoformat(),
                    "organization_id": str(organization_id),
                    "projects": []
                }

                for project in projects:
                    project_data = await export_service.export_project_json(project.id)
                    org_data["projects"].append(project_data)

                content = json_module.dumps(org_data, indent=2, default=str).encode("utf-8")
                filename = f"organization_{organization_id}_export.json"
                storage_path = f"exports/{job_id}/{filename}"
                file_size = await storage.save_bytes(content, storage_path)
            else:
                raise ValueError("Invalid export configuration")

        elif export_format == ExportFormat.CSV:
            if export_type == ExportType.PROJECT and project_id:
                # Combine all CSV exports into one file
                equipment_csv = await export_service.export_equipment_csv(project_id)
                materials_csv = await export_service.export_materials_csv(project_id)
                inspections_csv = await export_service.export_inspections_csv(project_id)
                rfis_csv = await export_service.export_rfis_csv(project_id)
                tasks_csv = await export_service.export_tasks_csv(project_id)
                budgets_csv = await export_service.export_budgets_csv(project_id)

                combined_csv = (
                    "EQUIPMENT\n" + equipment_csv + "\n\n" +
                    "MATERIALS\n" + materials_csv + "\n\n" +
                    "INSPECTIONS\n" + inspections_csv + "\n\n" +
                    "RFIS\n" + rfis_csv + "\n\n" +
                    "TASKS\n" + tasks_csv + "\n\n" +
                    "BUDGETS\n" + budgets_csv
                )

                content = combined_csv.encode("utf-8")
                filename = f"project_{project_id}_export.csv"
                storage_path = f"exports/{job_id}/{filename}"
                file_size = await storage.save_bytes(content, storage_path)
            else:
                raise ValueError("CSV export only supported for projects")

        elif export_format == ExportFormat.ZIP:
            if export_type == ExportType.PROJECT and project_id:
                filename = f"project_{project_id}_export.zip"
                storage_path = f"exports/{job_id}/{filename}"
                file_size = await export_service.create_export_archive(project_id, storage_path)
            elif export_type == ExportType.ORGANIZATION and organization_id:
                # Create ZIP with all project archives
                result = await db.execute(
                    select(Project).where(Project.organization_id == organization_id)
                )
                projects = result.scalars().all()

                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as org_zip:
                    for project in projects:
                        # Export each project's data as JSON and add to zip
                        project_data = await export_service.export_project_json(project.id)
                        project_json = json_module.dumps(project_data, indent=2, default=str)
                        org_zip.writestr(
                            f"{project.project_code or project.id}/project_data.json",
                            project_json
                        )

                zip_buffer.seek(0)
                content = zip_buffer.read()
                filename = f"organization_{organization_id}_export.zip"
                storage_path = f"exports/{job_id}/{filename}"
                file_size = await storage.save_bytes(content, storage_path)
            else:
                raise ValueError("Invalid export configuration")

        else:
            raise ValueError(f"Unsupported export format: {export_format}")

        job.status = ExportStatus.COMPLETED
        job.file_path = storage_path
        job.file_size = file_size
        job.completed_at = utcnow()
        job.updated_at = utcnow()
        await db.commit()

    except Exception as e:
        logger.exception(f"Export job {job_id} failed: {str(e)}")
        job = await db.get(ExportJob, job_id)
        if job:
            job.status = ExportStatus.FAILED
            job.error_message = str(e)
            job.updated_at = utcnow()
            await db.commit()


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
