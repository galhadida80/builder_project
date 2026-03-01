from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class BatchUploadCreate(BaseModel):
    entity_type: str = "project"
    entity_id: Optional[UUID] = None
    category: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None


class BatchUploadFileResponse(CamelCaseModel):
    id: UUID
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: str
    uploaded_at: datetime


class BatchUploadResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    total_files: int
    processed_files: int
    failed_files: int
    status: str
    metadata_json: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    uploader: Optional[UserResponse] = None


class BatchUploadStatusResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    total_files: int
    processed_files: int
    failed_files: int
    status: str
    metadata_json: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    uploader: Optional[UserResponse] = None
    files: list[BatchUploadFileResponse] = []
