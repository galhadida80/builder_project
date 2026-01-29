from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ApprovalAction(BaseModel):
    comments: str | None = None


class ApprovalStepResponse(BaseModel):
    id: UUID
    approval_request_id: UUID
    step_order: int
    approver_id: UUID | None = None
    approver: UserResponse | None = None
    approver_role: str | None = None
    status: str
    comments: str | None = None
    decided_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalRequestResponse(BaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    current_status: str
    created_at: datetime
    created_by: UserResponse | None = None
    steps: list[ApprovalStepResponse] = []

    class Config:
        from_attributes = True
