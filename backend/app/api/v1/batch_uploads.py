from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from fastapi import File as FastAPIFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.batch_upload import BatchUpload
from app.models.document_version import DocumentVersion
from app.models.file import File
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.batch_upload import BatchUploadResponse
from app.services.storage_service import StorageBackend, generate_storage_path, get_storage_backend
from app.utils.localization import get_language_from_request, translate_message
from app.worker.tasks.document_processing import process_batch_upload

router = APIRouter()

MAX_BATCH_FILES = 100
MAX_BATCH_SIZE = 1024 * 1024 * 1024  # 1 GB
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per file

ALLOWED_ENTITY_TYPES = {
    "area", "blueprint", "checklist", "contact", "defect", "equipment", "inspection",
    "material", "meeting", "project", "rfi", "task", "approval",
}


@router.post("/projects/{project_id}/batch-uploads", response_model=BatchUploadResponse, status_code=201)
async def create_batch_upload(
    project_id: UUID,
    entity_type: str,
    entity_id: UUID,
    files: List[UploadFile] = FastAPIFile(...),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None
):
    language = get_language_from_request(request)

    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")

    if len(files) > MAX_BATCH_FILES:
        error_message = translate_message('batch_upload.too_many_files', language)
        raise HTTPException(
            status_code=400,
            detail=error_message or f"Batch upload limited to {MAX_BATCH_FILES} files"
        )

    total_size = sum(file.size or 0 for file in files)
    if total_size > MAX_BATCH_SIZE:
        error_message = translate_message('batch_upload.size_limit_exceeded', language)
        raise HTTPException(
            status_code=413,
            detail=error_message or f"Total batch size exceeds {MAX_BATCH_SIZE / (1024*1024*1024):.0f} GB limit"
        )

    for file in files:
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds {MAX_FILE_SIZE / (1024*1024):.0f} MB limit"
            )

    batch_upload = BatchUpload(
        project_id=project_id,
        user_id=current_user.id,
        total_files=len(files),
        completed_files=0,
        failed_files=0,
        status="uploading"
    )
    db.add(batch_upload)
    await db.flush()

    uploaded_files = []
    failed_count = 0

    for file in files:
        try:
            storage_path = generate_storage_path(
                user_id=current_user.id,
                project_id=project_id,
                entity_type=entity_type,
                entity_id=entity_id,
                filename=file.filename or "unnamed"
            )

            file_size = await storage.save_file(file, storage_path)

            # Check if file with same name already exists for this entity
            existing_file_result = await db.execute(
                select(File)
                .where(
                    File.filename == (file.filename or "unnamed"),
                    File.entity_type == entity_type,
                    File.entity_id == entity_id
                )
            )
            existing_file = existing_file_result.scalar_one_or_none()

            if existing_file:
                # Get the highest version number for this file
                max_version_result = await db.execute(
                    select(func.max(DocumentVersion.version_number))
                    .where(DocumentVersion.file_id == existing_file.id)
                )
                max_version = max_version_result.scalar() or 0
                next_version = max_version + 1

                # Create DocumentVersion record
                document_version = DocumentVersion(
                    file_id=existing_file.id,
                    version_number=next_version,
                    filename=file.filename or "unnamed",
                    storage_path=storage_path,
                    file_size=file_size,
                    uploaded_by_id=current_user.id
                )
                db.add(document_version)

                # Update existing File record with new data
                existing_file.storage_path = storage_path
                existing_file.file_size = file_size
                existing_file.file_type = file.content_type or "application/octet-stream"
                existing_file.uploaded_by_id = current_user.id

                await db.flush()
                uploaded_files.append(existing_file)
            else:
                # Create new File record
                file_record = File(
                    project_id=project_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    filename=file.filename or "unnamed",
                    file_type=file.content_type or "application/octet-stream",
                    file_size=file_size,
                    storage_path=storage_path,
                    uploaded_by_id=current_user.id
                )
                db.add(file_record)
                await db.flush()
                uploaded_files.append(file_record)

        except Exception:
            failed_count += 1

    batch_upload.completed_files = len(uploaded_files)
    batch_upload.failed_files = failed_count
    batch_upload.status = "completed" if failed_count == 0 else "partial"

    await db.commit()
    await db.refresh(batch_upload, ["user"])

    return batch_upload


@router.get("/batch-uploads/{batch_id}", response_model=BatchUploadResponse)
async def get_batch_upload(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    result = await db.execute(
        select(BatchUpload)
        .where(BatchUpload.id == batch_id)
        .options(selectinload(BatchUpload.user))
    )
    batch_upload = result.scalar_one_or_none()

    if not batch_upload:
        language = get_language_from_request(request)
        error_message = translate_message('batch_upload.not_found', language)
        raise HTTPException(status_code=404, detail=error_message or "Batch upload not found")

    await verify_project_access(batch_upload.project_id, current_user, db)

    return batch_upload


@router.post("/batch-uploads/{batch_id}/process", status_code=202)
async def trigger_batch_processing(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Trigger background processing for a batch upload.

    This endpoint queues a Celery task to process all files in the batch,
    including thumbnail generation, PDF splitting, and AI title block extraction.

    Returns 202 Accepted with the Celery task ID.
    """
    result = await db.execute(
        select(BatchUpload)
        .where(BatchUpload.id == batch_id)
    )
    batch_upload = result.scalar_one_or_none()

    if not batch_upload:
        language = get_language_from_request(request)
        error_message = translate_message('batch_upload.not_found', language)
        raise HTTPException(status_code=404, detail=error_message or "Batch upload not found")

    await verify_project_access(batch_upload.project_id, current_user, db)

    # Trigger Celery task
    task = process_batch_upload.delay(str(batch_id))

    return {
        "message": "Batch processing started",
        "batch_id": str(batch_id),
        "task_id": task.id
    }
