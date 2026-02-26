from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel


class BlueprintExtractionResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    file_id: Optional[UUID] = None
    bim_model_id: Optional[UUID] = None
    extraction_source: str
    status: str
    extracted_data: Optional[Any] = None
    summary: Optional[Any] = None
    tier_used: Optional[str] = None
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    language: str = "he"
    version: int = 1
    created_at: datetime
    updated_at: datetime
    filename: Optional[str] = None


class BlueprintExtractionListItem(CamelCaseModel):
    id: UUID
    project_id: UUID
    file_id: Optional[UUID] = None
    bim_model_id: Optional[UUID] = None
    extraction_source: str
    status: str
    summary: Optional[Any] = None
    tier_used: Optional[str] = None
    processing_time_ms: Optional[int] = None
    language: str = "he"
    version: int = 1
    created_at: datetime
    updated_at: datetime
    filename: Optional[str] = None


class BlueprintUploadResponse(CamelCaseModel):
    id: UUID
    status: str
    extraction_source: str
    filename: str


class BlueprintImportRequest(BaseModel):
    items: list[int] = []
    floor_indices: list[int] = []


class BlueprintImportResult(CamelCaseModel):
    imported_count: int
    skipped_count: int
    entity_type: str
    imported_entity_ids: list[str] = []
