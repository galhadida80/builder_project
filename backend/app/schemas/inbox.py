from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional, Union
from uuid import UUID

from app.core.validators import CamelCaseModel


class InboxApprovalItem(CamelCaseModel):
    id: UUID
    entity_type: Literal["approval"] = "approval"
    project_id: UUID
    project_name: str
    entity_kind: str
    entity_id: UUID
    current_status: str
    created_at: datetime


class InboxTaskItem(CamelCaseModel):
    id: UUID
    entity_type: Literal["task"] = "task"
    project_id: UUID
    project_name: str
    title: str
    status: str
    priority: str
    due_date: Optional[date] = None


class InboxRFIItem(CamelCaseModel):
    id: UUID
    entity_type: Literal["rfi"] = "rfi"
    project_id: UUID
    project_name: str
    subject: str
    rfi_number: int
    priority: str
    status: str
    due_date: Optional[date] = None


class InboxMeetingItem(CamelCaseModel):
    id: UUID
    entity_type: Literal["meeting"] = "meeting"
    project_id: UUID
    project_name: str
    title: str
    scheduled_date: Optional[datetime] = None
    location: Optional[str] = None
    meeting_type: Optional[str] = None


class InboxDefectItem(CamelCaseModel):
    id: UUID
    entity_type: Literal["defect"] = "defect"
    project_id: UUID
    project_name: str
    description: Optional[str] = None
    defect_number: int
    severity: Optional[str] = None
    category: Optional[str] = None


InboxItem = Union[
    InboxApprovalItem,
    InboxTaskItem,
    InboxRFIItem,
    InboxMeetingItem,
    InboxDefectItem,
]


class InboxCountsResponse(CamelCaseModel):
    total: int
    approval_count: int
    task_count: int
    rfi_count: int
    meeting_count: int
    defect_count: int


class InboxResponse(CamelCaseModel):
    counts: InboxCountsResponse
    items: list[InboxItem]
