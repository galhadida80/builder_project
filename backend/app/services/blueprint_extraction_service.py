from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from functools import partial
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import ConstructionArea
from app.models.blueprint_extraction import BlueprintExtraction, BlueprintImport
from app.models.equipment import Equipment
from app.models.material import Material
from app.services.quantity_extraction_service import extract_quantities
from app.services.rasterscan_service import extract_with_rasterscan, is_rasterscan_available

logger = logging.getLogger(__name__)

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
IFC_EXTENSIONS = {".ifc"}
BIM_EXTENSIONS = {".rvt", ".nwd", ".nwc", ".dwg"}
ALL_EXTENSIONS = PDF_EXTENSIONS | IMAGE_EXTENSIONS | IFC_EXTENSIONS | BIM_EXTENSIONS


def detect_document_type(filename: str) -> str:
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in PDF_EXTENSIONS:
        return "pdf_quantity"
    if ext in IMAGE_EXTENSIONS:
        return "image_plan"
    if ext in IFC_EXTENSIONS:
        return "bim_ifc"
    if ext in BIM_EXTENSIONS:
        return "bim_aps"
    raise ValueError(f"Unsupported file type: {ext}")


def normalize_pdf_result(quantity_data: dict) -> dict:
    result = quantity_data.get("result", {})
    if not isinstance(result, dict):
        result = {}
    floors = result.get("floors", [])
    summary = result.get("summary", {})
    return {
        "floors": floors,
        "summary": summary,
        "areas": [],
        "equipment": [],
        "materials": [],
    }


def normalize_bim_result(bim_metadata: dict) -> dict:
    return {
        "floors": [],
        "summary": {
            "total_areas": len(bim_metadata.get("areas", [])),
            "total_equipment": len(bim_metadata.get("equipment", [])),
            "total_materials": len(bim_metadata.get("materials", [])),
            "raw_object_count": bim_metadata.get("raw_object_count", 0),
        },
        "areas": bim_metadata.get("areas", []),
        "equipment": bim_metadata.get("equipment", []),
        "materials": bim_metadata.get("materials", []),
        "extracted_at": bim_metadata.get("extracted_at"),
    }


def build_summary_from_pdf(quantity_data: dict) -> dict:
    result = quantity_data.get("result", {})
    if not isinstance(result, dict):
        return {}
    summary = result.get("summary", {})
    return {
        "total_floors": summary.get("total_floors", 0),
        "total_rooms": summary.get("total_rooms", 0),
        "total_area_sqm": summary.get("total_area_sqm", 0),
        "total_doors": summary.get("total_doors", 0),
        "total_windows": summary.get("total_windows", 0),
    }


def build_summary_from_bim(bim_metadata: dict) -> dict:
    return {
        "total_areas": len(bim_metadata.get("areas", [])),
        "total_equipment": len(bim_metadata.get("equipment", [])),
        "total_materials": len(bim_metadata.get("materials", [])),
        "raw_object_count": bim_metadata.get("raw_object_count", 0),
    }


async def run_pdf_extraction(
    extraction: BlueprintExtraction,
    file_content: bytes,
    language: str,
    db: AsyncSession,
) -> None:
    try:
        extraction.status = "processing"
        await db.commit()

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(extract_quantities, file_content=file_content, file_type="application/pdf", language=language),
        )

        extraction.extracted_data = normalize_pdf_result(result)
        extraction.summary = build_summary_from_pdf(result)
        extraction.tier_used = result.get("tier")
        extraction.processing_time_ms = result.get("processing_time_ms", 0)
        extraction.status = "completed"
        await db.commit()
    except Exception as e:
        logger.error(f"PDF extraction failed for {extraction.id}: {e}")
        extraction.status = "failed"
        extraction.error_message = str(e)[:2000]
        await db.commit()


async def run_ifc_extraction(
    extraction: BlueprintExtraction,
    storage: Any,
    storage_path: str,
    db: AsyncSession,
) -> None:
    from app.services.ifc_extraction_service import extract_from_ifc

    try:
        extraction.status = "processing"
        await db.commit()

        metadata = await extract_from_ifc(storage, storage_path)

        extraction.extracted_data = normalize_bim_result(metadata)
        extraction.summary = build_summary_from_bim(metadata)
        extraction.status = "completed"
        await db.commit()
    except Exception as e:
        logger.error(f"IFC extraction failed for {extraction.id}: {e}")
        extraction.status = "failed"
        extraction.error_message = str(e)[:2000]
        await db.commit()


async def run_image_extraction(
    extraction: BlueprintExtraction,
    image_bytes: bytes,
    db: AsyncSession,
) -> None:
    if not is_rasterscan_available():
        extraction.status = "failed"
        extraction.error_message = "RasterScan service not configured"
        await db.commit()
        return

    try:
        extraction.status = "processing"
        await db.commit()

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            partial(extract_with_rasterscan, image_bytes),
        )

        rs_result = result.get("result", {})
        extraction.extracted_data = normalize_pdf_result({"result": rs_result})
        extraction.summary = build_summary_from_pdf({"result": rs_result})
        extraction.tier_used = "rasterscan"
        extraction.status = "completed"
        await db.commit()
    except Exception as e:
        logger.error(f"Image extraction failed for {extraction.id}: {e}")
        extraction.status = "failed"
        extraction.error_message = str(e)[:2000]
        await db.commit()


