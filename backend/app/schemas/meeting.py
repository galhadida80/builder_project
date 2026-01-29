from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH
)


class ActionItem(BaseModel):
    id: str = Field(max_length=100)
    description: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    assignee_id: UUID | None = None
    due_date: datetime | None = None
    is_completed: bool = False

    @field_validator('description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize_string(v) or ''


class MeetingAttendeeCreate(BaseModel):
    user_id: UUID
    role: str | None = Field(default=None, max_length=100)

    @field_validator('role', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MeetingAttendeeResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    user_id: UUID | None = None
    user: UserResponse | None = None
    role: str | None = None
    confirmed: bool = False

    class Config:
        from_attributes = True


class MeetingBase(BaseModel):
    title: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    meeting_type: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    scheduled_date: datetime
    scheduled_time: str | None = Field(default=None, max_length=20)

    @field_validator('title', 'description', 'meeting_type', 'location', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    meeting_type: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    scheduled_date: datetime | None = None
    scheduled_time: str | None = Field(default=None, max_length=20)
    summary: str | None = Field(default=None, max_length=MAX_NOTES_LENGTH)
    action_items: list[ActionItem] | None = Field(default=None, max_length=50)
    status: str | None = Field(default=None, max_length=50)

    @field_validator('title', 'description', 'meeting_type', 'location', 'summary', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class MeetingResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    meeting_type: str | None = None
    location: str | None = None
    scheduled_date: datetime
    scheduled_time: str | None = None
    google_event_id: str | None = None
    summary: str | None = None
    action_items: list[ActionItem] | None = None
    status: str
    created_at: datetime
    created_by: UserResponse | None = None
    attendees: list[MeetingAttendeeResponse] = []

    class Config:
        from_attributes = True
