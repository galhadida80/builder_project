from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.core.validators import CamelCaseModel


class TimelineEvent(CamelCaseModel):
    """Timeline event for project activity history"""
    id: UUID
    date: datetime
    title: str
    description: Optional[str] = None
    event_type: str = Field(description="Type of event: inspection, milestone, equipment, material, meeting, etc.")
    entity_id: Optional[UUID] = None
    entity_type: Optional[str] = None
    user_name: Optional[str] = None
    metadata: Optional[dict] = None


class ProgressMetrics(CamelCaseModel):
    """Progress metrics for project completion tracking"""
    overall_percentage: float = Field(ge=0, le=100, description="Overall project completion percentage")
    inspections_completed: int = Field(ge=0)
    inspections_total: int = Field(ge=0)
    equipment_submitted: int = Field(ge=0)
    equipment_total: int = Field(ge=0)
    materials_submitted: int = Field(ge=0)
    materials_total: int = Field(ge=0)
    checklists_completed: int = Field(ge=0)
    checklists_total: int = Field(ge=0)


class TeamStats(CamelCaseModel):
    """Team statistics for project overview"""
    total_members: int = Field(ge=0)
    active_members: int = Field(ge=0)
    roles: dict[str, int] = Field(default_factory=dict, description="Count of members by role")


class ProjectStats(CamelCaseModel):
    """Additional project statistics"""
    total_inspections: int = Field(ge=0)
    pending_inspections: int = Field(ge=0)
    total_equipment: int = Field(ge=0)
    total_materials: int = Field(ge=0)
    total_meetings: int = Field(ge=0)
    open_findings: int = Field(ge=0)
    days_remaining: Optional[int] = None
    days_elapsed: Optional[int] = None


class ProjectOverviewResponse(CamelCaseModel):
    """Complete project overview response with progress, timeline, and statistics"""
    project_id: UUID
    project_name: str
    project_code: str
    project_status: str
    progress: ProgressMetrics
    timeline: list[TimelineEvent] = Field(default_factory=list, description="Recent timeline events, sorted by date descending")
    team_stats: TeamStats
    stats: ProjectStats
    last_updated: datetime = Field(description="Timestamp when overview data was generated")
