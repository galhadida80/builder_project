from __future__ import annotations

import mimetypes
from typing import Optional
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from fastapi import File as FastAPIFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings, get_settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user, verify_project_access
from app.core.validation import validate_storage_path
from app.db.session import get_db
from app.models.audit import AuditAction
from app.models.file import File
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.file import FileResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.storage_service import StorageBackend, generate_storage_path, get_storage_backend
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

ALLOWED_ENTITY_TYPES = {
    "area", "blueprint", "checklist", "contact", "defect", "equipment", "inspection",
    "material", "meeting", "project", "rfi", "task", "approval",
}


@router.get("/projects/{project_id}/files", response_model=list[FileResponse])
async def list_files(
    project_id: UUID,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_project_access(project_id, current_user, db)
    query = select(File).where(File.project_id == project_id).options(selectinload(File.uploaded_by))
    if entity_type:
        query = query.where(File.entity_type == entity_type)
    if entity_id:
        query = query.where(File.entity_id == entity_id)

    result = await db.execute(query.order_by(File.uploaded_at.desc()))
    return result.scalars().all()


@router.post("/projects/{project_id}/files", response_model=FileResponse)
async def upload_file(
    project_id: UUID,
    entity_type: str,
    entity_id: UUID,
    file: UploadFile = FastAPIFile(...),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend)
):
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 50 MB limit")

    storage_path = generate_storage_path(
        user_id=current_user.id,
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        filename=file.filename or "unnamed"
    )
    file_size = await storage.save_file(file, storage_path)
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

    await create_audit_log(
        db, current_user, "file", file_record.id, AuditAction.CREATE,
        project_id=project_id,
        new_values={"filename": file.filename, "entity_type": entity_type, "entity_id": str(entity_id)}
    )

    await db.commit()
    await db.refresh(file_record, ["uploaded_by"])
    return file_record


@router.get("/projects/{project_id}/files/{file_id}", response_model=FileResponse)
async def get_file(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(File)
        .where(File.id == file_id, File.project_id == project_id)
        .options(selectinload(File.uploaded_by))
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        language = get_language_from_request(request)
        error_message = translate_message('resources.file_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    return file_record


@router.delete("/projects/{project_id}/files/{file_id}")
async def delete_file(
    project_id: UUID,
    file_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None
):
    result = await db.execute(select(File).where(File.id == file_id, File.project_id == project_id))
    file_record = result.scalar_one_or_none()
    if not file_record:
        language = get_language_from_request(request)
        error_message = translate_message('resources.file_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
    try:
        await storage.delete_file(file_record.storage_path)
    except Exception:
        pass

    await create_audit_log(
        db, current_user, "file", file_record.id, AuditAction.DELETE,
        project_id=project_id, old_values=get_model_dict(file_record)
    )

    await db.delete(file_record)
    await db.commit()
    return {"message": "File deleted"}


@router.get("/projects/{project_id}/files/{file_id}/content")
async def serve_file_content(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(File).where(File.id == file_id, File.project_id == project_id)
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        language = get_language_from_request(request)
        error_message = translate_message('resources.file_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    content = await storage.get_file_content(file_record.storage_path)
    encoded_filename = quote(file_record.filename)
    return Response(
        content=content,
        media_type=file_record.file_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"inline; filename=\"{encoded_filename}\"; filename*=UTF-8''{encoded_filename}"
        }
    )


@router.get("/projects/{project_id}/files/{file_id}/download")
async def download_file(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(File).where(File.id == file_id, File.project_id == project_id)
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        language = get_language_from_request(request)
        error_message = translate_message('resources.file_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)

    # storage = get_storage_backend()  # No longer needed
    download_url = storage.get_file_url(file_record.storage_path)
    return {"download_url": download_url, "filename": file_record.filename}


@router.get("/storage/{path:path}")
async def serve_local_file(
    path: str,
    storage: StorageBackend = Depends(get_storage_backend),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    request: Request = None
):
    try:
        # Validate path to prevent directory traversal attacks
        validate_storage_path(path, settings.local_storage_path)
        content = await storage.get_file_content(path)
        mime_type, _ = mimetypes.guess_type(path)
        return Response(content=content, media_type=mime_type or "application/octet-stream")
    except FileNotFoundError:
        language = get_language_from_request(request)
        error_message = translate_message('resources.file_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
