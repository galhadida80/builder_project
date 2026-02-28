from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.core.validators import CamelCaseModel
from app.schemas.time_entry import TimeEntryResponse
from app.schemas.user import UserResponse


TIMESHEET_STATUSES = Literal["draft", "submitted", "approved", "rejected"]


class TimesheetCreate(BaseModel):
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v: date, info) -> date:
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be on or after start_date")
        return v


class TimesheetUpdate(BaseModel):
    status: Optional[TIMESHEET_STATUSES] = None
    total_hours: Optional[float] = None
    regular_hours: Optional[float] = None
    overtime_hours: Optional[float] = None


class TimesheetResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    start_date: date
    end_date: date
    total_hours: Optional[float] = None
    regular_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    status: str
    approved_by_id: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[UserResponse] = None
    approved_by: Optional[UserResponse] = None
    time_entries: Optional[List[TimeEntryResponse]] = None


class TimesheetSummaryResponse(CamelCaseModel):
    total_timesheets: int
    draft_timesheets: int
    submitted_timesheets: int
    approved_timesheets: int
    rejected_timesheets: int
    total_hours: float
    total_regular_hours: float
    total_overtime_hours: float
