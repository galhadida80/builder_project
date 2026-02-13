from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


class ApprovalDecisionCreate(BaseModel):
    decision: Literal["approved", "rejected", "revision_requested"]
    comments: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('comments', mode='before')
    @classmethod
    def sanitize_comments(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class ApprovalDecisionResponse(CamelCaseModel):
    id: UUID
    submission_id: UUID
    decision: str
    comments: str | None = None
    decided_by_id: UUID
    decided_by: UserResponse | None = None
    decided_at: datetime
    created_at: datetime
