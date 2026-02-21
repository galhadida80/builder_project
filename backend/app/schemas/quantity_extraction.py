from pydantic import field_validator

from app.core.validators import CamelCaseModel


def coerce_int(v, default=0):
    if v is None:
        return default
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


def coerce_optional_int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def coerce_optional_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


class DoorWindow(CamelCaseModel):
    door_type: str | None = None
    window_type: str | None = None
    width_cm: int | None = None
    height_cm: int | None = None
    quantity: int = 1

    @field_validator("width_cm", "height_cm", mode="before")
    @classmethod
    def coerce_dimensions(cls, v):
        return coerce_optional_int(v)

    @field_validator("quantity", mode="before")
    @classmethod
    def default_quantity(cls, v):
        return coerce_int(v, default=1)


class RoomFinishes(CamelCaseModel):
    floor_material: str | None = None
    wall_material: str | None = None
    ceiling_material: str | None = None


class RoomData(CamelCaseModel):
    name: str = ""
    room_type: str | None = None
    area_sqm: float | None = None
    perimeter_m: float | None = None
    height_m: float | None = None
    doors: list[DoorWindow] = []
    windows: list[DoorWindow] = []
    finishes: RoomFinishes | None = None

    @field_validator("name", mode="before")
    @classmethod
    def default_name(cls, v):
        if v is None:
            return ""
        return str(v)

    @field_validator("area_sqm", "perimeter_m", "height_m", mode="before")
    @classmethod
    def coerce_measurements(cls, v):
        return coerce_optional_float(v)


class FloorData(CamelCaseModel):
    floor_number: int = 0
    floor_name: str | None = None
    total_area_sqm: float | None = None
    rooms: list[RoomData] = []

    @field_validator("floor_number", mode="before")
    @classmethod
    def coerce_floor_number(cls, v):
        return coerce_int(v, default=0)

    @field_validator("total_area_sqm", mode="before")
    @classmethod
    def coerce_total_area(cls, v):
        return coerce_optional_float(v)


class QuantitySummary(CamelCaseModel):
    total_floors: int = 0
    total_rooms: int = 0
    total_area_sqm: float = 0.0
    total_doors: int = 0
    total_windows: int = 0

    @field_validator("total_floors", "total_rooms", "total_doors", "total_windows", mode="before")
    @classmethod
    def coerce_counts(cls, v):
        return coerce_int(v, default=0)

    @field_validator("total_area_sqm", mode="before")
    @classmethod
    def coerce_area(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0


class QuantityExtractionResponse(CamelCaseModel):
    floors: list[FloorData] = []
    summary: QuantitySummary = QuantitySummary()
    processing_time_ms: int = 0

    @field_validator("summary", mode="before")
    @classmethod
    def default_summary(cls, v):
        if v is None:
            return {}
        return v

    @field_validator("processing_time_ms", mode="before")
    @classmethod
    def coerce_processing_time(cls, v):
        return coerce_int(v, default=0)
