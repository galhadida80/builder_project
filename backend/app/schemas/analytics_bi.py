from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH

KPI_TYPES = Literal["count", "ratio", "average", "sum"]
ENTITY_TYPES = Literal["equipment", "material", "inspection", "rfi", "defect", "task", "budget", "checklist", "area"]
KPI_STATUS = Literal["on_track", "warning", "off_track", "no_target"]


class KpiCreate(BaseModel):
    name: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    kpi_type: KPI_TYPES
    entity_type: ENTITY_TYPES
    filter_config: Optional[dict] = None
    calculation: str = Field(default="count", max_length=50)
    field_name: Optional[str] = Field(None, max_length=100)
    project_id: Optional[UUID] = None
    target_value: Optional[float] = None
    warning_threshold: Optional[float] = None
    unit: Optional[str] = Field(None, max_length=50)
    display_order: int = 0
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=20)


class KpiUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    kpi_type: Optional[KPI_TYPES] = None
    entity_type: Optional[ENTITY_TYPES] = None
    filter_config: Optional[dict] = None
    calculation: Optional[str] = Field(None, max_length=50)
    field_name: Optional[str] = Field(None, max_length=100)
    project_id: Optional[UUID] = None
    target_value: Optional[float] = None
    warning_threshold: Optional[float] = None
    unit: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=20)


class KpiResponse(CamelCaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    kpi_type: str
    entity_type: str
    filter_config: Optional[dict] = None
    calculation: str
    field_name: Optional[str] = None
    target_value: Optional[float] = None
    warning_threshold: Optional[float] = None
    unit: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    icon: Optional[str] = None
    color: Optional[str] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime


class KpiSnapshotPoint(CamelCaseModel):
    snapshot_date: date
    value: float


class KpiValueResponse(CamelCaseModel):
    kpi_id: UUID
    name: str
    value: float
    entity_type: str
    kpi_type: str
    target_value: Optional[float] = None
    warning_threshold: Optional[float] = None
    unit: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    status: KPI_STATUS = "no_target"
    trend: list[KpiSnapshotPoint] = []


class KpiSnapshotResponse(CamelCaseModel):
    kpi_id: UUID
    value: float
    snapshot_date: date


class TrendPoint(CamelCaseModel):
    date: str
    count: int


class TrendAnalysisResponse(CamelCaseModel):
    entity_type: str
    period: str
    data_points: list[TrendPoint]


class ProjectBenchmark(CamelCaseModel):
    project_id: UUID
    project_name: str
    metrics: dict[str, float]


class BenchmarkResponse(CamelCaseModel):
    projects: list[ProjectBenchmark]
