import asyncio
import tempfile
from datetime import datetime, timezone
from typing import Any, Optional

import ifcopenshell

from app.services.storage_service import StorageBackend
from app.utils import utcnow


IFC_EQUIPMENT_TYPES = {
    "IfcDistributionElement",
    "IfcDistributionFlowElement",
    "IfcDistributionControlElement",
    "IfcEnergyConversionDevice",
    "IfcFlowController",
    "IfcFlowFitting",
    "IfcFlowMovingDevice",
    "IfcFlowSegment",
    "IfcFlowStorageDevice",
    "IfcFlowTerminal",
    "IfcFlowTreatmentDevice",
    "IfcElectricAppliance",
    "IfcElectricGenerator",
    "IfcElectricMotor",
    "IfcPump",
    "IfcFan",
    "IfcCompressor",
    "IfcBoiler",
    "IfcChiller",
    "IfcCoolingTower",
    "IfcUnitaryEquipment",
    "IfcSanitaryTerminal",
    "IfcFireSuppressionTerminal",
}

IFC_MATERIAL_TYPES = {
    "IfcWall",
    "IfcWallStandardCase",
    "IfcSlab",
    "IfcColumn",
    "IfcBeam",
    "IfcDoor",
    "IfcWindow",
    "IfcCovering",
    "IfcCurtainWall",
    "IfcRoof",
    "IfcStair",
    "IfcRailing",
    "IfcPlate",
    "IfcFooting",
    "IfcPile",
    "IfcMember",
}


def get_pset_value(element, pset_name: str, prop_name: str) -> Optional[str]:
    try:
        psets = ifcopenshell.util.element.get_psets(element)
    except Exception:
        return None
    pset = psets.get(pset_name, {})
    val = pset.get(prop_name)
    if val and str(val).strip():
        return str(val).strip()
    return None


def search_psets(element, *prop_names: str) -> Optional[str]:
    try:
        psets = ifcopenshell.util.element.get_psets(element)
    except Exception:
        return None
    for pset_data in psets.values():
        for prop_name in prop_names:
            val = pset_data.get(prop_name)
            if val and str(val).strip():
                return str(val).strip()
    return None


def get_storey_name(element) -> Optional[str]:
    try:
        for rel in getattr(element, "ContainedInStructure", []):
            structure = rel.RelatingStructure
            if structure.is_a("IfcBuildingStorey"):
                return structure.Name
        decomposes = getattr(element, "Decomposes", [])
        for rel in decomposes:
            parent = rel.RelatingObject
            if parent.is_a("IfcBuildingStorey"):
                return parent.Name
    except Exception:
        pass
    return None


def parse_floor_number(storey_name: Optional[str]) -> Optional[int]:
    if not storey_name:
        return None
    import re
    match = re.search(r"(?:Level|Floor|Storey|level|floor|storey)\s*[-:]?\s*(\d+)", storey_name, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match = re.search(r"(?:Basement|basement|B)\s*[-:]?\s*(\d+)?", storey_name)
    if match:
        num = int(match.group(1)) if match.group(1) else 1
        return -num
    digits = re.findall(r"(-?\d+)", storey_name)
    if digits:
        return int(digits[0])
    return None


def extract_areas(ifc_file) -> list[dict[str, Any]]:
    areas = []
    for space in ifc_file.by_type("IfcSpace"):
        name = space.Name or space.LongName or f"Space {space.id()}"
        storey = get_storey_name(space)
        area_code = get_pset_value(space, "Pset_SpaceCommon", "Reference") or search_psets(space, "Number", "SpaceNumber", "Reference")
        area_type = search_psets(space, "OccupancyType", "Category", "SpaceType", "Department")
        areas.append({
            "bim_object_id": space.id(),
            "name": name,
            "area_type": area_type,
            "floor_number": parse_floor_number(storey),
            "area_code": area_code,
        })
    return areas


def extract_equipment(ifc_file) -> list[dict[str, Any]]:
    equipment = []
    seen_ids = set()
    for ifc_type in IFC_EQUIPMENT_TYPES:
        for element in ifc_file.by_type(ifc_type):
            if element.id() in seen_ids:
                continue
            seen_ids.add(element.id())
            name = element.Name or f"Equipment {element.id()}"
            equipment_type = element.is_a().replace("Ifc", "")
            manufacturer = search_psets(element, "Manufacturer", "manufacturer")
            model_number = search_psets(element, "ModelReference", "ModelNumber", "Model", "ArticleNumber")
            equipment.append({
                "bim_object_id": element.id(),
                "name": name,
                "equipment_type": equipment_type,
                "manufacturer": manufacturer,
                "model_number": model_number,
                "specifications": None,
            })
    return equipment


def extract_materials(ifc_file) -> list[dict[str, Any]]:
    materials = []
    seen_ids = set()
    for ifc_type in IFC_MATERIAL_TYPES:
        for element in ifc_file.by_type(ifc_type):
            if element.id() in seen_ids:
                continue
            seen_ids.add(element.id())
            name = element.Name or f"Element {element.id()}"
            material_type = element.is_a().replace("Ifc", "")
            manufacturer = search_psets(element, "Manufacturer", "manufacturer")
            model_number = search_psets(element, "ModelReference", "ModelNumber", "Model", "ArticleNumber")
            materials.append({
                "bim_object_id": element.id(),
                "name": name,
                "material_type": material_type,
                "manufacturer": manufacturer,
                "model_number": model_number,
            })
    return materials


def parse_ifc_file(file_bytes: bytes) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=True) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        ifc_file = ifcopenshell.open(tmp.name)

    areas = extract_areas(ifc_file)
    equipment_items = extract_equipment(ifc_file)
    material_items = extract_materials(ifc_file)
    total = len(areas) + len(equipment_items) + len(material_items)

    return {
        "extracted_at": utcnow().isoformat(),
        "areas": areas,
        "equipment": equipment_items,
        "materials": material_items,
        "raw_object_count": total,
    }


async def extract_from_ifc(storage: StorageBackend, storage_path: str) -> dict[str, Any]:
    file_bytes = await storage.get_file_content(storage_path)
    return await asyncio.to_thread(parse_ifc_file, file_bytes)
