from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


class DocumentVersionCreate(BaseModel):
    change_summary: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator('change_summary', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class DocumentVersionResponse(CamelCaseModel):
    id: UUID
    file_id: UUID
    version_number: int
    filename: str
    storage_path: str
    file_size: Optional[int] = None
    change_summary: Optional[str] = None
    uploaded_by_id: Optional[UUID] = None
    uploaded_by: Optional[UserResponse] = None
    created_at: datetime


class AnnotationCreate(BaseModel):
    page_number: int = Field(ge=1, default=1)
    x_position: float
    y_position: float
    width: Optional[float] = None
    height: Optional[float] = None
    annotation_type: str = Field(default="comment", max_length=50)
    content: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    color: Optional[str] = Field(default=None, max_length=20)

    @field_validator('content', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class AnnotationUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    is_resolved: Optional[bool] = None
    color: Optional[str] = Field(default=None, max_length=20)

    @field_validator('content', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class AnnotationResponse(CamelCaseModel):
    id: UUID
    file_id: UUID
    page_number: int
    x_position: float
    y_position: float
    width: Optional[float] = None
    height: Optional[float] = None
    annotation_type: str
    content: str
    color: Optional[str] = None
    created_by_id: Optional[UUID] = None
    created_by: Optional[UserResponse] = None
    is_resolved: bool = False
    created_at: datetime
    updated_at: datetime
