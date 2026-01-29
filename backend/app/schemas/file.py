from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class FileResponse(BaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: str
    uploaded_at: datetime
    uploaded_by: Optional[UserResponse] = None

    class Config:
        from_attributes = True
