from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel

RISK_LEVELS = Literal["low", "medium", "high", "critical"]


class MitigationSuggestion(CamelCaseModel):
    id: str
    title: str
    description: str
    priority: str
    estimated_impact: Optional[str] = None


class ScheduleRiskResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    task_id: Optional[UUID] = None
    confidence_score: float
    predicted_delay_days: Optional[float] = None
    risk_level: str
    factors: Optional[dict] = None
    mitigation_suggestions: Optional[dict] = None
    analyzed_at: datetime
    created_at: datetime
    updated_at: datetime


class WhatIfScenarioRequest(BaseModel):
    task_id: UUID
    delay_days: float = Field(gt=0, description="Number of days to delay the task")


class AffectedTask(CamelCaseModel):
    task_id: UUID
    task_title: str
    original_due_date: Optional[datetime] = None
    new_due_date: Optional[datetime] = None
    delay_impact_days: float


class WhatIfScenarioResponse(CamelCaseModel):
    scenario_task_id: UUID
    scenario_delay_days: float
    affected_tasks: list[AffectedTask]
    original_project_end_date: Optional[datetime] = None
    new_project_end_date: Optional[datetime] = None
    total_project_delay_days: float


class CriticalPathTask(CamelCaseModel):
    task_id: UUID
    task_title: str
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    duration_days: float
    slack_days: float


class CriticalPathResponse(CamelCaseModel):
    project_id: UUID
    critical_path_tasks: list[CriticalPathTask]
    total_duration_days: float
    project_start_date: Optional[datetime] = None
    project_end_date: Optional[datetime] = None


class ProjectRiskSummary(CamelCaseModel):
    project_id: UUID
    overall_confidence_score: float
    total_tasks: int
    at_risk_tasks: int
    critical_path_length: int
    last_analyzed_at: Optional[datetime] = None
    top_risks: list[ScheduleRiskResponse] = []
