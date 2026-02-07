from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.file import File
from app.models.document_analysis import DocumentAnalysis
from app.models.user import User
from app.schemas.document_analysis import DocumentAnalysisCreate, DocumentAnalysisResponse, DocumentAnalysisListResponse
from app.services.ai_service import analyze_document
from app.services.storage_service import get_storage_backend, StorageBackend
from app.core.security import get_current_user

router = APIRouter()


@router.post(
    "/projects/{project_id}/files/{file_id}/analyze",
    response_model=DocumentAnalysisResponse,
    status_code=201,
)
async def trigger_analysis(
    project_id: UUID,
    file_id: UUID,
    body: DocumentAnalysisCreate,
    db: AsyncSession = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(File).where(File.id == file_id, File.project_id == project_id)
    )
    file_record = result.scalar_one_or_none()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    record = DocumentAnalysis(
        file_id=file_id,
        project_id=project_id,
        analysis_type=body.analysis_type,
        model_used="",
        status="processing",
    )
    db.add(record)
    await db.flush()

    try:
        content = await storage.get_file_content(file_record.storage_path)
        ai_result = analyze_document(
            file_content=content,
            file_type=file_record.file_type or "application/octet-stream",
            analysis_type=body.analysis_type,
        )
        record.result = ai_result["result"]
        record.model_used = ai_result["model_used"]
        record.processing_time_ms = ai_result["processing_time_ms"]
        record.status = "completed"
    except ValueError as e:
        record.status = "failed"
        record.error_message = str(e)
        record.model_used = "none"
    except Exception as e:
        record.status = "failed"
        record.error_message = str(e)
        record.model_used = "none"

    await db.commit()
    await db.refresh(record)
    return record


@router.get(
    "/projects/{project_id}/files/{file_id}/analysis",
    response_model=list[DocumentAnalysisResponse],
)
async def get_file_analyses(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.file_id == file_id, DocumentAnalysis.project_id == project_id)
        .order_by(DocumentAnalysis.created_at.desc())
    )
    return result.scalars().all()


@router.get(
    "/projects/{project_id}/analyses",
    response_model=DocumentAnalysisListResponse,
)
async def list_project_analyses(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.project_id == project_id)
        .order_by(DocumentAnalysis.created_at.desc())
    )
    analyses = result.scalars().all()
    return DocumentAnalysisListResponse(items=analyses, total=len(analyses))
