import logging
import re

from app.config import get_settings

logger = logging.getLogger(__name__)

ROOM_TYPE_MAP = {
    "סלון": "living_room",
    "מטבח": "kitchen",
    "חדר שינה": "bedroom",
    "חדר רחצה": "bathroom",
    "שירותים": "toilet",
    "מרפסת": "balcony",
    'ממ"ד': "safe_room",
    "ממד": "safe_room",
    "לובי": "lobby",
    "מסדרון": "corridor",
    "כניסה": "entrance",
    "מחסן": "storage",
    "חדר כביסה": "laundry",
    "חדר עבודה": "study",
    "פרוזדור": "hallway",
    "מקלט": "shelter",
    "חניה": "parking",
    "גג": "roof",
    "חצר": "yard",
}

FLOOR_PATTERN = re.compile(r"קומה\s*[-:.]?\s*(\d+|קרקע|מרתף)", re.UNICODE)
DIMENSION_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)")
NUMBER_PATTERN = re.compile(r"(\d+(?:\.\d+)?)")


def process_with_document_ai(file_content: bytes, mime_type: str) -> dict:
    settings = get_settings()
    if not settings.docai_processor_id:
        raise ValueError("DOCAI_PROCESSOR_ID is not configured")

    from google.cloud import documentai_v1 as documentai

    client = documentai.DocumentProcessorServiceClient()
    resource_name = client.processor_path(
        settings.docai_project_id,
        settings.docai_location,
        settings.docai_processor_id,
    )

    raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)
    request = documentai.ProcessRequest(name=resource_name, raw_document=raw_document)

    result = client.process_document(request=request)
    document = result.document

    tables = []
    for page in document.pages:
        for table in page.tables:
            headers = []
            for cell in table.header_rows:
                row_cells = []
                for header_cell in cell.cells:
                    text = extract_text_from_layout(header_cell.layout, document.text)
                    row_cells.append(text.strip())
                headers.append(row_cells)

            body_rows = []
            for row in table.body_rows:
                row_cells = []
                for body_cell in row.cells:
                    text = extract_text_from_layout(body_cell.layout, document.text)
                    confidence = body_cell.layout.confidence if body_cell.layout.confidence else 0.0
                    row_cells.append({"text": text.strip(), "confidence": confidence})
                body_rows.append(row_cells)

            tables.append({
                "headers": headers[0] if headers else [],
                "rows": body_rows,
                "page": page.page_number,
            })

    return {
        "tables": tables,
        "full_text": document.text,
        "total_pages": len(document.pages),
    }


def extract_text_from_layout(layout, full_text: str) -> str:
    parts = []
    for segment in layout.text_anchor.text_segments:
        start = int(segment.start_index) if segment.start_index else 0
        end = int(segment.end_index)
        parts.append(full_text[start:end])
    return "".join(parts)


def parse_docai_tables(docai_result: dict) -> dict:
    tables = docai_result.get("tables", [])
    full_text = docai_result.get("full_text", "")
    floor_boundaries = detect_floor_boundaries(tables, full_text)
    floors = {}

    for table in tables:
        headers = table.get("headers", [])
        if not headers:
            continue

        from app.services.quantity_pdf_parser import classify_table_columns
        col_map = classify_table_columns(headers)
        if not col_map:
            continue

        for row in table.get("rows", []):
            room_data = parse_row_to_room(row, col_map)
            if not room_data:
                continue

            floor_num = room_data.get("floor_number", 0)
            if floor_num not in floors:
                floors[floor_num] = {
                    "floor_number": floor_num,
                    "floor_name": f"קומה {floor_num}" if floor_num > 0 else "קומת קרקע",
                    "rooms": [],
                }
            floors[floor_num]["rooms"].append(room_data)

    if not floors and floor_boundaries:
        floors[0] = {
            "floor_number": 0,
            "floor_name": "קומת קרקע",
            "rooms": [],
        }

    result_floors = sorted(floors.values(), key=lambda f: f["floor_number"])
    for floor in result_floors:
        total = sum(r.get("area_sqm", 0) or 0 for r in floor["rooms"])
        floor["total_area_sqm"] = round(total, 2)

    return {"floors": result_floors, "source": "document_ai"}


