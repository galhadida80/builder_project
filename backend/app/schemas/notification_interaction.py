from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.models.notification_interaction import InteractionType


class NotificationInteractionCreate(BaseModel):
    interaction_type: InteractionType


class NotificationInteractionResponse(CamelCaseModel):
    id: UUID
    notification_id: UUID
    user_id: UUID
    interaction_type: str
    created_at: datetime
