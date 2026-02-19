from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


class ApprovalAction(BaseModel):
    comments: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('comments', mode='before')
    @classmethod
    def sanitize_comments(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SubmitForApprovalRequest(BaseModel):
    consultant_contact_id: Optional[UUID] = None
    inspector_contact_id: Optional[UUID] = None

    @model_validator(mode="after")
    def require_at_least_one_contact(self):
        if not self.consultant_contact_id and not self.inspector_contact_id:
            raise ValueError("At least one approver (consultant or inspector) must be selected")
        return self


class ApprovalStepResponse(CamelCaseModel):
    id: UUID
    approval_request_id: UUID
    step_order: int
    approved_by_id: Optional[UUID] = None
    approved_by: Optional[UserResponse] = None
    approver_role: Optional[str] = None
    contact_id: Optional[UUID] = None
    status: str
    comments: Optional[str] = None
    approved_at: Optional[datetime] = None
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


class PendingReminderResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    current_status: str
    created_at: datetime
    days_pending: int
    created_by: Optional[UserResponse] = None
    steps: list[ApprovalStepResponse] = []