def parse_row_to_room(row: list[dict], col_map: dict[int, str]) -> dict | None:
    room_name = None
    area = None
    floor_num = 0
    perimeter = None
    height = None
    doors = []
    windows = []
    finishes = {}

    for idx, semantic_type in col_map.items():
        if idx >= len(row):
            continue
        cell = row[idx]
        text = cell["text"] if isinstance(cell, dict) else str(cell)

        if semantic_type == "room":
            room_name = text.strip()
        elif semantic_type == "area":
            area = extract_numeric_value(text)
        elif semantic_type == "floor":
            floor_val = extract_numeric_value(text)
            floor_num = int(floor_val) if floor_val is not None else 0
        elif semantic_type == "perimeter":
            perimeter = extract_numeric_value(text)
        elif semantic_type == "height":
            height = extract_numeric_value(text)
        elif semantic_type == "door":
            if text.strip():
                door = parse_door_or_window(text)
                if door:
                    doors.append(door)
        elif semantic_type == "window":
            if text.strip():
                window = parse_door_or_window(text)
                if window:
                    windows.append(window)
        elif semantic_type == "finish_floor":
            finishes["floor_material"] = text.strip() or None
        elif semantic_type == "finish_wall":
            finishes["wall_material"] = text.strip() or None
        elif semantic_type == "finish_ceiling":
            finishes["ceiling_material"] = text.strip() or None

    if not room_name:
        return None

    room_type = guess_room_type(room_name)

    return {
        "name": room_name,
        "room_type": room_type,
        "area_sqm": area,
        "perimeter_m": perimeter,
        "height_m": height,
        "floor_number": floor_num,
        "doors": doors if doors else [],
        "windows": windows if windows else [],
        "finishes": finishes if finishes else {"floor_material": None, "wall_material": None, "ceiling_material": None},
    }


def parse_door_or_window(text: str) -> dict | None:
    if not text or not text.strip():
        return None
    text = text.replace("\x00", "x")
    width, height = None, None
    dim_match = DIMENSION_PATTERN.search(text)
    if dim_match:
        width = float(dim_match.group(1))
        height = float(dim_match.group(2))

    qty = 1
    qty_match = re.search(r"(\d+)\s*(?:יח|יחידות|pcs)", text)
    if qty_match:
        qty = int(qty_match.group(1))

    type_text = DIMENSION_PATTERN.sub("", text).strip()
    type_text = re.sub(r"\d+\s*(?:יח|יחידות|pcs)", "", type_text).strip()
    type_text = type_text.strip(" -–,") or None

    return {
        "type_text": type_text,
        "width_cm": width,
        "height_cm": height,
        "quantity": qty,
    }


def guess_room_type(room_name: str) -> str:
    name_lower = room_name.strip()
    for hebrew, english in ROOM_TYPE_MAP.items():
        if hebrew in name_lower:
            return english
    return "room"


def detect_floor_boundaries(tables: list[dict], full_text: str) -> list[dict]:
    boundaries = []
    for match in FLOOR_PATTERN.finditer(full_text):
        val = match.group(1)
        if val == "קרקע":
            floor_num = 0
        elif val == "מרתף":
            floor_num = -1
        else:
            floor_num = int(val)
        boundaries.append({"floor_number": floor_num, "position": match.start()})
    return boundaries


def extract_numeric_value(cell_text: str) -> float | None:
    if not cell_text:
        return None
    text = cell_text.strip().replace(",", "")
    text = re.sub(r'[מ"ר|ס"מ|מטר|יח\'|מ\']', "", text).strip()
    match = NUMBER_PATTERN.search(text)
    if match:
        return float(match.group(1))
    return None
