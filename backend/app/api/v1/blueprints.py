from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi import File as FastAPIFile
from fastapi import Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings, get_settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.bim import BimModel
from app.models.blueprint_extraction import BlueprintExtraction, BlueprintImport
from app.models.file import File
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.blueprint import (
    BlueprintExtractionListItem,
    BlueprintExtractionResponse,
    BlueprintImportRequest,
    BlueprintImportResult,
    BlueprintUploadResponse,
)
from app.services.aps_service import APSService
from app.services.blueprint_extraction_service import (
    ALL_EXTENSIONS,
    detect_document_type,
    import_areas_from_bim,
    import_areas_from_pdf,
    import_equipment,
    import_materials,
    run_ifc_extraction,
    run_image_extraction,
    run_pdf_extraction,
)
from app.services.storage_service import StorageBackend, generate_storage_path, get_storage_backend

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def get_aps_service(settings: Settings = Depends(get_settings)) -> APSService:
    return APSService(settings)


def extraction_to_response(ext: BlueprintExtraction) -> dict:
    data = {
        "id": ext.id,
        "project_id": ext.project_id,
        "file_id": ext.file_id,
        "bim_model_id": ext.bim_model_id,
        "extraction_source": ext.extraction_source,
        "status": ext.status,
        "extracted_data": ext.extracted_data,
        "summary": ext.summary,
        "tier_used": ext.tier_used,
        "processing_time_ms": ext.processing_time_ms,
        "error_message": ext.error_message,
        "language": ext.language,
        "version": ext.version,
        "created_at": ext.created_at,
        "updated_at": ext.updated_at,
        "filename": None,
    }
    if ext.file:
        data["filename"] = ext.file.filename
    elif ext.bim_model:
        data["filename"] = ext.bim_model.filename
    return data


@router.post(
    "/projects/{project_id}/blueprints/upload",
    response_model=BlueprintUploadResponse,
)
async def upload_blueprint(
    project_id: UUID,
    file: UploadFile = FastAPIFile(...),
    language: str = Query(default="he", pattern="^(he|en)$"),
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
    aps: APSService = Depends(get_aps_service),
    settings: Settings = Depends(get_settings),
):
    filename = file.filename or "unnamed"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALL_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Accepted: {', '.join(sorted(ALL_EXTENSIONS))}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 100MB limit")

    source = detect_document_type(filename)

    extraction_id = None

    if source == "pdf_quantity":
        storage_path = generate_storage_path(
            user_id=current_user.id,
            project_id=project_id,
            entity_type="blueprint",
            entity_id=project_id,
            filename=filename,
        )
        file.file.seek(0)
        file_size = await storage.save_file(file, storage_path)

        file_record = File(
            project_id=project_id,
            entity_type="blueprint",
            entity_id=project_id,
            filename=filename,
            file_type=file.content_type or "application/pdf",
            file_size=file_size,
            storage_path=storage_path,
            uploaded_by_id=current_user.id,
        )
        db.add(file_record)
        await db.flush()

        extraction = BlueprintExtraction(
            project_id=project_id,
            file_id=file_record.id,
            extraction_source=source,
            status="pending",
            language=language,
            created_by_id=current_user.id,
        )
        db.add(extraction)
        await db.flush()
        extraction_id = extraction.id

        await run_pdf_extraction(extraction, content, language, db)

    elif source == "image_plan":
        storage_path = generate_storage_path(
            user_id=current_user.id,
            project_id=project_id,
            entity_type="blueprint",
            entity_id=project_id,
            filename=filename,
        )
        file.file.seek(0)
        file_size = await storage.save_file(file, storage_path)

        file_record = File(
            project_id=project_id,
            entity_type="blueprint",
            entity_id=project_id,
            filename=filename,
            file_type=file.content_type or "image/png",
            file_size=file_size,
            storage_path=storage_path,
            uploaded_by_id=current_user.id,
        )
        db.add(file_record)
        await db.flush()

        extraction = BlueprintExtraction(
            project_id=project_id,
            file_id=file_record.id,
            extraction_source=source,
            status="pending",
            language=language,
            created_by_id=current_user.id,
        )
        db.add(extraction)
        await db.flush()
        extraction_id = extraction.id

        await run_image_extraction(extraction, content, db)

    elif source == "bim_ifc":
        storage_path = generate_storage_path(
            user_id=current_user.id,
            project_id=project_id,
            entity_type="blueprint",
            entity_id=project_id,
            filename=filename,
        )
        file.file.seek(0)
        file_size = await storage.save_file(file, storage_path)

        bim_model = BimModel(
            project_id=project_id,
            filename=filename,
            file_size=file_size,
            storage_path=storage_path,
            translation_status="complete",
            translation_progress=100,
            uploaded_by_id=current_user.id,
        )
        db.add(bim_model)
        await db.flush()

        extraction = BlueprintExtraction(
            project_id=project_id,
            bim_model_id=bim_model.id,
            extraction_source=source,
            status="pending",
            language=language,
            created_by_id=current_user.id,
        )
        db.add(extraction)
        await db.flush()
        extraction_id = extraction.id

        await run_ifc_extraction(extraction, storage, storage_path, db)

    elif source == "bim_aps":
        storage_path = generate_storage_path(
            user_id=current_user.id,
            project_id=project_id,
            entity_type="blueprint",
            entity_id=project_id,
            filename=filename,
        )
        file.file.seek(0)
        file_size = await storage.save_file(file, storage_path)

        bim_model = BimModel(
            project_id=project_id,
            filename=filename,
            file_size=file_size,
            storage_path=storage_path,
            translation_status="uploaded",
            translation_progress=0,
            uploaded_by_id=current_user.id,
        )
        db.add(bim_model)
        await db.flush()

        try:
            urn = await aps.upload_file(content, filename)
            bim_model.urn = urn
            await db.flush()
        except Exception as e:
            logger.warning(f"APS upload failed: {e}")

        extraction = BlueprintExtraction(
            project_id=project_id,
            bim_model_id=bim_model.id,
            extraction_source=source,
            status="processing",
            language=language,
            created_by_id=current_user.id,
        )
        db.add(extraction)
        await db.flush()
        extraction_id = extraction.id
        await db.commit()

    await db.refresh(extraction)
    return BlueprintUploadResponse(
        id=extraction.id,
        status=extraction.status,
        extraction_source=source,
        filename=filename,
    )


