import logging
import re

import pdfplumber

logger = logging.getLogger(__name__)

HEBREW_TABLE_HEADERS = {
    "room": ["חדר", "שם חדר", "תיאור", "שם"],
    "area": ["שטח", 'שטח מ"ר', "מ\"ר"],
    "floor": ["קומה", "מפלס"],
    "door": ["דלת", "דלתות", "סוג דלת"],
    "window": ["חלון", "חלונות", "סוג חלון"],
    "finish_floor": ["ריצוף", "חיפוי רצפה", "רצפה"],
    "finish_wall": ["חיפוי קיר", "קירות", "טיח"],
    "finish_ceiling": ["תקרה", "חיפוי תקרה"],
    "width": ["רוחב"],
    "height": ["גובה"],
    "quantity": ["כמות", "מס'", "יח'"],
    "perimeter": ["היקף"],
}

HEBREW_NUMBER_MAP = {
    "אפס": 0, "אחד": 1, "שניים": 2, "שתיים": 2,
    "שלושה": 3, "שלוש": 3, "ארבעה": 4, "ארבע": 4,
    "חמישה": 5, "חמש": 5, "שישה": 6, "שש": 6,
}


def extract_pdf_text_and_tables(file_content: bytes) -> dict:
    pages = []
    full_text_parts = []

    with pdfplumber.open(file_content) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            full_text_parts.append(text)

            tables = page.extract_tables() or []
            page_tables = []
            for table in tables:
                if not table or len(table) < 2:
                    continue
                header_row = [str(cell).strip() if cell else "" for cell in table[0]]
                col_map = classify_table_columns(header_row)
                if not col_map:
                    continue

                rows = []
                for row in table[1:]:
                    cells = [str(cell).strip() if cell else "" for cell in row]
                    rows.append(cells)

                page_tables.append({
                    "headers": header_row,
                    "column_map": col_map,
                    "rows": rows,
                    "page": page_num + 1,
                })

            pages.append({
                "page_number": page_num + 1,
                "text": text,
                "tables": page_tables,
            })

    return {
        "pages": pages,
        "full_text": "\n".join(full_text_parts),
        "has_hebrew": bool(re.search(r"[\u0590-\u05FF]", "\n".join(full_text_parts))),
        "total_pages": len(pages),
    }


def classify_table_columns(header_row: list[str]) -> dict[int, str]:
    col_map = {}
    for idx, header in enumerate(header_row):
        if not header:
            continue
        header_clean = header.strip()
        for semantic_type, patterns in HEBREW_TABLE_HEADERS.items():
            for pattern in patterns:
                if pattern in header_clean:
                    col_map[idx] = semantic_type
                    break
            if idx in col_map:
                break
    return col_map


def normalize_cell_value(value: str, expected_type: str) -> any:
    if not value or value.strip() in ("-", "—", "", "N/A"):
        return None

    value = value.strip()

    if expected_type in ("area", "width", "height", "perimeter", "quantity"):
        return extract_number(value)

    return value


def extract_number(text: str) -> float | None:
    if not text:
        return None
    text = text.strip()

    text = text.replace(",", "")
    text = re.sub(r'[מ"ר|ס"מ|מטר|יח\'|מ\']', "", text).strip()

    if text in HEBREW_NUMBER_MAP:
        return float(HEBREW_NUMBER_MAP[text])

    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if match:
        return float(match.group(1))

    return None


def extract_dimensions_from_text(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    match = re.search(r"(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)", text)
    if match:
        return float(match.group(1)), float(match.group(2))
    return None, None
