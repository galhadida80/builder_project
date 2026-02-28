from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


ENTITY_TYPES = Literal["defect", "issue", "rfi", "inspection", "punch_item"]


class FloorplanCreate(BaseModel):
    name: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    floor_number: Optional[int] = None
    file_id: Optional[UUID] = None
    version: int = Field(default=1, ge=1)

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class FloorplanUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    floor_number: Optional[int] = None
    file_id: Optional[UUID] = None
    is_active: Optional[bool] = None

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class FileBrief(CamelCaseModel):
    id: UUID
    filename: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None


class FloorplanResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    floor_number: Optional[int] = None
    name: str
    file_id: Optional[UUID] = None
    version: int
    is_active: bool
    created_at: datetime
    created_by_id: Optional[UUID] = None
    updated_at: datetime
    file: Optional[FileBrief] = None
    created_by: Optional[UserResponse] = None


class FloorplanPinCreate(BaseModel):
    entity_type: ENTITY_TYPES
    entity_id: UUID
    x_position: float = Field(ge=0.0, le=1.0)
    y_position: float = Field(ge=0.0, le=1.0)


class FloorplanPinUpdate(BaseModel):
    x_position: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    y_position: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class FloorplanPinResponse(CamelCaseModel):
    id: UUID
    floorplan_id: UUID
    entity_type: str
    entity_id: UUID
    x_position: float
    y_position: float
    created_at: datetime
    created_by_id: Optional[UUID] = None
    created_by: Optional[UserResponse] = None
