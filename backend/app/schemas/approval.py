from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ApprovalAction(BaseModel):
    comments: Optional[str] = None


class ApprovalStepResponse(BaseModel):
    id: UUID
    approval_request_id: UUID
    step_order: int
    approver_id: Optional[UUID] = None
    approver: Optional[UserResponse] = None
    approver_role: Optional[str] = None
    status: str
    comments: Optional[str] = None
    decided_at: Optional[datetime] = None
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
    created_by: Optional[UserResponse] = None
    steps: list[ApprovalStepResponse] = []

    class Config:
        from_attributes = True
