from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


class DocumentAnalysisCreate(BaseModel):
    file_id: UUID
    analysis_type: str = Field(min_length=1, max_length=50)


class DocumentAnalysisResponse(CamelCaseModel):
    id: UUID
    file_id: UUID
    project_id: UUID
    analysis_type: str
    result: dict | None = None
    model_used: str
    status: str
    error_message: str | None = None
    processing_time_ms: int | None = None
    created_at: datetime
    updated_at: datetime


class DocumentAnalysisListResponse(CamelCaseModel):
    items: list[DocumentAnalysisResponse]
    total: int
