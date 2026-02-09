from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.core.validators import CamelCaseModel


class ApprovalAction(BaseModel):
    comments: Optional[str] = None


class SubmitForApprovalRequest(BaseModel):
    consultant_contact_id: Optional[UUID] = None
    inspector_contact_id: Optional[UUID] = None


class ApprovalStepResponse(CamelCaseModel):
    id: UUID
    approval_request_id: UUID
    step_order: int
    approver_id: Optional[UUID] = None
    approver: Optional[UserResponse] = None
    approver_role: Optional[str] = None
    contact_id: Optional[UUID] = None
    status: str
    comments: Optional[str] = None
    decided_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ApprovalRequestResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    current_status: str
    created_at: datetime
    created_by: Optional[UserResponse] = None
    steps: list[ApprovalStepResponse] = []
