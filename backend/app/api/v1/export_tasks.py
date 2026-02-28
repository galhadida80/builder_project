from __future__ import annotations

import io
import json as json_module
import logging
import zipfile
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.export_job import ExportFormat, ExportJob, ExportStatus, ExportType
from app.models.project import Project, ProjectMember
from app.services.export_service import ExportService
from app.services.storage_service import StorageBackend
from app.utils import utcnow

logger = logging.getLogger(__name__)


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
            elif export_type == ExportType.ORGANIZATION:
                if organization_id:
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
                else:
                    # Export all projects the user has access to
                    accessible_projects_query = select(ProjectMember.project_id).where(
                        ProjectMember.user_id == job.requested_by_id
                    )
                    result = await db.execute(accessible_projects_query)
                    accessible_project_ids = [row[0] for row in result.all()]

                    result = await db.execute(
                        select(Project).where(Project.id.in_(accessible_project_ids))
                    )
                    projects = result.scalars().all()

                    org_data = {
                        "schema_version": "1.0",
                        "export_date": utcnow().isoformat(),
                        "user_id": str(job.requested_by_id),
                        "projects": []
                    }

                for project in projects:
                    project_data = await export_service.export_project_json(project.id)
                    org_data["projects"].append(project_data)

                content = json_module.dumps(org_data, indent=2, default=str).encode("utf-8")
                if organization_id:
                    filename = f"organization_{organization_id}_export.json"
                else:
                    filename = f"all_projects_{job.requested_by_id}_export.json"
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
            elif export_type == ExportType.ORGANIZATION:
                if organization_id:
                    # Create ZIP with all project archives in the organization
                    result = await db.execute(
                        select(Project).where(Project.organization_id == organization_id)
                    )
                    projects = result.scalars().all()
                else:
                    # Create ZIP with all accessible projects
                    accessible_projects_query = select(ProjectMember.project_id).where(
                        ProjectMember.user_id == job.requested_by_id
                    )
                    result = await db.execute(accessible_projects_query)
                    accessible_project_ids = [row[0] for row in result.all()]

                    result = await db.execute(
                        select(Project).where(Project.id.in_(accessible_project_ids))
                    )
                    projects = result.scalars().all()

                zip_buffer = io.BytesIO()
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as org_zip:
                    for project in projects:
                        # Export each project's data as JSON and add to zip
                        project_data = await export_service.export_project_json(project.id)
                        project_json = json_module.dumps(project_data, indent=2, default=str)
                        org_zip.writestr(
                            f"{project.id}/project_data.json",
                            project_json
                        )

                zip_buffer.seek(0)
                content = zip_buffer.read()
                if organization_id:
                    filename = f"organization_{organization_id}_export.zip"
                else:
                    filename = f"all_projects_{job.requested_by_id}_export.zip"
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
