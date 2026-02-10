from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class AuditLogResponse(CamelCaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    user: Optional[UserResponse] = None
    entity_type: str
    entity_id: UUID
    action: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
