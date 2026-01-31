from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.core.validators import (
    sanitize_string, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, CamelCaseModel
)
from app.models.notification import NotificationCategory


class NotificationBase(BaseModel):
    category: NotificationCategory
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
    title: str
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[UUID] = None
    is_read: bool = False
    created_at: datetime
    updated_at: datetime
