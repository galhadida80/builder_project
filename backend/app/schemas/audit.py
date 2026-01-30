from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse
from app.core.validators import CamelCaseModel


class AuditLogResponse(CamelCaseModel):
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
