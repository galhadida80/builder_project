from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse

TASK_STATUSES = Literal["not_started", "in_progress", "completed", "on_hold", "cancelled"]
TASK_PRIORITIES = Literal["low", "medium", "high", "urgent"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    priority: TASK_PRIORITIES = "medium"
    assignee_id: Optional[UUID] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    status: Optional[TASK_STATUSES] = None
    priority: Optional[TASK_PRIORITIES] = None
    assignee_id: Optional[UUID] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class TaskDependencyResponse(CamelCaseModel):
    id: UUID
    task_id: UUID
    depends_on_id: UUID
    dependency_type: str


class TaskResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    task_number: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assignee_id: Optional[UUID] = None
    reporter_id: Optional[UUID] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserResponse] = None
    reporter: Optional[UserResponse] = None
    created_by: Optional[UserResponse] = None
    dependencies: list[TaskDependencyResponse] = []


class TaskSummaryResponse(CamelCaseModel):
    total: int
    not_started_count: int
    in_progress_count: int
    completed_count: int
    on_hold_count: int
    overdue_count: int


class TaskBulkUpdate(BaseModel):
    task_ids: list[UUID]
    status: Optional[TASK_STATUSES] = None
    assignee_id: Optional[UUID] = None
