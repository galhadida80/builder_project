from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import CamelCaseModel, sanitize_string
from app.schemas.subscription import SubscriptionResponse


class InvoiceStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethodType(str, Enum):
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"


# ========================
# Invoice Schemas
# ========================


class InvoiceResponse(CamelCaseModel):
    id: UUID
    organization_id: UUID
    subscription_id: UUID
    invoice_number: str
    amount: float
    currency: str
    status: str
    billing_period_start: datetime
    billing_period_end: datetime
    issued_at: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    stripe_invoice_id: Optional[str] = None
    payplus_invoice_id: Optional[str] = None
    pdf_url: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    subscription: Optional[SubscriptionResponse] = None


class InvoiceCreate(BaseModel):
    organization_id: UUID
    subscription_id: UUID
    invoice_number: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    currency: str = Field(default="ILS", min_length=3, max_length=3)
    status: Literal["pending", "paid", "failed", "refunded"] = "pending"
    billing_period_start: datetime
    billing_period_end: datetime
    issued_at: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    stripe_invoice_id: Optional[str] = Field(default=None, max_length=255)
    payplus_invoice_id: Optional[str] = Field(default=None, max_length=255)
    pdf_url: Optional[str] = Field(default=None, max_length=500)
    meta: Optional[dict] = None


class InvoiceUpdate(BaseModel):
    status: Optional[Literal["pending", "paid", "failed", "refunded"]] = None
    paid_at: Optional[datetime] = None
    pdf_url: Optional[str] = Field(default=None, max_length=500)
    meta: Optional[dict] = None


# ========================
# Payment Method Schemas
# ========================


class PaymentMethodResponse(CamelCaseModel):
    id: UUID
    organization_id: UUID
    type: str
    card_brand: Optional[str] = None
    card_last4: Optional[str] = None
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    is_default: bool
    stripe_payment_method_id: Optional[str] = None
    payplus_payment_method_id: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime
    updated_at: datetime


class PaymentMethodCreate(BaseModel):
    organization_id: UUID
    type: Literal["card", "bank_transfer"] = "card"
    card_brand: Optional[str] = Field(default=None, max_length=50)
    card_last4: Optional[str] = Field(default=None, min_length=4, max_length=4)
    card_exp_month: Optional[int] = Field(default=None, ge=1, le=12)
    card_exp_year: Optional[int] = Field(default=None, ge=2024)
    is_default: bool = False
    stripe_payment_method_id: Optional[str] = Field(default=None, max_length=255)
    payplus_payment_method_id: Optional[str] = Field(default=None, max_length=255)
    meta: Optional[dict] = None


class PaymentMethodUpdate(BaseModel):
    is_default: Optional[bool] = None
    meta: Optional[dict] = None


# ========================
# Billing History Schemas
# ========================


class BillingHistoryResponse(CamelCaseModel):
    id: UUID
    organization_id: UUID
    subscription_id: Optional[UUID] = None
    event_type: str
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime
    subscription: Optional[SubscriptionResponse] = None


class BillingHistoryCreate(BaseModel):
    organization_id: UUID
    subscription_id: Optional[UUID] = None
    event_type: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    amount: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default="ILS", min_length=3, max_length=3)
    meta: Optional[dict] = None

    @field_validator("description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)
