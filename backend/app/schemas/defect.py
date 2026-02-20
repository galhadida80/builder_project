from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


DEFECT_CATEGORIES = Literal[
    "concrete_structure", "structural", "wet_room_waterproofing", "plaster",
    "roof", "roof_waterproofing", "painting", "plumbing", "flooring",
    "tiling", "fire_passage_sealing", "fire_safety", "building_general",
    "moisture", "waterproofing", "insulation", "hvac", "electrical",
    "lighting", "solar_system", "windows_doors", "drainage", "elevator",
    "gas", "accessibility", "exterior_cladding", "landscaping", "other",
]

DEFECT_SEVERITIES = Literal["low", "medium", "high", "critical"]
DEFECT_STATUSES = Literal["open", "in_progress", "resolved", "closed"]


class ContactBrief(CamelCaseModel):
    id: UUID
    contact_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class AreaBrief(CamelCaseModel):
    id: UUID
    name: str
    area_code: Optional[str] = None
    floor_number: Optional[int] = None


class DefectAssigneeResponse(CamelCaseModel):
    id: UUID
    contact_id: UUID
    contact: Optional[ContactBrief] = None


class DefectCreate(BaseModel):
    description: str = Field(min_length=2, max_length=MAX_DESCRIPTION_LENGTH)
    category: DEFECT_CATEGORIES
    defect_type: str = Field(default="non_conformance", max_length=MAX_NAME_LENGTH)
    area_id: Optional[UUID] = None
    severity: DEFECT_SEVERITIES
    is_repeated: bool = False
    due_date: Optional[datetime] = None
    reporter_id: Optional[UUID] = None
    assigned_contact_id: Optional[UUID] = None
    followup_contact_id: Optional[UUID] = None
    checklist_instance_id: Optional[UUID] = None
    assignee_ids: list[UUID] = Field(default_factory=list)

    @field_validator("description", "defect_type", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class DefectUpdate(BaseModel):
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    category: Optional[DEFECT_CATEGORIES] = None
    defect_type: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    area_id: Optional[UUID] = None
    status: Optional[DEFECT_STATUSES] = None
    severity: Optional[DEFECT_SEVERITIES] = None
    is_repeated: Optional[bool] = None
    due_date: Optional[datetime] = None
    reporter_id: Optional[UUID] = None
    assigned_contact_id: Optional[UUID] = None
    followup_contact_id: Optional[UUID] = None

    @field_validator("description", "defect_type", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class DefectResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    defect_number: int
    category: str
    defect_type: str
    description: str
    area_id: Optional[UUID] = None
    status: str
    severity: str
    is_repeated: bool
    due_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    reporter_id: Optional[UUID] = None
    assigned_contact_id: Optional[UUID] = None
    followup_contact_id: Optional[UUID] = None
    checklist_instance_id: Optional[UUID] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    area: Optional[AreaBrief] = None
    reporter: Optional[ContactBrief] = None
    assigned_contact: Optional[ContactBrief] = None
    followup_contact: Optional[ContactBrief] = None
    created_by: Optional[UserResponse] = None
    assignees: list[DefectAssigneeResponse] = []


class DefectSummaryResponse(CamelCaseModel):
    total: int
    open_count: int
    in_progress_count: int
    resolved_count: int
    closed_count: int
    critical_count: int
    high_count: int
    by_category: dict[str, int]


class DefectAnalysisResponse(BaseModel):
    category: str
    severity: str
    description: str


class DefectAnalysisItem(BaseModel):
    category: str
    severity: str
    description: str


class MultiDefectAnalysisResponse(BaseModel):
    defects: list[DefectAnalysisItem]
    processing_time_ms: int


class PaginatedDefectResponse(BaseModel):
    items: list[DefectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
