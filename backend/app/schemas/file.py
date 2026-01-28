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
    file_type: str | None = None
    file_size: int | None = None
    storage_path: str
    uploaded_at: datetime
    uploaded_by: UserResponse | None = None

    class Config:
        from_attributes = True
