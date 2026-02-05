from __future__ import annotations

from typing import Optional

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NOTES_LENGTH,
    CamelCaseModel
)
class ActionItem(BaseModel):
    id: str = Field(max_length=100)
    description: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    assignee_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False

    @field_validator('description', mode='before')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize_string(v) or ''
class MeetingAttendeeCreate(BaseModel):
    user_id: UUID
    role: Optional[str] = Field(default=None, max_length=100)

    @field_validator('role', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)
class MeetingAttendeeResponse(CamelCaseModel):
    id: UUID
    meeting_id: UUID
    user_id: Optional[UUID] = None
    user: Optional[UserResponse] = None
    role: Optional[str] = None
    confirmed: bool = False
class MeetingBase(BaseModel):
    title: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    meeting_type: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    scheduled_date: datetime
    scheduled_time: Optional[str] = Field(default=None, max_length=20)

    @field_validator('title', 'description', 'meeting_type', 'location', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)
class MeetingCreate(MeetingBase):
    pass
class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    meeting_type: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = Field(default=None, max_length=20)
    summary: Optional[str] = Field(default=None, max_length=MAX_NOTES_LENGTH)
    action_items: Optional[list[ActionItem]] = Field(default=None, max_length=50)
    status: Optional[str] = Field(default=None, max_length=50)

    @field_validator('title', 'description', 'meeting_type', 'location', 'summary', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)
class MeetingResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: Optional[str] = None
    meeting_type: Optional[str] = None
    location: Optional[str] = None
    scheduled_date: datetime
    scheduled_time: Optional[str] = None
    google_event_id: Optional[str] = None
    summary: Optional[str] = None
    action_items: Optional[list[ActionItem]] = None
    status: str
    created_at: datetime
    created_by: Optional[UserResponse] = None
    attendees: list[MeetingAttendeeResponse] = []
