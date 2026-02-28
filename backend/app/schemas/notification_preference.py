from __future__ import annotations

from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel
from app.models.notification import UrgencyLevel
from app.models.notification_preference import DigestFrequency


class NotificationPreferenceBase(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    enabled: bool = True
    min_urgency_level: UrgencyLevel = UrgencyLevel.LOW
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    email_enabled: bool = True
    push_enabled: bool = True
    digest_frequency: DigestFrequency = DigestFrequency.IMMEDIATE


class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass


class NotificationPreferenceUpdate(BaseModel):
    category: Optional[str] = Field(default=None, min_length=1, max_length=50)
    enabled: Optional[bool] = None
    min_urgency_level: Optional[UrgencyLevel] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    digest_frequency: Optional[DigestFrequency] = None


class NotificationPreferenceResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    category: str
    enabled: bool
    min_urgency_level: str
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    email_enabled: bool
    push_enabled: bool
    digest_frequency: str
    created_at: datetime
    updated_at: datetime


class NotificationPreferenceListResponse(CamelCaseModel):
    items: list[NotificationPreferenceResponse]
    total: int
    limit: int
    offset: int
