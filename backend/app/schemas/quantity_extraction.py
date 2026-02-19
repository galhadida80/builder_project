from pydantic import BaseModel

from app.core.validators import CamelCaseModel


class DoorWindow(CamelCaseModel):
    door_type: str | None = None
    window_type: str | None = None
    width_cm: int | None = None
    height_cm: int | None = None
    quantity: int = 1


class RoomFinishes(CamelCaseModel):
    floor_material: str | None = None
    wall_material: str | None = None
    ceiling_material: str | None = None


class RoomData(CamelCaseModel):
    name: str
    room_type: str | None = None
    area_sqm: float | None = None
    perimeter_m: float | None = None
    height_m: float | None = None
    doors: list[DoorWindow] = []
    windows: list[DoorWindow] = []
    finishes: RoomFinishes | None = None


class FloorData(CamelCaseModel):
    floor_number: int
    floor_name: str | None = None
    total_area_sqm: float | None = None
    rooms: list[RoomData] = []


class QuantitySummary(CamelCaseModel):
    total_floors: int = 0
    total_rooms: int = 0
    total_area_sqm: float = 0.0
    total_doors: int = 0
    total_windows: int = 0


class QuantityExtractionResponse(CamelCaseModel):
    floors: list[FloorData] = []
    summary: QuantitySummary
    processing_time_ms: int
