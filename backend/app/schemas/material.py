from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
from app.schemas.user import UserResponse


class MaterialBase(BaseModel):
    name: str
    material_code: str | None = None
    category: str | None = None
    supplier: str | None = None
    unit: str | None = None
    quantity_ordered: Decimal | None = None
    unit_price: Decimal | None = None
    delivery_date: date | None = None
    specifications: dict | None = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: str | None = None
    material_code: str | None = None
    category: str | None = None
    supplier: str | None = None
    unit: str | None = None
    quantity_ordered: Decimal | None = None
    unit_price: Decimal | None = None
    delivery_date: date | None = None
    specifications: dict | None = None


class MaterialReceive(BaseModel):
    quantity_received: Decimal
    notes: str | None = None


class MaterialResponse(MaterialBase):
    id: UUID
    project_id: UUID
    status: str
    quantity_received: Decimal
    created_at: datetime
    updated_at: datetime
    created_by: UserResponse | None = None

    class Config:
        from_attributes = True
