from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class BatchUploadCreate(BaseModel):
    """Request schema for creating a batch upload"""
    pass


class ProcessingTaskResponse(CamelCaseModel):
    id: UUID
    batch_upload_id: UUID
    file_id: UUID
    task_type: str
    status: str
    progress_percent: int | None = None
    error_message: str | None = None
    celery_task_id: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class BatchUploadResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    total_files: int
    completed_files: int
    failed_files: int
    status: str
    created_at: datetime
    updated_at: datetime
    user: UserResponse | None = None
    processing_tasks: list[ProcessingTaskResponse] = []


class BatchUploadListResponse(CamelCaseModel):
    items: list[BatchUploadResponse]
    total: int
