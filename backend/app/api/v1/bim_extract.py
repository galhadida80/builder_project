from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.permissions import Permission, require_permission
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.area import ConstructionArea
from app.models.bim import BimModel
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.bim import BimExtractionResponse, BimImportRequest, BimImportResult
from app.services.aps_service import APSService
from app.services.bim_extraction_service import (
    CONFIDENCE_THRESHOLD,
    apply_template_matching,
    extract_bim_metadata,
    load_equipment_templates,
    load_material_templates,
)
from app.services.ifc_extraction_service import extract_from_ifc
from app.services.storage_service import StorageBackend, get_storage_backend

router = APIRouter()


def get_aps_service(settings: Settings = Depends(get_settings)) -> APSService:
    return APSService(settings)


async def get_or_extract_ifc(
    bim_model: BimModel,
    storage: StorageBackend,
    db: AsyncSession,
) -> dict:
    if bim_model.metadata_json and bim_model.metadata_json.get("extracted_at"):
        return bim_model.metadata_json
    if not bim_model.storage_path:
        raise HTTPException(status_code=400, detail="Model file not found in storage")
    metadata = await extract_from_ifc(storage, bim_model.storage_path)
    bim_model.metadata_json = metadata
    await db.commit()
    return metadata


def is_ifc_file(filename: str) -> bool:
    return filename.lower().endswith(".ifc")


