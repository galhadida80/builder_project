import logging
import time

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

FLOORPLAN_SERVICE_URL = "http://localhost:5555"


def is_rasterscan_available() -> bool:
    try:
        r = httpx.get(f"{FLOORPLAN_SERVICE_URL}/health", timeout=5.0)
        return r.status_code == 200 and r.json().get("model_loaded", False)
    except Exception:
        return False


def recognize_floor_plan(image_bytes: bytes) -> dict:
    start = time.time()

    response = httpx.post(
        f"{FLOORPLAN_SERVICE_URL}/analyze",
        files={"file": ("floor_plan.png", image_bytes, "image/png")},
        timeout=120.0,
    )
    response.raise_for_status()
    elapsed_ms = int((time.time() - start) * 1000)

    data = response.json()
    if "error" in data:
        raise ValueError(f"FloorPlan analysis failed: {data['error']}")

    rooms = data.get("rooms", [])
    logger.info(
        f"DeepFloorplan: {len(rooms)} rooms, "
        f"{data.get('total_doors', 0)} doors, "
        f"{data.get('total_windows', 0)} windows in {elapsed_ms}ms"
    )
    return data


def convert_to_floors(vision_data: dict, floor_number: int = 0, floor_name: str = "") -> dict:
    rooms_raw = vision_data.get("rooms", [])

    rooms = []
    for room in rooms_raw:
        room_name = room.get("name", "Unknown Room")
        room_type = room.get("room_type", "room")
        area = room.get("area_sqm")

        doors = room.get("doors", [])
        windows = room.get("windows", [])

        rooms.append({
            "name": room_name,
            "room_type": room_type,
            "area_sqm": area,
            "perimeter_m": None,
            "height_m": None,
            "doors": doors,
            "windows": windows,
            "finishes": {
                "floor_material": None,
                "wall_material": None,
                "ceiling_material": None,
            },
        })

    if not floor_name:
        floor_name = f"Floor {floor_number}" if floor_number != 0 else "Ground Floor"

    total_area = vision_data.get("total_area_sqm", 0)
    if not total_area:
        total_area = sum(r.get("area_sqm") or 0 for r in rooms)

    floor = {
        "floor_number": floor_number,
        "floor_name": floor_name,
        "total_area_sqm": round(total_area, 2) if total_area else None,
        "rooms": rooms,
    }

    total_doors = sum(
        d.get("quantity", 1) for r in rooms for d in r.get("doors", [])
    )
    total_windows = sum(
        w.get("quantity", 1) for r in rooms for w in r.get("windows", [])
    )

    summary = {
        "total_floors": 1,
        "total_rooms": len(rooms),
        "total_area_sqm": round(total_area, 2) if total_area else 0,
        "total_doors": total_doors,
        "total_windows": total_windows,
    }

    return {
        "result": {
            "floors": [floor],
            "summary": summary,
        },
    }


def extract_with_rasterscan(image_bytes: bytes, floor_number: int = 0, floor_name: str = "") -> dict:
    vision_data = recognize_floor_plan(image_bytes)
    return convert_to_floors(vision_data, floor_number, floor_name)
