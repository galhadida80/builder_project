import re
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bim import BimModel
from app.services.aps_service import APSService


ROOM_CATEGORIES = {"Revit Rooms", "Rooms", "Revit Spaces", "Spaces"}

EQUIPMENT_CATEGORIES = {
    "Revit Mechanical Equipment",
    "Mechanical Equipment",
    "Revit Electrical Equipment",
    "Electrical Equipment",
    "Revit Plumbing Fixtures",
    "Plumbing Fixtures",
    "Revit Fire Protection",
    "Fire Protection",
    "Revit Electrical Fixtures",
    "Electrical Fixtures",
}

MATERIAL_CATEGORIES = {
    "Revit Materials",
    "Materials",
    "Revit Finishes",
    "Finishes",
}

LEVEL_PATTERN = re.compile(r"(?:Level|Floor|level|floor)\s*[-:]?\s*(\d+)", re.IGNORECASE)
BASEMENT_PATTERN = re.compile(r"(?:Basement|basement|B)\s*[-:]?\s*(\d+)?", re.IGNORECASE)


def parse_level_to_floor(level_name: Optional[str]) -> Optional[int]:
    if not level_name:
        return None
    match = LEVEL_PATTERN.search(level_name)
    if match:
        return int(match.group(1))
    match = BASEMENT_PATTERN.search(level_name)
    if match:
        num = int(match.group(1)) if match.group(1) else 1
        return -num
    digits = re.findall(r"(-?\d+)", level_name)
    if digits:
        return int(digits[0])
    return None


def get_property(props: dict[str, Any], *keys: str) -> Optional[str]:
    for key in keys:
        val = props.get(key)
        if val and str(val).strip():
            return str(val).strip()
    return None


def build_properties_map(properties_list: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    result: dict[int, dict[str, Any]] = {}
    for item in properties_list:
        obj_id = item.get("objectid")
        if obj_id is None:
            continue
        flat: dict[str, Any] = {"name": item.get("name", ""), "objectid": obj_id}
        for prop_group in item.get("properties", {}).values():
            if isinstance(prop_group, dict):
                flat.update(prop_group)
        result[obj_id] = flat
    return result


def map_rooms_to_areas(
    properties_list: list[dict[str, Any]],
    category_map: dict[int, str],
) -> list[dict[str, Any]]:
    props_map = build_properties_map(properties_list)
    areas = []
    for obj_id, category in category_map.items():
        if category not in ROOM_CATEGORIES:
            continue
        props = props_map.get(obj_id, {})
        name = get_property(props, "name", "Name", "Room Name") or f"Room {obj_id}"
        level = get_property(props, "Level", "level", "Reference Level")
        area_type = get_property(props, "Department", "department", "Room Type")
        area_code = get_property(props, "Number", "number", "Room Number")
        areas.append({
            "bim_object_id": obj_id,
            "name": name,
            "area_type": area_type,
            "floor_number": parse_level_to_floor(level),
            "area_code": area_code,
        })
    return areas


def map_equipment(
    properties_list: list[dict[str, Any]],
    category_map: dict[int, str],
) -> list[dict[str, Any]]:
    props_map = build_properties_map(properties_list)
    equipment = []
    for obj_id, category in category_map.items():
        if category not in EQUIPMENT_CATEGORIES:
            continue
        props = props_map.get(obj_id, {})
        name = get_property(props, "name", "Name", "Type Name") or f"Equipment {obj_id}"
        equipment.append({
            "bim_object_id": obj_id,
            "name": name,
            "equipment_type": get_property(props, "Type", "type", "Family", "Category"),
            "manufacturer": get_property(props, "Manufacturer", "manufacturer"),
            "model_number": get_property(props, "Model", "model", "Type Name"),
            "specifications": None,
        })
    return equipment


def map_materials(
    properties_list: list[dict[str, Any]],
    category_map: dict[int, str],
) -> list[dict[str, Any]]:
    props_map = build_properties_map(properties_list)
    materials = []
    for obj_id, category in category_map.items():
        if category not in MATERIAL_CATEGORIES:
            continue
        props = props_map.get(obj_id, {})
        name = get_property(props, "name", "Name") or f"Material {obj_id}"
        materials.append({
            "bim_object_id": obj_id,
            "name": name,
            "material_type": get_property(props, "Type", "type", "Material Class", "Category"),
            "manufacturer": get_property(props, "Manufacturer", "manufacturer"),
            "model_number": get_property(props, "Model", "model"),
        })
    return materials


def build_category_map(tree_data: dict[str, Any]) -> dict[int, str]:
    category_map: dict[int, str] = {}
    objects = tree_data.get("data", {}).get("objects", [])

    def walk(nodes: list[dict[str, Any]], parent_category: str = "") -> None:
        for node in nodes:
            obj_id = node.get("objectid")
            name = node.get("name", "")
            children = node.get("objects", [])
            category = parent_category
            if children:
                category = name
            if obj_id and not children:
                category_map[obj_id] = category
            if children:
                walk(children, category)

    walk(objects)
    return category_map


async def extract_bim_metadata(
    aps: APSService,
    bim_model: BimModel,
    db: AsyncSession,
) -> dict[str, Any]:
    if bim_model.metadata_json and bim_model.metadata_json.get("extracted_at"):
        return bim_model.metadata_json

    views = await aps.get_model_views(bim_model.urn)
    if not views:
        return {"extracted_at": None, "areas": [], "equipment": [], "materials": [], "raw_object_count": 0}

    view_guid = views[0].get("guid", "")
    tree_data = await aps.get_object_tree(bim_model.urn, view_guid)
    properties_list = await aps.get_object_properties(bim_model.urn, view_guid)

    category_map = build_category_map(tree_data)
    areas = map_rooms_to_areas(properties_list, category_map)
    equipment_items = map_equipment(properties_list, category_map)
    material_items = map_materials(properties_list, category_map)

    metadata = {
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "view_guid": view_guid,
        "areas": areas,
        "equipment": equipment_items,
        "materials": material_items,
        "raw_object_count": len(category_map),
    }

    bim_model.metadata_json = metadata
    await db.commit()
    return metadata
