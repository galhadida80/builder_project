from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse


class FileResponse(BaseModel):
    id: UUID
    project_id: UUID
    entity_type: str | None = None
    entity_id: UUID | None = None
    file_name: str
    original_name: str
    file_type: str | None = None
    file_size: int | None = None
    gcs_path: str
    version: int
    uploaded_by: UserResponse | None = None
    created_at: datetime

    class Config:
        from_attributes = True
