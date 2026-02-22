from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.document_version import DocumentAnnotation, DocumentVersion
from app.models.file import File
from app.models.user import User
from app.schemas.document_version import (
    AnnotationCreate,
    AnnotationResponse,
    AnnotationUpdate,
    DocumentVersionCreate,
    DocumentVersionResponse,
)

router = APIRouter()


@router.get(
    "/projects/{project_id}/files/{file_id}/versions",
    response_model=list[DocumentVersionResponse],
)
async def list_versions(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.uploaded_by))
        .where(DocumentVersion.file_id == file_id)
        .order_by(DocumentVersion.version_number.desc())
    )
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/files/{file_id}/versions",
    response_model=DocumentVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_version(
    project_id: UUID,
    file_id: UUID,
    data: DocumentVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    file_result = await db.execute(select(File).where(File.id == file_id, File.project_id == project_id))
    file = file_result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    max_ver = await db.execute(
        select(func.max(DocumentVersion.version_number)).where(DocumentVersion.file_id == file_id)
    )
    next_version = (max_ver.scalar() or 0) + 1

    version = DocumentVersion(
        file_id=file_id,
        version_number=next_version,
        filename=file.filename,
        storage_path=file.storage_path,
        file_size=file.file_size,
        change_summary=data.change_summary,
        uploaded_by_id=current_user.id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version, ["uploaded_by"])
    return version


@router.get(
    "/projects/{project_id}/files/{file_id}/annotations",
    response_model=list[AnnotationResponse],
)
async def list_annotations(
    project_id: UUID,
    file_id: UUID,
    page_number: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    query = (
        select(DocumentAnnotation)
        .options(selectinload(DocumentAnnotation.created_by))
        .where(DocumentAnnotation.file_id == file_id)
    )
    if page_number is not None:
        query = query.where(DocumentAnnotation.page_number == page_number)

    query = query.order_by(DocumentAnnotation.created_at.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/files/{file_id}/annotations",
    response_model=AnnotationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_annotation(
    project_id: UUID,
    file_id: UUID,
    data: AnnotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    annotation = DocumentAnnotation(
        file_id=file_id,
        page_number=data.page_number,
        x_position=data.x_position,
        y_position=data.y_position,
        width=data.width,
        height=data.height,
        annotation_type=data.annotation_type,
        content=data.content,
        color=data.color,
        created_by_id=current_user.id,
    )
    db.add(annotation)
    await db.commit()
    await db.refresh(annotation, ["created_by"])
    return annotation


@router.patch(
    "/annotations/{annotation_id}",
    response_model=AnnotationResponse,
)
async def update_annotation(
    annotation_id: UUID,
    data: AnnotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DocumentAnnotation)
        .options(selectinload(DocumentAnnotation.created_by))
        .where(DocumentAnnotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    if annotation.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(annotation, key, value)
    await db.commit()
    await db.refresh(annotation, ["created_by"])
    return annotation


@router.delete("/annotations/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(
    annotation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DocumentAnnotation).where(DocumentAnnotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    if annotation.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(annotation)
    await db.commit()
    return None
