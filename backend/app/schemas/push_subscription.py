from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=1, max_length=500)
    p256dh_key: str = Field(min_length=1, max_length=255)
    auth_key: str = Field(min_length=1, max_length=255)


class PushSubscriptionResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    endpoint: str
    p256dh_key: str
    auth_key: str
    created_at: datetime
