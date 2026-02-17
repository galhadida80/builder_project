from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH

KPI_TYPES = Literal["count", "ratio", "average", "sum"]
ENTITY_TYPES = Literal["equipment", "material", "inspection", "rfi", "defect", "task", "budget"]


class KpiCreate(BaseModel):
    name: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    kpi_type: KPI_TYPES
    entity_type: ENTITY_TYPES
    filter_config: Optional[dict] = None
    calculation: str = Field(default="count", max_length=50)
    field_name: Optional[str] = Field(None, max_length=100)
    project_id: Optional[UUID] = None


class KpiUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    kpi_type: Optional[KPI_TYPES] = None
    entity_type: Optional[ENTITY_TYPES] = None
    filter_config: Optional[dict] = None
    calculation: Optional[str] = Field(None, max_length=50)
    field_name: Optional[str] = Field(None, max_length=100)
    project_id: Optional[UUID] = None


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
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime


class KpiValueResponse(CamelCaseModel):
    kpi_id: UUID
    name: str
    value: float
    entity_type: str
    kpi_type: str


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
