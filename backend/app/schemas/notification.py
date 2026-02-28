from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, CamelCaseModel, sanitize_string
from app.models.notification import NotificationCategory, UrgencyLevel


class NotificationBase(BaseModel):
    category: NotificationCategory
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    title: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    message: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    related_entity_type: Optional[str] = Field(default=None, max_length=100)
    related_entity_id: Optional[UUID] = None

    @field_validator('title', 'message', 'related_entity_type', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class NotificationCreate(NotificationBase):
    pass


class NotificationResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    category: str
    urgency: str
    title: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[UUID] = None
    is_read: bool = False
    created_at: datetime
    updated_at: datetime


class NotificationListResponse(CamelCaseModel):
    items: list[NotificationResponse]
    total: int
    limit: int
    offset: int


class UnreadCountResponse(CamelCaseModel):
    unread_count: int
