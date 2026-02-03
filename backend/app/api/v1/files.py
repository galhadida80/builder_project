from __future__ import annotations
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.file import File
from app.models.user import User
from app.schemas.file import FileResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.services.storage_service import get_storage_backend, generate_storage_path, StorageBackend
from app.models.audit import AuditAction
from app.core.security import get_current_user
from app.utils.localization import get_language_from_request, translate_message

router = APIRouter()


@router.get("/projects/{project_id}/files", response_model=list[FileResponse])
async def list_files(
    project_id: UUID,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend)
):
    # storage = get_storage_backend()  # No longer needed
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
async def get_file(project_id: UUID, file_id: UUID, db: AsyncSession = Depends(get_db), request: Request = None):
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

    # storage = get_storage_backend()  # No longer needed
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


@router.get("/projects/{project_id}/files/{file_id}/download")
async def download_file(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    request: Request = None
):
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
async def serve_local_file(path: str, storage: StorageBackend = Depends(get_storage_backend), request: Request = None):
    # storage = get_storage_backend()  # No longer needed
    try:
        content = await storage.get_file_content(path)
        return Response(content=content, media_type="application/octet-stream")
    except FileNotFoundError:
        language = get_language_from_request(request)
        error_message = translate_message('resources.file_not_found', language)
        raise HTTPException(status_code=404, detail=error_message)
