from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class ApprovalDecisionCreate(BaseModel):
    decision: str
    comments: str | None = None


class ApprovalDecisionResponse(BaseModel):
    id: UUID
    submission_id: UUID
    decision: str
    comments: str | None = None
    decided_by_id: UUID
    decided_by: UserResponse | None = None
    decided_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
