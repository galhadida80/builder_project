from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.models.export_job import ExportFormat, ExportType
from app.schemas.user import UserResponse


class ExportRequest(BaseModel):
    """Request schema for creating a new export job"""
    export_format: ExportFormat
    export_type: ExportType
    project_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None


class ExportJobResponse(CamelCaseModel):
    """Response schema for export job data (auto-converts to camelCase)"""
    id: UUID
    project_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    export_format: str
    export_type: str
    status: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    error_message: Optional[str] = None
    requested_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
