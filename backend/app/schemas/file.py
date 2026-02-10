from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class FileResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: str
    uploaded_at: datetime
    uploaded_by: UserResponse | None = None