async def get_bim_model_or_404(
    project_id: UUID,
    model_id: UUID,
    db: AsyncSession,
) -> BimModel:
    result = await db.execute(
        select(BimModel).where(BimModel.id == model_id, BimModel.project_id == project_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="BIM model not found")
    if model.translation_status != "complete":
        raise HTTPException(status_code=400, detail="Model translation not complete")
    if not is_ifc_file(model.filename) and not model.urn:
        raise HTTPException(status_code=400, detail="Model has no URN")
    return model


@router.get(
    "/projects/{project_id}/bim/{model_id}/extract",
    response_model=BimExtractionResponse,
)
async def extract_bim_data(
    project_id: UUID,
    model_id: UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    aps: APSService = Depends(get_aps_service),
    storage: StorageBackend = Depends(get_storage_backend),
):
    bim_model = await get_bim_model_or_404(project_id, model_id, db)
    eq_templates = await load_equipment_templates(db)
    mat_templates = await load_material_templates(db)
    if is_ifc_file(bim_model.filename):
        metadata = await get_or_extract_ifc(bim_model, storage, db)
        metadata = apply_template_matching(metadata, eq_templates, mat_templates)
    else:
        metadata = await extract_bim_metadata(aps, bim_model, db, eq_templates, mat_templates)
    return BimExtractionResponse(
        model_id=bim_model.id,
        extracted_at=metadata.get("extracted_at"),
        areas=metadata.get("areas", []),
        equipment=metadata.get("equipment", []),
        materials=metadata.get("materials", []),
        total_objects=metadata.get("raw_object_count", 0),
    )


@router.post(
    "/projects/{project_id}/bim/{model_id}/extract/refresh",
    response_model=BimExtractionResponse,
)
async def refresh_extraction(
    project_id: UUID,
    model_id: UUID,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    aps: APSService = Depends(get_aps_service),
    storage: StorageBackend = Depends(get_storage_backend),
):
    bim_model = await get_bim_model_or_404(project_id, model_id, db)
    bim_model.metadata_json = None
    await db.flush()
    eq_templates = await load_equipment_templates(db)
    mat_templates = await load_material_templates(db)
    if is_ifc_file(bim_model.filename):
        metadata = await get_or_extract_ifc(bim_model, storage, db)
        metadata = apply_template_matching(metadata, eq_templates, mat_templates)
    else:
        metadata = await extract_bim_metadata(aps, bim_model, db, eq_templates, mat_templates)
    return BimExtractionResponse(
        model_id=bim_model.id,
        extracted_at=metadata.get("extracted_at"),
        areas=metadata.get("areas", []),
        equipment=metadata.get("equipment", []),
        materials=metadata.get("materials", []),
        total_objects=metadata.get("raw_object_count", 0),
    )


@router.post(
    "/projects/{project_id}/bim/{model_id}/import/areas",
    response_model=BimImportResult,
)
async def import_areas(
    project_id: UUID,
    model_id: UUID,
    body: BimImportRequest,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bim_model = await get_bim_model_or_404(project_id, model_id, db)
    metadata = bim_model.metadata_json or {}
    all_areas = metadata.get("areas", [])
    selected = {item["bim_object_id"]: item for item in all_areas if item["bim_object_id"] in body.items}

    existing_result = await db.execute(
        select(ConstructionArea.name).where(ConstructionArea.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    for obj_id in body.items:
        item = selected.get(obj_id)
        if not item:
            skipped += 1
            continue
        if item["name"].lower() in existing_names:
            skipped += 1
            continue
        area = ConstructionArea(
            project_id=project_id,
            name=item["name"],
            area_type=item.get("area_type"),
            floor_number=item.get("floor_number"),
            area_code=item.get("area_code"),
        )
        db.add(area)
        existing_names.add(item["name"].lower())
        imported += 1

    await db.commit()
    return BimImportResult(imported_count=imported, skipped_count=skipped, entity_type="areas")


@router.post(
    "/projects/{project_id}/bim/{model_id}/import/equipment",
    response_model=BimImportResult,
)
async def import_equipment(
    project_id: UUID,
    model_id: UUID,
    body: BimImportRequest,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bim_model = await get_bim_model_or_404(project_id, model_id, db)
    metadata = bim_model.metadata_json or {}
    all_equipment = metadata.get("equipment", [])

    all_item_ids = set(body.items)
    template_overrides: dict[int, str] = {}
    for mapping in body.item_mappings:
        all_item_ids.add(mapping.bim_object_id)
        if mapping.template_id:
            template_overrides[mapping.bim_object_id] = mapping.template_id

    selected = {item["bim_object_id"]: item for item in all_equipment if item["bim_object_id"] in all_item_ids}

    existing_result = await db.execute(
        select(Equipment.name).where(Equipment.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    linked = 0
    for obj_id in all_item_ids:
        item = selected.get(obj_id)
        if not item:
            skipped += 1
            continue
        if item["name"].lower() in existing_names:
            skipped += 1
            continue
        tpl_id_str = template_overrides.get(obj_id)
        if not tpl_id_str and item.get("confidence", 0) >= CONFIDENCE_THRESHOLD:
            tpl_id_str = item.get("matched_template_id")
        tpl_uuid = UUID(tpl_id_str) if tpl_id_str else None
        equip = Equipment(
            project_id=project_id,
            name=item["name"],
            equipment_type=item.get("equipment_type"),
            manufacturer=item.get("manufacturer"),
            model_number=item.get("model_number"),
            specifications=item.get("specifications"),
            template_id=tpl_uuid,
            created_by_id=current_user.id,
        )
        db.add(equip)
        existing_names.add(item["name"].lower())
        imported += 1
        if tpl_uuid:
            linked += 1

    await db.commit()
    return BimImportResult(imported_count=imported, skipped_count=skipped, linked_count=linked, entity_type="equipment")


@router.post(
    "/projects/{project_id}/bim/{model_id}/import/materials",
    response_model=BimImportResult,
)
async def import_materials(
    project_id: UUID,
    model_id: UUID,
    body: BimImportRequest,
    member: ProjectMember = require_permission(Permission.CREATE),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bim_model = await get_bim_model_or_404(project_id, model_id, db)
    metadata = bim_model.metadata_json or {}
    all_materials = metadata.get("materials", [])

    all_item_ids = set(body.items)
    template_overrides: dict[int, str] = {}
    for mapping in body.item_mappings:
        all_item_ids.add(mapping.bim_object_id)
        if mapping.template_id:
            template_overrides[mapping.bim_object_id] = mapping.template_id

    selected = {item["bim_object_id"]: item for item in all_materials if item["bim_object_id"] in all_item_ids}

    existing_result = await db.execute(
        select(Material.name).where(Material.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    linked = 0
    for obj_id in all_item_ids:
        item = selected.get(obj_id)
        if not item:
            skipped += 1
            continue
        if item["name"].lower() in existing_names:
            skipped += 1
            continue
        tpl_id_str = template_overrides.get(obj_id)
        if not tpl_id_str and item.get("confidence", 0) >= CONFIDENCE_THRESHOLD:
            tpl_id_str = item.get("matched_template_id")
        tpl_uuid = UUID(tpl_id_str) if tpl_id_str else None
        mat = Material(
            project_id=project_id,
            name=item["name"],
            material_type=item.get("material_type"),
            manufacturer=item.get("manufacturer"),
            model_number=item.get("model_number"),
            template_id=tpl_uuid,
            created_by_id=current_user.id,
        )
        db.add(mat)
        existing_names.add(item["name"].lower())
        imported += 1
        if tpl_uuid:
            linked += 1

    await db.commit()
    return BimImportResult(imported_count=imported, skipped_count=skipped, linked_count=linked, entity_type="materials")
