from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import CamelCaseModel, sanitize_string, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH


BUDGET_CATEGORIES = Literal[
    "labor", "materials", "equipment", "subcontractor", "permits", "overhead", "other"
]

CHANGE_ORDER_STATUSES = Literal["draft", "submitted", "approved", "rejected"]


class BudgetLineItemCreate(BaseModel):
    name: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    category: BUDGET_CATEGORIES
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    budgeted_amount: Decimal
    sort_order: int = 0

    @field_validator("name", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class BudgetLineItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=MAX_NAME_LENGTH)
    category: Optional[BUDGET_CATEGORIES] = None
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    budgeted_amount: Optional[Decimal] = None
    sort_order: Optional[int] = None

    @field_validator("name", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class BudgetLineItemResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    category: str
    description: Optional[str] = None
    budgeted_amount: Decimal
    sort_order: int
    actual_amount: Decimal = Decimal("0")
    remaining_amount: Decimal = Decimal("0")
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime


class CostEntryCreate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=500)
    amount: Decimal
    entry_date: date
    vendor: Optional[str] = Field(default=None, max_length=255)
    vendor_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(default=None, max_length=100)

    @field_validator("description", "vendor", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class CostEntryResponse(CamelCaseModel):
    id: UUID
    budget_item_id: UUID
    project_id: UUID
    description: Optional[str] = None
    amount: Decimal
    entry_date: date
    vendor: Optional[str] = None
    vendor_id: Optional[UUID] = None
    reference_number: Optional[str] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime


class ChangeOrderCreate(BaseModel):
    title: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    amount: Decimal
    budget_item_id: Optional[UUID] = None
    requested_date: Optional[date] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChangeOrderUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    amount: Optional[Decimal] = None
    status: Optional[CHANGE_ORDER_STATUSES] = None
    budget_item_id: Optional[UUID] = None
    requested_date: Optional[date] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ChangeOrderResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    change_order_number: int
    title: str
    description: Optional[str] = None
    amount: Decimal
    status: str
    budget_item_id: Optional[UUID] = None
    requested_by_id: Optional[UUID] = None
    approved_by_id: Optional[UUID] = None
    requested_date: Optional[date] = None
    approved_date: Optional[date] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime


class BudgetSummaryResponse(CamelCaseModel):
    total_budgeted: Decimal
    total_actual: Decimal
    total_variance: Decimal
    total_change_orders: int
    approved_change_orders: int
    line_item_count: int
    cost_entry_count: int
