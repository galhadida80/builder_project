import io
import json
import logging
import re
import time

from google import genai
from google.genai import types

from app.config import get_settings
from app.services.quantity_docai_service import parse_docai_tables, process_with_document_ai
from app.services.quantity_gemini_mapper import map_semantics_with_gemini, merge_semantic_mappings
from app.services.quantity_pdf_parser import (
    extract_number,
    extract_pdf_text_and_tables,
)

logger = logging.getLogger(__name__)

GEMINI_FALLBACK_PROMPT = """You are a construction quantity surveyor expert. Analyze this garmoshka (accordion-style) construction planning PDF document.

Extract ALL building quantity data you can find, including:
- Floors and their details
- Rooms per floor (name, area in sqm, type)
- Doors (type, dimensions, quantity)
- Windows (type, dimensions, quantity)
- Room finishes (floor, walls, ceiling materials)

Respond in {language} language for all descriptive text fields.

Return ONLY valid JSON with this exact structure:
{{
  "floors": [
    {{
      "floor_number": 1,
      "floor_name": "...",
      "total_area_sqm": 0.0,
      "rooms": [
        {{
          "name": "...",
          "room_type": "...",
          "area_sqm": 0.0,
          "perimeter_m": 0.0,
          "height_m": 0.0,
          "doors": [
            {{"door_type": "...", "width_cm": 0, "height_cm": 0, "quantity": 1}}
          ],
          "windows": [
            {{"window_type": "...", "width_cm": 0, "height_cm": 0, "quantity": 1}}
          ],
          "finishes": {{
            "floor_material": "...",
            "wall_material": "...",
            "ceiling_material": "..."
          }}
        }}
      ]
    }}
  ],
  "summary": {{
    "total_floors": 0,
    "total_rooms": 0,
    "total_area_sqm": 0.0,
    "total_doors": 0,
    "total_windows": 0
  }}
}}

If certain data is not found in the document, omit those fields or use null.
Extract as much as possible from the document. Be thorough and accurate."""


def extract_quantities(file_content: bytes, file_type: str, language: str = "he") -> dict:
    start = time.time()
    mime_type = file_type or "application/pdf"
    tier_used = None
    parsed_data = None

    # Tier 1: Document AI + deterministic parsing + Gemini labels
    settings = get_settings()
    if settings.docai_processor_id:
        try:
            logger.info("Tier 1: Attempting Document AI extraction")
            docai_result = process_with_document_ai(file_content, mime_type)
            parsed_data = parse_docai_tables(docai_result)
            if parsed_data.get("floors") and any(f.get("rooms") for f in parsed_data["floors"]):
                tier_used = "document_ai"
                logger.info(f"Tier 1 success: {len(parsed_data['floors'])} floors extracted")
            else:
                logger.warning("Tier 1: Document AI returned no usable table data")
                parsed_data = None
        except Exception as e:
            logger.warning(f"Tier 1 failed: {e}")
            parsed_data = None

    # Tier 2: pdfplumber + deterministic parsing + Gemini labels
    if parsed_data is None:
        try:
            logger.info("Tier 2: Attempting pdfplumber extraction")
            pdf_data = extract_pdf_text_and_tables(io.BytesIO(file_content))
            parsed_data = parse_pdfplumber_tables(pdf_data)
            if parsed_data.get("floors") and any(f.get("rooms") for f in parsed_data["floors"]):
                tier_used = "pdfplumber"
                logger.info(f"Tier 2 success: {len(parsed_data['floors'])} floors extracted")
            else:
                logger.warning("Tier 2: pdfplumber returned no usable table data")
                parsed_data = None
        except Exception as e:
            logger.warning(f"Tier 2 failed: {e}")
            parsed_data = None

    # Tier 3: Gemini-only fallback (current behavior)
    if parsed_data is None:
        logger.info("Tier 3: Falling back to Gemini-only extraction")
        result = extract_quantities_gemini_only(file_content, mime_type, language)
        result["tier"] = "gemini_only"
        return result

    # For Tiers 1 & 2: use Gemini only for semantic labels
    try:
        gemini_mappings = map_semantics_with_gemini(parsed_data, language)
        parsed_data = merge_semantic_mappings(parsed_data, gemini_mappings)
    except Exception as e:
        logger.warning(f"Gemini semantic mapping failed (using deterministic labels): {e}")

    result = validate_and_build_response(parsed_data)
    elapsed_ms = int((time.time() - start) * 1000)

    return {
        "result": result,
        "processing_time_ms": elapsed_ms,
        "tier": tier_used,
    }


def resolve_floor_for_table(table: dict, markers: list[dict], current_floor: int, next_seq: int) -> int:
    table_top = table.get("bbox_top")
    if not markers:
        return current_floor

    if table_top is not None:
        best_marker = None
        for marker in markers:
            if marker["y_pos"] < table_top:
                if best_marker is None or marker["y_pos"] > best_marker["y_pos"]:
                    best_marker = marker
        if best_marker:
            if best_marker["floor_number"] is not None:
                return best_marker["floor_number"]
            return next_seq

    return current_floor


