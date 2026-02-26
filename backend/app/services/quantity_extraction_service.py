import io
import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import fitz
from google import genai
from google.genai import types

from app.config import get_settings
from app.services.quantity_docai_service import parse_docai_tables, process_with_document_ai
from app.services.quantity_gemini_mapper import map_semantics_with_gemini, merge_semantic_mappings
from app.services.quantity_pdf_parser import (
    extract_number,
    extract_pdf_text_and_tables,
)
from app.services.quantity_splitter import split_garmoshka
from app.services.rasterscan_service import is_rasterscan_available, extract_with_rasterscan

logger = logging.getLogger(__name__)


def extract_json_from_response(text: str) -> dict | None:
    text = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    text = re.sub(r"\n?```\s*$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{[\s\S]*"floors"\s*:\s*\[', text)
    if not match:
        return None

    json_text = text[match.start():]
    depth = 0
    end_pos = 0
    for i, ch in enumerate(json_text):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end_pos = i + 1
                break

    if end_pos == 0:
        json_text = repair_truncated_json(json_text)
    else:
        json_text = json_text[:end_pos]

    try:
        return json.loads(json_text)
    except json.JSONDecodeError:
        logger.warning(f"JSON parse failed even after extraction (len={len(json_text)})")
        return None


def repair_truncated_json(text: str) -> str:
    text = text.rstrip()
    in_string = False
    escape = False
    stack = []
    last_valid = 0

    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            stack.append(ch)
            last_valid = i
        elif ch in ('}', ']'):
            if stack:
                stack.pop()
            last_valid = i

    if in_string:
        text = text[:text.rindex('"') + 1]

    text = text.rstrip()
    while text and text[-1] in (',', ':', '"'):
        if text[-1] == '"':
            idx = text[:-1].rindex('"') if '"' in text[:-1] else -1
            if idx >= 0:
                text = text[:idx].rstrip().rstrip(',')
            else:
                text = text[:-1]
        else:
            text = text[:-1].rstrip()

    stack2 = []
    in_str = False
    esc = False
    for ch in text:
        if esc:
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch in ('{', '['):
            stack2.append('}' if ch == '{' else ']')
        elif ch in ('}', ']'):
            if stack2:
                stack2.pop()

    for closer in reversed(stack2):
        text += closer

    return text


GEMINI_EXTRACTION_PROMPT = """Analyze these tile images from a wide Israeli garmoshka (גרמושקה) architectural drawing sheet.
Images are tiles LEFT-TO-RIGHT, TOP-TO-BOTTOM from ONE wide sheet with MULTIPLE floor plan drawings side by side.

STEP 1: Identify ALL separate bordered floor plan drawings (תכנית). Each bordered drawing = 1 floor entry.
Skip section views (חתך) and elevation views (חזית). A typical garmoshka has 8-12 floor plan drawings.

STEP 2: For each floor drawing, extract rooms visible in it:
- Read Hebrew labels: סלון, מטבח, ח. שינה, ח. רחצה, ממ"ד, מרפסת, לובי, מסדרון, כניסה, שירותים, כביסה, מחסן
- Read area_sqm from מ"ר annotations if visible
- Count door symbols (arcs) and window symbols (wall gaps)
- For typical floors (קומה טיפוסית): create ONE entry, note range in floor_name
- Group storage rooms: one "מחסנים" entry with total count in doors quantity
- Group parking: one "חניות" entry with count

Floor numbering: -2/-1 basement, 0 ground/קרקע, 1+ upper, 99 roof/גג.
Room types: living_room, kitchen, bedroom, bathroom, toilet, safe_room, balcony, corridor, entrance, storage, parking, roof, lobby, laundry, study, stairwell.
Door types: entrance_door, interior, sliding, blast_door. Window types: standard, picture, balcony_door.
Set width_cm/height_cm=0, perimeter_m/height_m=null, finishes=all null. Language: {language}.

Return JSON with floors ORDERED from lowest floor_number to highest:
{{"floors":[{{"floor_number":0,"floor_name":"...","total_area_sqm":null,"rooms":[{{"name":"...","room_type":"living_room","area_sqm":null,"perimeter_m":null,"height_m":null,"doors":[{{"door_type":"interior","width_cm":0,"height_cm":0,"quantity":1}}],"windows":[],"finishes":{{"floor_material":null,"wall_material":null,"ceiling_material":null}}}}]}}],"summary":{{"total_floors":0,"total_rooms":0,"total_area_sqm":0,"total_doors":0,"total_windows":0}}}}

CRITICAL: You MUST include ALL floor plan drawings. Do NOT stop after a few floors."""""

PER_FLOOR_PROMPT = """Analyze this single floor plan drawing from an Israeli building.
This is floor image {floor_index} of {total_floors} detected drawings.

Extract rooms visible in this drawing. IMPORTANT grouping rules:
- If the floor has MULTIPLE APARTMENTS (דירה), create ONE entry per room per apartment, prefix name with apartment number (e.g., "דירה 51 - סלון")
- Group ALL storage rooms (מחסן) into ONE "מחסנים" entry — set quantity as doors count
- Group ALL parking spaces (חניה) into ONE "חניות" entry — set quantity as doors count
- Group repeated equipment (קולט, מזגן, etc.) into ONE entry with quantity
- For roof/גג drawings: list main areas only (חדר מדרגות, מעלית, גנרטור, etc.)
- Read Hebrew labels: סלון, מטבח, ח. שינה, ח. רחצה, ממ"ד, מרפסת, לובי, מסדרון, כניסה, שירותים, כביסה
- Read area (מ"ר) if visible. Count door arcs and window gaps.
- Identify floor name from title (קרקע, טיפוסית, גג, מרתף, עליון, חניון)

Floor numbering: -2/-1 basement, 0 ground/קרקע, 1+ upper, 99 roof/גג.
Room types: living_room, kitchen, bedroom, bathroom, toilet, safe_room, balcony, corridor, entrance, storage, parking, roof, lobby, laundry, study, stairwell.
Door types: entrance_door, interior, sliding, blast_door. Window types: standard, picture, balcony_door.
Set width_cm/height_cm=0, perimeter_m/height_m=null, finishes=all null. Language: {language}.

Return JSON (keep response compact):
{{"floor_name":"...","floor_number":0,"total_area_sqm":null,"rooms":[{{"name":"...","room_type":"living_room","area_sqm":null,"perimeter_m":null,"height_m":null,"doors":[{{"door_type":"interior","width_cm":0,"height_cm":0,"quantity":1}}],"windows":[],"finishes":{{"floor_material":null,"wall_material":null,"ceiling_material":null}}}}]}}"""


def extract_quantities(file_content: bytes, file_type: str, language: str = "he") -> dict:
    start = time.time()
    mime_type = file_type or "application/pdf"
    tier_used = None
    parsed_data = None

    # Tier 0: RasterScan CV model (for graphical floor plans when available)
    settings = get_settings()
    if is_rasterscan_available() and mime_type == "application/pdf":
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            page_count = len(doc)
            is_graphical = page_count > 0 and doc[0].rect.width > 2000
            doc.close()

            if is_graphical:
                logger.info("Tier 0: Attempting RasterScan floor plan recognition")
                floor_images = split_garmoshka(file_content)
                if len(floor_images) < 2:
                    doc = fitz.open(stream=file_content, filetype="pdf")
                    pix = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2))
                    floor_images = [pix.tobytes("png")]
                    doc.close()

                all_floors = []
                for idx, img_bytes in enumerate(floor_images):
                    try:
                        rs_result = extract_with_rasterscan(img_bytes, floor_number=idx, floor_name="")
                        rs_floors = rs_result.get("result", {}).get("floors", [])
                        if rs_floors and rs_floors[0].get("rooms"):
                            all_floors.extend(rs_floors)
                    except Exception as e:
                        logger.warning(f"RasterScan floor {idx} failed: {e}")

                if all_floors:
                    for i, fl in enumerate(all_floors):
                        fl["floor_number"] = i
                        if not fl.get("floor_name"):
                            fl["floor_name"] = f"Floor {i}"
                    parsed_data = {"floors": all_floors}
                    tier_used = "rasterscan"
                    logger.info(f"Tier 0 success: {len(all_floors)} floors via RasterScan")
        except Exception as e:
            logger.warning(f"Tier 0 RasterScan failed: {e}")
            parsed_data = None

    # Tier 1: Document AI + deterministic parsing + Gemini labels
    if parsed_data is None and settings.docai_processor_id:
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
    # Skip for large single-page PDFs (likely graphical floor plans without tables)
    if parsed_data is None:
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            page_count = len(doc)
            is_wide_plan = page_count > 0 and doc[0].rect.width > 3000
            doc.close()

            if is_wide_plan:
                logger.info("Tier 2: Skipping pdfplumber — wide graphical plan detected")
            else:
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


