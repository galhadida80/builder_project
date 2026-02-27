import re
from difflib import SequenceMatcher
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bim import BimModel
from app.models.equipment_template import EquipmentTemplate
from app.models.material_template import MaterialTemplate
from app.services.aps_service import APSService
from app.utils import utcnow


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

CONFIDENCE_THRESHOLD = 0.80

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


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def token_sort_ratio(a: str, b: str) -> float:
    tokens_a = sorted(normalize_name(a).split())
    tokens_b = sorted(normalize_name(b).split())
    return SequenceMatcher(None, " ".join(tokens_a), " ".join(tokens_b)).ratio()


def token_overlap_score(a: str, b: str) -> float:
    tokens_a = set(normalize_name(a).split())
    tokens_b = set(normalize_name(b).split())
    if not tokens_a or not tokens_b:
        return 0.0
    common = tokens_a & tokens_b
    if not common:
        return 0.0
    return len(common) / max(len(tokens_a), len(tokens_b))


def best_match_score(name: str, candidates: list[str]) -> float:
    if not name or not candidates:
        return 0.0
    name_norm = normalize_name(name)
    best = 0.0
    for candidate in candidates:
        cand_norm = normalize_name(candidate)
        if name_norm == cand_norm:
            return 1.0
        if name_norm in cand_norm or cand_norm in name_norm:
            score = max(0.85, SequenceMatcher(None, name_norm, cand_norm).ratio())
        else:
            seq_score = SequenceMatcher(None, name_norm, cand_norm).ratio()
            tok_sort = token_sort_ratio(name, candidate)
            tok_overlap = token_overlap_score(name, candidate)
            if tok_overlap >= 0.5:
                score = max(seq_score, tok_sort, 0.75 + tok_overlap * 0.2)
            else:
                score = max(seq_score, tok_sort)
        best = max(best, score)
    return best


def match_template(
    item_name: str,
    item_type: str,
    templates: list[dict[str, Any]],
) -> tuple[Optional[str], Optional[str], float]:
    if not templates:
        return None, None, 0.0

    best_id: Optional[str] = None
    best_name: Optional[str] = None
    best_score = 0.0

    for tpl in templates:
        tpl_names = [n for n in [tpl.get("name"), tpl.get("name_en"), tpl.get("name_he")] if n]
        name_score = best_match_score(item_name, tpl_names)
        type_score = best_match_score(item_type, tpl_names) if item_type else 0.0
        category_names = [tpl.get("category", "")]
        cat_score = best_match_score(item_type, category_names) if item_type else 0.0
        score = max(name_score, type_score * 0.9, cat_score * 0.7)
        if score > best_score:
            best_score = score
            best_id = tpl["id"]
            best_name = tpl.get("name_en") or tpl.get("name")

    return best_id, best_name, round(best_score, 3)


EQUIPMENT_NAME_EN_MAP: dict[str, str] = {
    "קירות סלארים": "Slurry Walls",
    "מעקות מרפסות": "Balcony Railings",
    "מעקה חדר מדרגות": "Stairway Railing",
    "העמדת גג עליון": "Roof Installation",
    "משאבת ספרינקלרים": "Sprinkler Pumps",
    "משאבת צריכה": "Consumption Pumps",
    "משאבת הגברת לחץ גוקי": "Jockey Pump",
    "משאבות כיבוי אש": "Fire Pumps",
    "משאבות טבולות": "Submersible Pumps",
    "חדר משאבות": "Pump Room",
    "ציוד אינסטלציה": "Plumbing Equipment",
    "בריכות": "Pools",
    "תעלת ניקוז רמפה": "Ramp Drainage Channel",
    "גנרטור": "Generator",
    "לוחות חשמל": "Electrical Panels",
    "גופי תאורה ציבורי": "Public Lighting Fixtures",
    "מערכת סולארית": "Solar System",
    "מפוחים": "Fans/Blowers",
    "מיזוג אוויר ציבורי": "Public Air Conditioning",
    "מיזוג אוויר דירות": "Apartment Air Conditioning",
    "וונטות": "Vents",
    "ציוד כיבוי אש מתח נמוך": "Low Voltage Fire Equipment",
    "דלת כניסה": "Entry Door",
    "דלת אש": "Fire Door",
    "שער חניון": "Parking Gate",
    'מסגרות ממ"ד': "Safe Room Frames",
    'מסנן ממ"ד': "Safe Room Filter",
    "מעלית": "Elevator",
    "בית חכם": "Smart Home",
    "אינטרקום": "Intercom",
    "ארונות פח": "Metal Cabinets",
    "ארונות נגרות": "Wooden Cabinets",
    "מראות": "Mirrors",
    "פרגולה": "Pergola",
    "סולמות": "Ladders",
    "אלומיניום": "Aluminum",
    "תיק דייר": "Tenant File",
    "דוד שמש": "Solar Water Heater",
    "מערכת גז": "Gas System",
    "מערכת ספרינקלרים": "Sprinkler System",
    "מערכת אזעקה ואבטחה": "Alarm & Security System",
}

CATEGORY_EN_MAP: dict[str, str] = {
    "structural": "structural",
    "plumbing": "plumbing",
    "electrical": "electrical",
    "hvac": "hvac",
    "fire_safety": "fire safety",
    "doors": "doors",
    "safe_room": "safe room",
    "elevator": "elevator",
    "smart_home": "smart home",
    "cabinets": "cabinets",
    "outdoor": "outdoor",
    "aluminum": "aluminum",
    "tenant": "tenant",
    "concrete": "concrete",
    "masonry": "masonry",
    "waterproofing": "waterproofing",
    "insulation": "insulation",
    "flooring": "flooring",
    "finishes": "finishes",
    "drywall": "drywall",
    "sanitary": "sanitary",
    "piping": "piping",
}


