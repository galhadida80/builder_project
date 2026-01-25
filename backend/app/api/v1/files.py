from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.file import File
from app.models.user import User
from app.schemas.file import FileResponse
from app.services.audit_service import create_audit_log, get_model_dict
from app.models.audit import AuditAction
from app.core.security import get_current_user

router = APIRouter()


@router.get("/projects/{project_id}/files", response_model=list[FileResponse])
async def list_files(
    project_id: UUID,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(File).where(File.project_id == project_id)
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
    current_user: User = Depends(get_current_user)
):
    storage_path = f"projects/{project_id}/{entity_type}/{entity_id}/{file.filename}"

    file_record = File(
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        filename=file.filename,
        file_type=file.content_type or "application/octet-stream",
        file_size=0,
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

    await db.refresh(file_record)
    return file_record


@router.get("/projects/{project_id}/files/{file_id}", response_model=FileResponse)
async def get_file(project_id: UUID, file_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(File).where(File.id == file_id, File.project_id == project_id)
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    return file_record


@router.delete("/projects/{project_id}/files/{file_id}")
async def delete_file(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(File).where(File.id == file_id))
    file_record = result.scalar_one_or_none()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    await create_audit_log(
        db, current_user, "file", file_record.id, AuditAction.DELETE,
        project_id=project_id, old_values=get_model_dict(file_record)
    )

    await db.delete(file_record)
    return {"message": "File deleted"}


@router.get("/projects/{project_id}/files/{file_id}/download")
async def download_file(project_id: UUID, file_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(File).where(File.id == file_id, File.project_id == project_id)
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    return {"download_url": f"/storage/{file_record.storage_path}"}