@router.get(
    "/projects/{project_id}/blueprints",
    response_model=list[BlueprintExtractionListItem],
)
async def list_extractions(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.project_id == project_id)
        .options(selectinload(BlueprintExtraction.file), selectinload(BlueprintExtraction.bim_model))
        .order_by(BlueprintExtraction.created_at.desc())
    )
    extractions = result.scalars().all()
    return [BlueprintExtractionListItem(**extraction_to_response(e)) for e in extractions]


@router.get(
    "/projects/{project_id}/blueprints/{extraction_id}",
    response_model=BlueprintExtractionResponse,
)
async def get_extraction(
    project_id: UUID,
    extraction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.id == extraction_id, BlueprintExtraction.project_id == project_id)
        .options(selectinload(BlueprintExtraction.file), selectinload(BlueprintExtraction.bim_model))
    )
    extraction = result.scalar_one_or_none()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return BlueprintExtractionResponse(**extraction_to_response(extraction))


@router.post(
    "/projects/{project_id}/blueprints/{extraction_id}/re-extract",
    response_model=BlueprintExtractionResponse,
)
async def re_extract(
    project_id: UUID,
    extraction_id: UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.id == extraction_id, BlueprintExtraction.project_id == project_id)
        .options(selectinload(BlueprintExtraction.file), selectinload(BlueprintExtraction.bim_model))
    )
    extraction = result.scalar_one_or_none()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")

    extraction.version += 1
    extraction.extracted_data = None
    extraction.summary = None
    extraction.error_message = None
    extraction.status = "pending"
    await db.flush()

    if extraction.extraction_source == "pdf_quantity" and extraction.file:
        file_content = await storage.get_file_content(extraction.file.storage_path)
        await run_pdf_extraction(extraction, file_content, extraction.language, db)
    elif extraction.extraction_source == "bim_ifc" and extraction.bim_model:
        await run_ifc_extraction(extraction, storage, extraction.bim_model.storage_path, db)

    await db.refresh(extraction)
    return BlueprintExtractionResponse(**extraction_to_response(extraction))