def convert_pdf_to_image_parts(file_content: bytes, mime_type: str) -> list:
    if mime_type != "application/pdf":
        return [types.Part.from_bytes(data=file_content, mime_type=mime_type)]

    doc = fitz.open(stream=file_content, filetype="pdf")
    parts = []

    for page in doc:
        tiles = render_page_tiles(page)
        for tile_bytes in tiles:
            parts.append(types.Part.from_bytes(data=tile_bytes, mime_type="image/png"))

    doc.close()

    if not parts:
        return [types.Part.from_bytes(data=file_content, mime_type=mime_type)]

    logger.info(f"Converted PDF to {len(parts)} image tile(s)")
    return parts


def render_page_tiles(page, max_dim: int = 4096, max_tiles: int = 12) -> list[bytes]:
    best_dpi = 72
    for dpi in [200, 150, 120, 100, 80, 72]:
        zoom = dpi / 72
        pw = page.rect.width * zoom
        ph = page.rect.height * zoom
        cols = max(1, (int(pw) + max_dim - 1) // max_dim)
        rows = max(1, (int(ph) + max_dim - 1) // max_dim)
        if cols * rows <= max_tiles:
            best_dpi = dpi
            break

    zoom = best_dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    pixel_w = page.rect.width * zoom
    pixel_h = page.rect.height * zoom

    logger.info(f"Rendering at {best_dpi} DPI: {int(pixel_w)}x{int(pixel_h)} px")

    if pixel_w <= max_dim and pixel_h <= max_dim:
        pix = page.get_pixmap(matrix=mat)
        return [pix.tobytes("png")]

    cols = max(1, (int(pixel_w) + max_dim - 1) // max_dim)
    rows = max(1, (int(pixel_h) + max_dim - 1) // max_dim)

    tile_w = page.rect.width / cols
    tile_h = page.rect.height / rows

    tiles = []
    for r in range(rows):
        for c in range(cols):
            clip = fitz.Rect(
                c * tile_w,
                r * tile_h,
                min((c + 1) * tile_w, page.rect.width),
                min((r + 1) * tile_h, page.rect.height),
            )
            pix = page.get_pixmap(matrix=mat, clip=clip)
            tiles.append(pix.tobytes("png"))

    return tiles


def extract_floor_json(text: str) -> dict | None:
    text = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    text = re.sub(r"\n?```\s*$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    repaired = repair_truncated_json(text)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        logger.warning(f"Per-floor JSON parse failed (len={len(text)})")
        return None


def extract_floor_from_image(client, image_bytes: bytes, floor_index: int, total_floors: int, language: str) -> dict | None:
    lang_name = {"en": "English", "he": "Hebrew"}.get(language, "Hebrew")
    prompt = PER_FLOOR_PROMPT.format(
        floor_index=floor_index + 1,
        total_floors=total_floors,
        language=lang_name,
    )

    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
    config = types.GenerateContentConfig(
        temperature=0.1,
        max_output_tokens=65536,
        response_mime_type="application/json",
        thinking_config=types.ThinkingConfig(thinking_budget=2048),
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, prompt],
        config=config,
    )
    if not response.text:
        logger.warning(f"Floor {floor_index + 1}: empty Gemini response")
        return None

    parsed = extract_floor_json(response.text.strip())
    if parsed is None:
        logger.warning(f"Floor {floor_index + 1}: failed to parse JSON")
        return None

    if "floors" in parsed and parsed["floors"]:
        parsed = parsed["floors"][0]

    logger.info(f"Floor {floor_index + 1}/{total_floors}: '{parsed.get('floor_name', '?')}' — {len(parsed.get('rooms', []))} rooms")
    return parsed


def extract_quantities_gemini_only(file_content: bytes, mime_type: str, language: str = "he") -> dict:
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    start = time.time()

    if mime_type == "application/pdf":
        floor_images = split_garmoshka(file_content)
    else:
        floor_images = [file_content]

    if len(floor_images) >= 2:
        logger.info(f"Deterministic split: {len(floor_images)} floor drawings detected, extracting each separately")
        return extract_split_floors(client, floor_images, language, start)

    logger.info("Single image detected, using tiled Gemini extraction")
    return extract_tiled_gemini(client, file_content, mime_type, language, start)


def resolve_floor_numbers(indexed_floors: list[tuple[int, dict]]) -> list[dict]:
    indexed_floors.sort(key=lambda x: x[0])

    for _, f in indexed_floors:
        try:
            f["floor_number"] = int(f.get("floor_number", 0) or 0)
        except (ValueError, TypeError):
            f["floor_number"] = 0

    used = set()
    result = []
    for idx, f in indexed_floors:
        num = f["floor_number"]
        if num not in used:
            used.add(num)
            result.append(f)
            continue

        name = (f.get("floor_name") or "").lower()
        if "גג" in name or "roof" in name:
            new_num = 99
        elif "מרתף" in name or "חניון" in name or "חני" in name:
            new_num = min(used) - 1 if used else -1
        else:
            new_num = num + 1
            while new_num in used:
                new_num += 1

        f["floor_number"] = new_num
        used.add(new_num)
        result.append(f)

    result.sort(key=lambda f: f["floor_number"])
    return result


def extract_split_floors(client, floor_images: list[bytes], language: str, start: float) -> dict:
    total = len(floor_images)
    indexed_floors = []

    with ThreadPoolExecutor(max_workers=min(4, total)) as executor:
        future_to_idx = {
            executor.submit(extract_floor_from_image, client, img, idx, total, language): idx
            for idx, img in enumerate(floor_images)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                floor_data = future.result()
                if floor_data:
                    indexed_floors.append((idx, floor_data))
            except Exception as e:
                logger.error(f"Floor {idx + 1} extraction failed: {e}")

    floors = resolve_floor_numbers(indexed_floors)
    result = {"floors": floors}
    result = deduplicate_floors(result)

    elapsed_ms = int((time.time() - start) * 1000)
    logger.info(f"Split extraction complete: {len(result['floors'])} floors in {elapsed_ms}ms")
    return {"result": result, "processing_time_ms": elapsed_ms}


def extract_tiled_gemini(client, file_content: bytes, mime_type: str, language: str, start: float) -> dict:
    lang_name = {"en": "English", "he": "Hebrew"}.get(language, "Hebrew")
    hi_res_parts = convert_pdf_to_image_parts(file_content, mime_type)

    prompt = GEMINI_EXTRACTION_PROMPT.format(language=lang_name)
    contents = hi_res_parts + [prompt]
    config = types.GenerateContentConfig(
        temperature=0.1,
        max_output_tokens=16384,
        response_mime_type="application/json",
        thinking_config=types.ThinkingConfig(thinking_budget=4096),
    )

    best_result = None
    best_floor_count = 0

    for attempt in range(2):
        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=contents, config=config,
        )
        if not response.text:
            continue

        candidate = extract_json_from_response(response.text.strip())
        if candidate is None:
            continue

        floor_count = len(candidate.get("floors", []))
        logger.info(f"Gemini attempt {attempt + 1}: {floor_count} floors")

        if floor_count > best_floor_count:
            best_result = candidate
            best_floor_count = floor_count

        if floor_count >= 7:
            break

    elapsed_ms = int((time.time() - start) * 1000)

    if best_result is None:
        raise ValueError("Failed to extract valid JSON from AI response")

    result = deduplicate_floors(best_result)
    return {"result": result, "processing_time_ms": elapsed_ms}


def deduplicate_floors(data: dict) -> dict:
    floors = data.get("floors", [])
    if not floors:
        return data

    merged = {}
    for floor in floors:
        num = floor.get("floor_number", 0)
        if num not in merged:
            merged[num] = {
                "floor_number": num,
                "floor_name": floor.get("floor_name", ""),
                "total_area_sqm": floor.get("total_area_sqm"),
                "rooms": list(floor.get("rooms", [])),
            }
        else:
            existing_names = {r.get("name") for r in merged[num]["rooms"]}
            for room in floor.get("rooms", []):
                if room.get("name") not in existing_names:
                    merged[num]["rooms"].append(room)
                    existing_names.add(room.get("name"))

    result_floors = sorted(merged.values(), key=lambda f: f["floor_number"])
    for fl in result_floors:
        total = sum(r.get("area_sqm") or 0 for r in fl["rooms"])
        fl["total_area_sqm"] = round(total, 2) if total else fl.get("total_area_sqm")

    summary = {
        "total_floors": len(result_floors),
        "total_rooms": sum(len(f["rooms"]) for f in result_floors),
        "total_area_sqm": round(sum(f.get("total_area_sqm") or 0 for f in result_floors), 2),
        "total_doors": sum(
            sum(d.get("quantity", 1) for d in r.get("doors", []))
            for f in result_floors for r in f["rooms"]
        ),
        "total_windows": sum(
            sum(w.get("quantity", 1) for w in r.get("windows", []))
            for f in result_floors for r in f["rooms"]
        ),
    }

    data["floors"] = result_floors
    data["summary"] = summary
    return data


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
