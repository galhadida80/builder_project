from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.core.validators import CamelCaseModel


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