@router.post(
    "/projects/{project_id}/blueprints/{extraction_id}/import/areas",
    response_model=BlueprintImportResult,
)
async def import_areas_endpoint(
    project_id: UUID,
    extraction_id: UUID,
    body: BlueprintImportRequest,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.id == extraction_id, BlueprintExtraction.project_id == project_id)
    )
    extraction = result.scalar_one_or_none()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")
    if extraction.status != "completed":
        raise HTTPException(status_code=400, detail="Extraction not completed")

    if extraction.extraction_source == "pdf_quantity":
        imported, skipped, ids = await import_areas_from_pdf(
            extraction, body.floor_indices, project_id, current_user.id, db,
        )
    else:
        imported, skipped, ids = await import_areas_from_bim(
            extraction, body.items, project_id, current_user.id, db,
        )

    import_record = BlueprintImport(
        extraction_id=extraction_id,
        project_id=project_id,
        entity_type="area",
        imported_count=imported,
        skipped_count=skipped,
        imported_entity_ids=ids,
        created_by_id=current_user.id,
    )
    db.add(import_record)
    await db.commit()

    return BlueprintImportResult(
        imported_count=imported,
        skipped_count=skipped,
        entity_type="area",
        imported_entity_ids=ids,
    )


@router.post(
    "/projects/{project_id}/blueprints/{extraction_id}/import/equipment",
    response_model=BlueprintImportResult,
)
async def import_equipment_endpoint(
    project_id: UUID,
    extraction_id: UUID,
    body: BlueprintImportRequest,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.id == extraction_id, BlueprintExtraction.project_id == project_id)
    )
    extraction = result.scalar_one_or_none()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")
    if extraction.status != "completed":
        raise HTTPException(status_code=400, detail="Extraction not completed")

    imported, skipped, ids = await import_equipment(
        extraction, body.items, project_id, current_user.id, db,
    )

    import_record = BlueprintImport(
        extraction_id=extraction_id,
        project_id=project_id,
        entity_type="equipment",
        imported_count=imported,
        skipped_count=skipped,
        imported_entity_ids=ids,
        created_by_id=current_user.id,
    )
    db.add(import_record)
    await db.commit()

    return BlueprintImportResult(
        imported_count=imported,
        skipped_count=skipped,
        entity_type="equipment",
        imported_entity_ids=ids,
    )


@router.post(
    "/projects/{project_id}/blueprints/{extraction_id}/import/materials",
    response_model=BlueprintImportResult,
)
async def import_materials_endpoint(
    project_id: UUID,
    extraction_id: UUID,
    body: BlueprintImportRequest,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.id == extraction_id, BlueprintExtraction.project_id == project_id)
    )
    extraction = result.scalar_one_or_none()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")
    if extraction.status != "completed":
        raise HTTPException(status_code=400, detail="Extraction not completed")

    imported, skipped, ids = await import_materials(
        extraction, body.items, project_id, current_user.id, db,
    )

    import_record = BlueprintImport(
        extraction_id=extraction_id,
        project_id=project_id,
        entity_type="material",
        imported_count=imported,
        skipped_count=skipped,
        imported_entity_ids=ids,
        created_by_id=current_user.id,
    )
    db.add(import_record)
    await db.commit()

    return BlueprintImportResult(
        imported_count=imported,
        skipped_count=skipped,
        entity_type="material",
        imported_entity_ids=ids,
    )


@router.delete("/projects/{project_id}/blueprints/{extraction_id}")
async def delete_extraction(
    project_id: UUID,
    extraction_id: UUID,
    member: ProjectMember = require_permission(Permission.DELETE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage_backend),
):
    result = await db.execute(
        select(BlueprintExtraction)
        .where(BlueprintExtraction.id == extraction_id, BlueprintExtraction.project_id == project_id)
        .options(selectinload(BlueprintExtraction.file))
    )
    extraction = result.scalar_one_or_none()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")

    if extraction.file:
        try:
            await storage.delete_file(extraction.file.storage_path)
        except Exception:
            pass
        await db.delete(extraction.file)

    await db.delete(extraction)
    await db.commit()
    return {"message": "Extraction deleted"}
