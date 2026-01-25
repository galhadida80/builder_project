from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.user import UserResponse


class AreaProgressCreate(BaseModel):
    progress_percentage: Decimal
    notes: str | None = None
    photos: list[str] | None = None


class AreaProgressResponse(BaseModel):
    id: UUID
    area_id: UUID
    progress_percentage: Decimal
    notes: str | None = None
    photos: list[str] | None = None
    reported_at: datetime
    reported_by: UserResponse | None = None

    class Config:
        from_attributes = True


class AreaBase(BaseModel):
    name: str
    area_type: str | None = None
    floor_number: int | None = None
    area_code: str | None = None
    total_units: int = 1


class AreaCreate(AreaBase):
    parent_id: UUID | None = None


class AreaUpdate(BaseModel):
    name: str | None = None
    area_type: str | None = None
    floor_number: int | None = None
    area_code: str | None = None
    total_units: int | None = None


class AreaResponse(AreaBase):
    id: UUID
    project_id: UUID
    parent_id: UUID | None = None
    current_progress: Decimal = Decimal(0)
    created_at: datetime
    children: list["AreaResponse"] = []
    progress_updates: list[AreaProgressResponse] = []

    class Config:
        from_attributes = True
