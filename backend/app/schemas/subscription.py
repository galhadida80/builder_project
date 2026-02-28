from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)


class PlanTier(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"


class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"


# ========================
# Subscription Plan Schemas
# ========================


class PlanResponse(CamelCaseModel):
    id: UUID
    tier: str
    name: str
    description: Optional[str] = None
    monthly_price: float
    annual_price: float
    max_users: Optional[int] = None
    max_projects: Optional[int] = None
    max_storage_gb: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PlanCreate(BaseModel):
    tier: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    monthly_price: float = Field(ge=0)
    annual_price: float = Field(ge=0)
    max_users: Optional[int] = Field(default=None, ge=1)
    max_projects: Optional[int] = Field(default=None, ge=1)
    max_storage_gb: Optional[int] = Field(default=None, ge=1)
    is_active: bool = True

    @field_validator("name", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class PlanUpdate(BaseModel):
    tier: Optional[str] = Field(default=None, min_length=2, max_length=50)
    name: Optional[str] = Field(default=None, min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    monthly_price: Optional[float] = Field(default=None, ge=0)
    annual_price: Optional[float] = Field(default=None, ge=0)
    max_users: Optional[int] = Field(default=None, ge=1)
    max_projects: Optional[int] = Field(default=None, ge=1)
    max_storage_gb: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None

    @field_validator("name", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


# ========================
# Subscription Schemas
# ========================


class SubscriptionResponse(CamelCaseModel):
    id: UUID
    organization_id: UUID
    plan_id: UUID
    billing_cycle: str
    status: str
    trial_ends_at: Optional[datetime] = None
    current_period_start: datetime
    current_period_end: datetime
    canceled_at: Optional[datetime] = None
    stripe_subscription_id: Optional[str] = None
    payplus_subscription_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    plan: Optional[PlanResponse] = None


class SubscriptionCreate(BaseModel):
    organization_id: UUID
    plan_id: UUID
    billing_cycle: Literal["monthly", "annual"] = "monthly"
    trial_days: Optional[int] = Field(default=14, ge=0, le=90)


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[UUID] = None
    billing_cycle: Optional[Literal["monthly", "annual"]] = None
    status: Optional[Literal["trial", "active", "canceled", "past_due"]] = None


class SubscriptionUpgrade(BaseModel):
    plan_id: UUID
    billing_cycle: Optional[Literal["monthly", "annual"]] = None


class SubscriptionCancel(BaseModel):
    immediate: bool = Field(default=False, description="Cancel immediately or at period end")