def parse_pdfplumber_tables(pdf_data: dict) -> dict:
    from app.services.quantity_docai_service import guess_room_type, parse_door_or_window

    floors = {}
    current_floor = 0
    next_sequential_floor = 1

    for page in pdf_data.get("pages", []):
        markers = page.get("floor_markers", [])

        tables = page.get("tables", [])
        for t_idx, table in enumerate(tables):
            current_floor = resolve_floor_for_table(
                table, markers, current_floor, next_sequential_floor
            )
            if current_floor >= next_sequential_floor:
                next_sequential_floor = current_floor + 1

            col_map = table.get("column_map", {})
            if not col_map:
                continue

            for row in table.get("rows", []):
                room_name = None
                area = None
                perimeter = None
                height = None
                floor_num = current_floor
                doors = []
                windows = []
                finishes = {}

                for idx, semantic_type in col_map.items():
                    if idx >= len(row):
                        continue
                    cell = row[idx]

                    if semantic_type == "room":
                        room_name = cell.strip() if cell else None
                    elif semantic_type == "area":
                        area = extract_number(cell) if cell else None
                    elif semantic_type == "floor":
                        fv = extract_number(cell) if cell else None
                        if fv is not None:
                            floor_num = int(fv)
                    elif semantic_type == "perimeter":
                        perimeter = extract_number(cell) if cell else None
                    elif semantic_type == "height":
                        height = extract_number(cell) if cell else None
                    elif semantic_type == "door" and cell and cell.strip():
                        door = parse_door_or_window(cell)
                        if door:
                            doors.append(door)
                    elif semantic_type == "window" and cell and cell.strip():
                        window = parse_door_or_window(cell)
                        if window:
                            windows.append(window)
                    elif semantic_type == "finish_floor":
                        finishes["floor_material"] = cell.strip() or None
                    elif semantic_type == "finish_wall":
                        finishes["wall_material"] = cell.strip() or None
                    elif semantic_type == "finish_ceiling":
                        finishes["ceiling_material"] = cell.strip() or None

                if not room_name:
                    continue

                if floor_num not in floors:
                    floors[floor_num] = {
                        "floor_number": floor_num,
                        "floor_name": f"קומה {floor_num}" if floor_num > 0 else "קומת קרקע",
                        "rooms": [],
                    }

                floors[floor_num]["rooms"].append({
                    "name": room_name,
                    "room_type": guess_room_type(room_name),
                    "area_sqm": area,
                    "perimeter_m": perimeter,
                    "height_m": height,
                    "doors": doors,
                    "windows": windows,
                    "finishes": finishes or {"floor_material": None, "wall_material": None, "ceiling_material": None},
                })

    result_floors = sorted(floors.values(), key=lambda f: f["floor_number"])
    for floor in result_floors:
        total = sum(r.get("area_sqm", 0) or 0 for r in floor["rooms"])
        floor["total_area_sqm"] = round(total, 2)

    return {"floors": result_floors, "source": "pdfplumber"}


def extract_quantities_gemini_only(file_content: bytes, mime_type: str, language: str = "he") -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    lang_name = {"en": "English", "he": "Hebrew"}.get(language, "Hebrew")
    prompt = GEMINI_FALLBACK_PROMPT.format(language=lang_name)

    client = genai.Client(api_key=api_key)
    contents = [
        types.Part.from_bytes(data=file_content, mime_type=mime_type),
        prompt,
    ]

    start = time.time()
    response = client.models.generate_content(model=settings.gemini_model, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    if not response.text:
        raise ValueError("AI model returned no response")

    text = response.text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text).strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse AI response as JSON: {e}")

    return {"result": result, "processing_time_ms": elapsed_ms}


def validate_and_build_response(parsed_data: dict) -> dict:
    floors = parsed_data.get("floors", [])
    validated_floors = []

    for floor in floors:
        validated_rooms = []
        for room in floor.get("rooms", []):
            doors = []
            for d in room.get("doors", []):
                doors.append({
                    "door_type": d.get("door_type") or d.get("type_text") or "interior",
                    "width_cm": d.get("width_cm"),
                    "height_cm": d.get("height_cm"),
                    "quantity": d.get("quantity", 1),
                })

            windows = []
            for w in room.get("windows", []):
                windows.append({
                    "window_type": w.get("window_type") or w.get("type_text") or "standard",
                    "width_cm": w.get("width_cm"),
                    "height_cm": w.get("height_cm"),
                    "quantity": w.get("quantity", 1),
                })

            finishes = room.get("finishes", {})
            validated_rooms.append({
                "name": room.get("name", ""),
                "room_type": room.get("room_type", "room"),
                "area_sqm": room.get("area_sqm"),
                "perimeter_m": room.get("perimeter_m"),
                "height_m": room.get("height_m"),
                "doors": doors,
                "windows": windows,
                "finishes": {
                    "floor_material": finishes.get("floor_material"),
                    "wall_material": finishes.get("wall_material"),
                    "ceiling_material": finishes.get("ceiling_material"),
                },
            })

        validated_floors.append({
            "floor_number": floor.get("floor_number", 0),
            "floor_name": floor.get("floor_name", ""),
            "total_area_sqm": floor.get("total_area_sqm", 0.0),
            "rooms": validated_rooms,
        })

    summary = compute_summary(validated_floors)
    return {"floors": validated_floors, "summary": summary}


def compute_summary(floors: list[dict]) -> dict:
    total_rooms = 0
    total_area = 0.0
    total_doors = 0
    total_windows = 0

    for floor in floors:
        for room in floor.get("rooms", []):
            total_rooms += 1
            total_area += room.get("area_sqm") or 0.0
            for door in room.get("doors", []):
                total_doors += door.get("quantity", 1)
            for window in room.get("windows", []):
                total_windows += window.get("quantity", 1)

    return {
        "total_floors": len(floors),
        "total_rooms": total_rooms,
        "total_area_sqm": round(total_area, 2),
        "total_doors": total_doors,
        "total_windows": total_windows,
    }
