from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


RISK_LEVELS = Literal["low", "medium", "high", "critical"]


class AreaBrief(CamelCaseModel):
    id: UUID
    name: str
    area_code: Optional[str] = None
    floor_number: Optional[int] = None


class RiskScoreCreate(BaseModel):
    area_id: Optional[UUID] = None
    risk_score: Decimal = Field(ge=0, le=100)
    risk_level: RISK_LEVELS
    defect_count: int = Field(default=0, ge=0)
    severity_score: Decimal = Field(default=0, ge=0, le=100)
    predicted_defect_types: list[str] = Field(default_factory=list)
    contributing_factors: dict = Field(default_factory=dict)
    calculation_metadata: dict = Field(default_factory=dict)
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None
    calculated_by_id: Optional[UUID] = None

    @field_validator("valid_until", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("notes", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class RiskScoreUpdate(BaseModel):
    area_id: Optional[UUID] = None
    risk_score: Optional[Decimal] = Field(default=None, ge=0, le=100)
    risk_level: Optional[RISK_LEVELS] = None
    defect_count: Optional[int] = Field(default=None, ge=0)
    severity_score: Optional[Decimal] = Field(default=None, ge=0, le=100)
    predicted_defect_types: Optional[list[str]] = None
    contributing_factors: Optional[dict] = None
    calculation_metadata: Optional[dict] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None

    @field_validator("valid_until", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("notes", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class RiskScoreResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    area_id: Optional[UUID] = None
    risk_score: Decimal
    risk_level: str
    defect_count: int
    severity_score: Decimal
    predicted_defect_types: list[str]
    contributing_factors: dict
    calculation_metadata: dict
    notes: Optional[str] = None
    calculated_at: datetime
    valid_until: Optional[datetime] = None
    calculated_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    area: Optional[AreaBrief] = None
    calculated_by: Optional[UserResponse] = None


class RiskScoreSummaryResponse(CamelCaseModel):
    total_areas: int
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    critical_risk_count: int
    average_risk_score: Decimal
    highest_risk_area: Optional[AreaBrief] = None
    by_floor: dict[str, int]


class PredictedDefectType(BaseModel):
    category: str
    probability: float
    historical_count: int


class RiskFactorItem(BaseModel):
    factor: str
    weight: float
    description: str


class RiskAnalysisResponse(CamelCaseModel):
    area_id: UUID
    area_name: str
    risk_score: Decimal
    risk_level: str
    predicted_defects: list[PredictedDefectType]
    risk_factors: list[RiskFactorItem]
    recommendation: str


class RiskThresholdCreate(BaseModel):
    low_threshold: Decimal = Field(default=25.0, ge=0, le=100)
    medium_threshold: Decimal = Field(default=50.0, ge=0, le=100)
    high_threshold: Decimal = Field(default=75.0, ge=0, le=100)
    critical_threshold: Decimal = Field(default=90.0, ge=0, le=100)
    auto_schedule_inspections: bool = Field(default=False)
    auto_schedule_threshold: Literal["low", "medium", "high", "critical"] = Field(default="high")


class RiskThresholdUpdate(BaseModel):
    low_threshold: Optional[Decimal] = Field(default=None, ge=0, le=100)
    medium_threshold: Optional[Decimal] = Field(default=None, ge=0, le=100)
    high_threshold: Optional[Decimal] = Field(default=None, ge=0, le=100)
    critical_threshold: Optional[Decimal] = Field(default=None, ge=0, le=100)
    auto_schedule_inspections: Optional[bool] = None
    auto_schedule_threshold: Optional[Literal["low", "medium", "high", "critical"]] = None


class RiskThresholdResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    low_threshold: Decimal
    medium_threshold: Decimal
    high_threshold: Decimal
    critical_threshold: Decimal
    auto_schedule_inspections: bool
    auto_schedule_threshold: str
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[UUID] = None


class DefectTrendByTrade(CamelCaseModel):
    category: str
    total_count: int
    severity_breakdown: dict[str, int]
    avg_resolution_days: Optional[float] = None


class DefectTrendByFloor(CamelCaseModel):
    floor_number: int
    total_count: int
    severity_breakdown: dict[str, int]
    top_categories: list[dict]


class DefectTrendByPhase(CamelCaseModel):
    phase: str
    period_start: str
    period_end: str
    total_count: int
    severity_breakdown: dict[str, int]


class DefectTrendBySeason(CamelCaseModel):
    season: str
    total_count: int
    severity_breakdown: dict[str, int]


class DefectTrendAnalysisResponse(CamelCaseModel):
    by_trade: list[DefectTrendByTrade]
    by_floor: list[DefectTrendByFloor]
    by_phase: list[DefectTrendByPhase]
    by_season: list[DefectTrendBySeason]
    period_start: str
    period_end: str
    total_defects: int
