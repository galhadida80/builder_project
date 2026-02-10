from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.validators import CamelCaseModel


class ChatActionResponse(CamelCaseModel):
    id: UUID
    conversation_id: UUID
    message_id: UUID
    action_type: str
    entity_type: str
    entity_id: Optional[UUID] = None
    parameters: dict = {}
    description: str
    status: str
    result: Optional[dict] = None
    created_at: datetime
    executed_at: Optional[datetime] = None
