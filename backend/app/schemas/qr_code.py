from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class QRCodeGenerateRequest(BaseModel):
    entity_type: str = Field(min_length=1, max_length=50)
    entity_id: UUID
    format: Optional[str] = Field(default="png", pattern="^(png|svg)$")
    size: Optional[int] = Field(default=300, ge=100, le=1000)


class QRCodeResponse(CamelCaseModel):
    entity_type: str
    entity_id: UUID
    qr_code_data: str
    format: str
    size: int


class ScanHistoryCreate(BaseModel):
    entity_type: str = Field(min_length=1, max_length=50)
    entity_id: UUID


class ScanHistoryResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    entity_type: str
    entity_id: UUID
    scanned_at: datetime
    created_at: datetime
    user: Optional[UserResponse] = None


class BulkQRCodeItem(BaseModel):
    entity_type: str
    entity_id: UUID


class BulkQRCodeRequest(BaseModel):
    items: list[BulkQRCodeItem] = Field(max_length=100)
    format: Optional[str] = Field(default="png", pattern="^(png|svg)$")
    size: Optional[int] = Field(default=300, ge=100, le=1000)


class BulkQRCodePDFRequest(BaseModel):
    items: list[BulkQRCodeItem] = Field(max_length=100)
    project_id: UUID
    language: Optional[str] = Field(default="he", pattern="^(he|en)$")


class PaginatedScanHistoryResponse(BaseModel):
    items: list[ScanHistoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
