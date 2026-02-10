from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class ApprovalDecisionCreate(BaseModel):
    decision: str
    comments: str | None = None


class ApprovalDecisionResponse(CamelCaseModel):
    id: UUID
    submission_id: UUID
    decision: str
    comments: str | None = None
    decided_by_id: UUID
    decided_by: UserResponse | None = None
    decided_at: datetime
    created_at: datetime
