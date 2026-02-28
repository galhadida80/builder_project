from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    MIN_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


class KeyPoint(BaseModel):
    id: str = Field(max_length=100)
    text: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('text', mode='before')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize_string(v) or ''


class ActionItemSchema(BaseModel):
    id: str = Field(max_length=100)
    description: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    assigned_to: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    is_completed: bool = False

    @field_validator('description', 'assigned_to', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class TalkAttendeeCreate(BaseModel):
    worker_id: Optional[UUID] = None
    worker_name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    attended: bool = True

    @field_validator('worker_name', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class TalkAttendeeResponse(CamelCaseModel):
    id: UUID
    talk_id: UUID
    worker_id: Optional[UUID] = None
    worker_name: Optional[str] = None
    attended: bool = True
    signature: Optional[str] = None
    signed_at: Optional[datetime] = None


class ToolboxTalkBase(BaseModel):
    title: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    topic: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    scheduled_date: datetime
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    presenter: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=480)

    @field_validator('scheduled_date', mode='before')
    @classmethod
    def strip_timezone(cls, v):
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator('title', 'topic', 'description', 'location', 'presenter', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ToolboxTalkCreate(ToolboxTalkBase):
    attendee_ids: list[str] = Field(default_factory=list, max_length=100)
    key_points: Optional[list[KeyPoint]] = Field(default=None, max_length=20)
    action_items: Optional[list[ActionItemSchema]] = Field(default=None, max_length=50)


class ToolboxTalkUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    topic: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    scheduled_date: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    presenter: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=480)
    key_points: Optional[list[KeyPoint]] = Field(default=None, max_length=20)
    action_items: Optional[list[ActionItemSchema]] = Field(default=None, max_length=50)
    status: Literal["scheduled", "completed", "cancelled"] | None = None
    attendee_ids: Optional[list[str]] = Field(default=None, max_length=100)

    @field_validator('scheduled_date', mode='before')
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator('title', 'topic', 'description', 'location', 'presenter', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ToolboxTalkResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    title: str
    topic: str
    description: Optional[str] = None
    scheduled_date: datetime
    location: Optional[str] = None
    presenter: Optional[str] = None
    key_points: Optional[list[KeyPoint]] = None
    action_items: Optional[list[ActionItemSchema]] = None
    duration_minutes: Optional[int] = None
    status: str
    created_at: datetime
    created_by: Optional[UserResponse] = None
    attendees: list[TalkAttendeeResponse] = []
