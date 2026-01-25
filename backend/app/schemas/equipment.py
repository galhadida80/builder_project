from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ChecklistItem(BaseModel):
    id: str
    label: str
    is_completed: bool = False
    completed_at: datetime | None = None
    notes: str | None = None


class ChecklistCreate(BaseModel):
    checklist_name: str
    items: list[ChecklistItem]


class ChecklistResponse(BaseModel):
    id: UUID
    equipment_id: UUID
    checklist_name: str
    items: list[ChecklistItem]
    completed_at: datetime | None = None
    completed_by: UserResponse | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class EquipmentBase(BaseModel):
    name: str
    equipment_code: str | None = None
    category: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    location: str | None = None
    specifications: dict | None = None


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: str | None = None
    equipment_code: str | None = None
    category: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None
    location: str | None = None
    specifications: dict | None = None


class EquipmentResponse(EquipmentBase):
    id: UUID
    project_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None
    checklists: list[ChecklistResponse] = []

    class Config:
        from_attributes = True
