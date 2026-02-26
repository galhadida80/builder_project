from pydantic import BaseModel

from app.core.validators import CamelCaseModel


class MetricsResponse(BaseModel):
    total_projects: int
    active_projects: int
    total_inspections: int
    pending_inspections: int
    completed_inspections: int
    total_equipment: int
    approved_equipment: int
    total_materials: int
    approved_materials: int
    total_meetings: int
    approval_rate: float
    total_rfis: int
    open_rfis: int
    closed_rfis: int
    total_approvals: int
    pending_approvals: int
    approved_approvals: int


class TrendDataPoint(BaseModel):
    date: str
    inspections: int
    equipment_submissions: int
    material_submissions: int
    rfi_created: int = 0
    rfi_closed: int = 0
    approvals_submitted: int = 0
    approvals_decided: int = 0


class ProjectTrendsResponse(BaseModel):
    data_points: list[TrendDataPoint]


class DistributionItem(CamelCaseModel):
    label: str
    value: int


class DistributionsResponse(BaseModel):
    inspection_status: list[DistributionItem]
    equipment_status: list[DistributionItem]
    material_status: list[DistributionItem]
    project_status: list[DistributionItem]
    rfi_status: list[DistributionItem]
    approval_status: list[DistributionItem]


class WeeklyActivityPoint(CamelCaseModel):
    date: str
    equipment: int
    materials: int
    inspections: int
    rfis: int


class FloorProgress(CamelCaseModel):
    floor: int
    area_count: int
    avg_progress: float


class DashboardStatsResponse(CamelCaseModel):
    equipment_distribution: list[DistributionItem]
    material_distribution: list[DistributionItem]
    rfi_distribution: list[DistributionItem]
    approval_distribution: list[DistributionItem]
    findings_severity: list[DistributionItem]
    weekly_activity: list[WeeklyActivityPoint]
    area_progress_by_floor: list[FloorProgress]
    overall_progress: float
