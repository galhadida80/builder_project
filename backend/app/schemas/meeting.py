from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ActionItem(BaseModel):
    id: str
    description: str
    assignee_id: UUID | None = None
    due_date: datetime | None = None
    is_completed: bool = False


class MeetingAttendeeCreate(BaseModel):
    user_id: UUID
    role: str | None = None


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
    title: str
    description: str | None = None
    meeting_type: str | None = None
    location: str | None = None
    scheduled_date: datetime
    scheduled_time: str | None = None


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    meeting_type: str | None = None
    location: str | None = None
    scheduled_date: datetime | None = None
    scheduled_time: str | None = None
    summary: str | None = None
    action_items: list[ActionItem] | None = None
    status: str | None = None


class MeetingResponse(MeetingBase):
    id: UUID
    project_id: UUID
    google_event_id: str | None = None
    summary: str | None = None
    action_items: list[ActionItem] | None = None
    status: str
    created_at: datetime
    created_by: UserResponse | None = None
    attendees: list[MeetingAttendeeResponse] = []

    class Config:
        from_attributes = True
