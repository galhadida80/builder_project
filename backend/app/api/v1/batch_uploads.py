from __future__ import annotations

import logging
import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile
from fastapi import File as FastAPIFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings, get_settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.db.session import AsyncSessionLocal, get_db
from app.models.batch_upload import BatchUpload
from app.models.file import File
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.batch_upload import BatchUploadResponse, BatchUploadStatusResponse
from app.services.storage_service import generate_storage_path
from app.utils import utcnow
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_BATCH_FILES = 100
MAX_BATCH_SIZE = 1024 * 1024 * 1024  # 1 GB
MAX_SINGLE_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

ALLOWED_ENTITY_TYPES = {
    "area", "blueprint", "checklist", "contact", "defect", "equipment", "inspection",
    "material", "meeting", "permit", "project", "rfi", "task", "approval",
}


async def process_batch_files(
    batch_id: uuid.UUID,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    file_data_list: list[dict],
    entity_type: str,
    entity_id: uuid.UUID,
    settings: Settings,
) -> None:
    from app.services.storage_service import _create_storage_backend
    storage = _create_storage_backend(settings)

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(BatchUpload).where(BatchUpload.id == batch_id)
            )
            batch = result.scalar_one_or_none()
            if not batch:
                logger.error("Batch %s not found", batch_id)
                return

            batch.status = "processing"
            await db.commit()

            for file_info in file_data_list:
                try:
                    storage_path = generate_storage_path(
                        user_id=user_id,
                        project_id=project_id,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        filename=file_info["filename"],
                    )
                    content = file_info["content"]
                    file_size = await storage.save_bytes(
                        content, storage_path, file_info["content_type"]
                    )

                    file_record = File(
                        project_id=project_id,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        filename=file_info["filename"],
                        file_type=file_info["content_type"],
                        file_size=file_size,
                        storage_path=storage_path,
                        uploaded_by_id=user_id,
                        batch_upload_id=batch_id,
                    )
                    db.add(file_record)
                    batch.processed_files += 1

                except Exception as exc:
                    logger.error("Failed to process file %s: %s", file_info["filename"], exc)
                    batch.failed_files += 1

            batch.status = "completed" if batch.failed_files == 0 else "failed"
            batch.completed_at = utcnow()
            await db.commit()

        except Exception as exc:
            logger.error("Batch processing error for %s: %s", batch_id, exc)
            try:
                batch.status = "failed"
                batch.completed_at = utcnow()
                await db.commit()
            except Exception:
                pass


@router.post("/projects/{project_id}/batch-uploads", response_model=BatchUploadResponse)
async def create_batch_upload(
    project_id: UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = FastAPIFile(...),
    entity_type: str = "project",
    entity_id: Optional[UUID] = None,
    category: Optional[str] = None,
    building: Optional[str] = None,
    floor: Optional[str] = None,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")

    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BATCH_FILES} files per batch")

    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")

    resolved_entity_id = entity_id or project_id

    file_data_list = []
    total_size = 0

    for upload_file in files:
        content = await upload_file.read()
        file_size = len(content)

        if file_size > MAX_SINGLE_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{upload_file.filename}' exceeds 50 MB limit"
            )

        total_size += file_size
        if total_size > MAX_BATCH_SIZE:
            raise HTTPException(status_code=413, detail="Total batch size exceeds 1 GB limit")

        file_data_list.append({
            "filename": upload_file.filename or "unnamed",
            "content_type": upload_file.content_type or "application/octet-stream",
            "content": content,
        })

    metadata = {}
    if category:
        metadata["category"] = category
    if building:
        metadata["building"] = building
    if floor:
        metadata["floor"] = floor

    batch = BatchUpload(
        project_id=project_id,
        uploaded_by=current_user.id,
        total_files=len(file_data_list),
        status="pending",
        metadata_json=metadata if metadata else None,
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch, ["uploader"])

    background_tasks.add_task(
        process_batch_files,
        batch_id=batch.id,
        project_id=project_id,
        user_id=current_user.id,
        file_data_list=file_data_list,
        entity_type=entity_type,
        entity_id=resolved_entity_id,
        settings=settings,
    )

    return batch


@router.get("/projects/{project_id}/batch-uploads", response_model=list[BatchUploadResponse])
async def list_batch_uploads(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BatchUpload)
        .where(BatchUpload.project_id == project_id)
        .options(selectinload(BatchUpload.uploader))
        .order_by(BatchUpload.created_at.desc())
    )
    return result.scalars().all()


@router.get(
    "/projects/{project_id}/batch-uploads/{batch_id}",
    response_model=BatchUploadStatusResponse,
)
async def get_batch_status(
    project_id: UUID,
    batch_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None,
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(BatchUpload)
        .where(BatchUpload.id == batch_id, BatchUpload.project_id == project_id)
        .options(selectinload(BatchUpload.uploader), selectinload(BatchUpload.files))
    )
    batch = result.scalar_one_or_none()
    if not batch:
        language = get_language_from_request(request)
        error_message = translate_message("resources.not_found", language)
        raise HTTPException(status_code=404, detail=error_message)
    return batch