async def load_equipment_templates(db: AsyncSession) -> list[dict[str, Any]]:
    result = await db.execute(
        select(
            EquipmentTemplate.id,
            EquipmentTemplate.name,
            EquipmentTemplate.name_he,
            EquipmentTemplate.category,
        ).where(EquipmentTemplate.is_active.is_(True))
    )
    templates = []
    for row in result.all():
        name_en = EQUIPMENT_NAME_EN_MAP.get(row.name, "")
        cat_en = CATEGORY_EN_MAP.get(row.category, row.category)
        templates.append({
            "id": str(row.id),
            "name": row.name,
            "name_he": row.name_he or row.name,
            "name_en": name_en,
            "category": cat_en,
        })
    return templates


async def load_material_templates(db: AsyncSession) -> list[dict[str, Any]]:
    result = await db.execute(
        select(
            MaterialTemplate.id,
            MaterialTemplate.name,
            MaterialTemplate.name_he,
            MaterialTemplate.category,
        ).where(MaterialTemplate.is_active.is_(True))
    )
    templates = []
    for row in result.all():
        cat_en = CATEGORY_EN_MAP.get(row.category, row.category)
        templates.append({
            "id": str(row.id),
            "name": row.name,
            "name_he": row.name_he or "",
            "name_en": row.name,
            "category": cat_en,
        })
    return templates


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
    templates: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    props_map = build_properties_map(properties_list)
    equipment = []
    for obj_id, category in category_map.items():
        if category not in EQUIPMENT_CATEGORIES:
            continue
        props = props_map.get(obj_id, {})
        name = get_property(props, "name", "Name", "Type Name") or f"Equipment {obj_id}"
        eq_type = get_property(props, "Type", "type", "Family", "Category")
        item: dict[str, Any] = {
            "bim_object_id": obj_id,
            "name": name,
            "equipment_type": eq_type,
            "manufacturer": get_property(props, "Manufacturer", "manufacturer"),
            "model_number": get_property(props, "Model", "model", "Type Name"),
            "specifications": None,
            "matched_template_id": None,
            "matched_template_name": None,
            "confidence": 0.0,
        }
        if templates:
            tpl_id, tpl_name, score = match_template(name, eq_type or "", templates)
            item["matched_template_id"] = tpl_id
            item["matched_template_name"] = tpl_name
            item["confidence"] = score
        equipment.append(item)
    return equipment


def map_materials(
    properties_list: list[dict[str, Any]],
    category_map: dict[int, str],
    templates: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    props_map = build_properties_map(properties_list)
    materials = []
    for obj_id, category in category_map.items():
        if category not in MATERIAL_CATEGORIES:
            continue
        props = props_map.get(obj_id, {})
        name = get_property(props, "name", "Name") or f"Material {obj_id}"
        mat_type = get_property(props, "Type", "type", "Material Class", "Category")
        item: dict[str, Any] = {
            "bim_object_id": obj_id,
            "name": name,
            "material_type": mat_type,
            "manufacturer": get_property(props, "Manufacturer", "manufacturer"),
            "model_number": get_property(props, "Model", "model"),
            "matched_template_id": None,
            "matched_template_name": None,
            "confidence": 0.0,
        }
        if templates:
            tpl_id, tpl_name, score = match_template(name, mat_type or "", templates)
            item["matched_template_id"] = tpl_id
            item["matched_template_name"] = tpl_name
            item["confidence"] = score
        materials.append(item)
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
    equipment_templates: Optional[list[dict[str, Any]]] = None,
    material_templates: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    if bim_model.metadata_json and bim_model.metadata_json.get("extracted_at"):
        cached = bim_model.metadata_json
        if equipment_templates or material_templates:
            cached = apply_template_matching(cached, equipment_templates, material_templates)
        return cached

    views = await aps.get_model_views(bim_model.urn)
    if not views:
        return {"extracted_at": None, "areas": [], "equipment": [], "materials": [], "raw_object_count": 0}

    view_guid = views[0].get("guid", "")
    tree_data = await aps.get_object_tree(bim_model.urn, view_guid)
    properties_list = await aps.get_object_properties(bim_model.urn, view_guid)

    category_map = build_category_map(tree_data)
    areas = map_rooms_to_areas(properties_list, category_map)
    equipment_items = map_equipment(properties_list, category_map, equipment_templates)
    material_items = map_materials(properties_list, category_map, material_templates)

    metadata = {
        "extracted_at": utcnow().isoformat(),
        "view_guid": view_guid,
        "areas": areas,
        "equipment": equipment_items,
        "materials": material_items,
        "raw_object_count": len(category_map),
    }

    bim_model.metadata_json = metadata
    await db.commit()
    return metadata


def apply_template_matching(
    metadata: dict[str, Any],
    equipment_templates: Optional[list[dict[str, Any]]] = None,
    material_templates: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    result = dict(metadata)
    if equipment_templates:
        for item in result.get("equipment", []):
            tpl_id, tpl_name, score = match_template(
                item.get("name", ""), item.get("equipment_type", "") or "", equipment_templates
            )
            item["matched_template_id"] = tpl_id
            item["matched_template_name"] = tpl_name
            item["confidence"] = score
    if material_templates:
        for item in result.get("materials", []):
            tpl_id, tpl_name, score = match_template(
                item.get("name", ""), item.get("material_type", "") or "", material_templates
            )
            item["matched_template_id"] = tpl_id
            item["matched_template_name"] = tpl_name
            item["confidence"] = score
    return result
