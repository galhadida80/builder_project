from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.core.validators import CamelCaseModel


class ApprovalAction(BaseModel):
    comments: str | None = None


class ApprovalStepResponse(CamelCaseModel):
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


class ApprovalRequestResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    current_status: str
    created_at: datetime
    created_by: UserResponse | None = None
    steps: list[ApprovalStepResponse] = []
