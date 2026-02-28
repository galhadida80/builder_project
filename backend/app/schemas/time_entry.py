from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse

TIME_ENTRY_STATUSES = Literal["active", "completed"]


class TimeEntryCreate(BaseModel):
    clock_in_time: datetime
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    task_id: Optional[UUID] = None
    break_minutes: Optional[int] = Field(default=0, ge=0)

    @field_validator("break_minutes", mode="before")
    @classmethod
    def validate_break_minutes(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("break_minutes must be non-negative")
        return v


class TimeEntryUpdate(BaseModel):
    clock_out_time: Optional[datetime] = None
    break_minutes: Optional[int] = Field(default=None, ge=0)
    status: Optional[TIME_ENTRY_STATUSES] = None

    @field_validator("break_minutes", mode="before")
    @classmethod
    def validate_break_minutes(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("break_minutes must be non-negative")
        return v


class TimeEntryResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    task_id: Optional[UUID] = None
    clock_in_time: datetime
    clock_out_time: Optional[datetime] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    break_minutes: Optional[int] = 0
    status: str
    created_at: datetime
    updated_at: datetime
    user: Optional[UserResponse] = None
    total_hours: Optional[float] = None

    @classmethod
    def from_orm_with_total_hours(cls, time_entry):
        """Calculate total hours from clock in/out times"""
        total_hours = None
        if time_entry.clock_out_time:
            duration = time_entry.clock_out_time - time_entry.clock_in_time
            total_seconds = duration.total_seconds()
            break_seconds = (time_entry.break_minutes or 0) * 60
            worked_seconds = max(0, total_seconds - break_seconds)
            total_hours = round(worked_seconds / 3600, 2)

        data = {
            "id": time_entry.id,
            "user_id": time_entry.user_id,
            "project_id": time_entry.project_id,
            "task_id": time_entry.task_id,
            "clock_in_time": time_entry.clock_in_time,
            "clock_out_time": time_entry.clock_out_time,
            "location_lat": time_entry.location_lat,
            "location_lng": time_entry.location_lng,
            "break_minutes": time_entry.break_minutes,
            "status": time_entry.status,
            "created_at": time_entry.created_at,
            "updated_at": time_entry.updated_at,
            "total_hours": total_hours,
        }

        if hasattr(time_entry, "user") and time_entry.user:
            data["user"] = UserResponse.model_validate(time_entry.user)

        return cls(**data)


class TimeEntrySummaryResponse(CamelCaseModel):
    total_entries: int
    active_entries: int
    completed_entries: int
    total_hours: float
    regular_hours: float
    overtime_hours: float
