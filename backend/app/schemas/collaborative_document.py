from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


CONTENT_TYPE = Literal["meeting_minutes", "specification", "report", "general"]


class CollaborativeDocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content_type: CONTENT_TYPE = "general"


class CollaborativeDocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)


class CollaboratorBrief(CamelCaseModel):
    id: UUID
    user_id: UUID
    full_name: str = ""
    email: str = ""
    is_active: bool = False
    last_seen_at: Optional[datetime] = None
    cursor_position: Optional[dict] = None


class CollaborativeDocumentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    title: str
    content_type: str
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    creator_name: str = ""
    collaborators: list[CollaboratorBrief] = []
    active_count: int = 0


class CollaborativeDocumentListResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    title: str
    content_type: str
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    creator_name: str = ""
    active_count: int = 0


class CollaboratorPresenceResponse(CamelCaseModel):
    document_id: UUID
    user_id: UUID
    full_name: str
    is_active: bool
    last_seen_at: Optional[datetime] = None
