from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class AuditLogResponse(BaseModel):
    id: UUID
    project_id: UUID | None = None
    user_id: UUID | None = None
    user: UserResponse | None = None
    entity_type: str
    entity_id: UUID
    action: str
    old_values: dict | None = None
    new_values: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