async def import_areas_from_pdf(
    extraction: BlueprintExtraction,
    floor_indices: list[int],
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> tuple[int, int, list[str]]:
    data = extraction.extracted_data or {}
    floors = data.get("floors", [])

    existing_result = await db.execute(
        select(ConstructionArea.name).where(ConstructionArea.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    imported_ids: list[str] = []

    indices = floor_indices if floor_indices else list(range(len(floors)))

    for idx in indices:
        if idx < 0 or idx >= len(floors):
            skipped += 1
            continue
        floor = floors[idx]
        floor_name = floor.get("floor_name", f"Floor {floor.get('floor_number', idx)}")
        floor_number = floor.get("floor_number", idx)

        if floor_name.lower() in existing_names:
            parent_result = await db.execute(
                select(ConstructionArea).where(
                    ConstructionArea.project_id == project_id,
                    ConstructionArea.name == floor_name,
                )
            )
            parent_area = parent_result.scalar_one_or_none()
            parent_id = parent_area.id if parent_area else None
        else:
            parent_area = ConstructionArea(
                project_id=project_id,
                name=floor_name,
                floor_number=floor_number,
                area_type="floor",
            )
            db.add(parent_area)
            await db.flush()
            parent_id = parent_area.id
            existing_names.add(floor_name.lower())
            imported += 1
            imported_ids.append(str(parent_area.id))

        for room in floor.get("rooms", []):
            room_name = room.get("name", "Unknown Room")
            if room_name.lower() in existing_names:
                skipped += 1
                continue
            room_area = ConstructionArea(
                project_id=project_id,
                parent_id=parent_id,
                name=room_name,
                area_type=room.get("room_type"),
                floor_number=floor_number,
            )
            db.add(room_area)
            await db.flush()
            existing_names.add(room_name.lower())
            imported += 1
            imported_ids.append(str(room_area.id))

    await db.commit()
    return imported, skipped, imported_ids


async def import_areas_from_bim(
    extraction: BlueprintExtraction,
    items: list[int],
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> tuple[int, int, list[str]]:
    data = extraction.extracted_data or {}
    all_areas = data.get("areas", [])
    selected = {a["bim_object_id"]: a for a in all_areas if a.get("bim_object_id") in items}

    existing_result = await db.execute(
        select(ConstructionArea.name).where(ConstructionArea.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    imported_ids: list[str] = []

    for obj_id in items:
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
        await db.flush()
        existing_names.add(item["name"].lower())
        imported += 1
        imported_ids.append(str(area.id))

    await db.commit()
    return imported, skipped, imported_ids


async def import_equipment(
    extraction: BlueprintExtraction,
    items: list[int],
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> tuple[int, int, list[str]]:
    data = extraction.extracted_data or {}
    all_equipment = data.get("equipment", [])
    selected = {e["bim_object_id"]: e for e in all_equipment if e.get("bim_object_id") in items}

    existing_result = await db.execute(
        select(Equipment.name).where(Equipment.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    imported_ids: list[str] = []

    for obj_id in items:
        item = selected.get(obj_id)
        if not item:
            skipped += 1
            continue
        if item["name"].lower() in existing_names:
            skipped += 1
            continue
        equip = Equipment(
            project_id=project_id,
            name=item["name"],
            equipment_type=item.get("equipment_type"),
            manufacturer=item.get("manufacturer"),
            model_number=item.get("model_number"),
            specifications=item.get("specifications"),
            created_by_id=user_id,
        )
        db.add(equip)
        await db.flush()
        existing_names.add(item["name"].lower())
        imported += 1
        imported_ids.append(str(equip.id))

    await db.commit()
    return imported, skipped, imported_ids


async def import_materials(
    extraction: BlueprintExtraction,
    items: list[int],
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> tuple[int, int, list[str]]:
    data = extraction.extracted_data or {}
    all_materials = data.get("materials", [])
    selected = {m["bim_object_id"]: m for m in all_materials if m.get("bim_object_id") in items}

    existing_result = await db.execute(
        select(Material.name).where(Material.project_id == project_id)
    )
    existing_names = {row[0].lower() for row in existing_result.all()}

    imported = 0
    skipped = 0
    imported_ids: list[str] = []

    for obj_id in items:
        item = selected.get(obj_id)
        if not item:
            skipped += 1
            continue
        if item["name"].lower() in existing_names:
            skipped += 1
            continue
        mat = Material(
            project_id=project_id,
            name=item["name"],
            material_type=item.get("material_type"),
            manufacturer=item.get("manufacturer"),
            model_number=item.get("model_number"),
            created_by_id=user_id,
        )
        db.add(mat)
        await db.flush()
        existing_names.add(item["name"].lower())
        imported += 1
        imported_ids.append(str(mat.id))

    await db.commit()
    return imported, skipped, imported_ids
