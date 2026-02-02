from pydantic import BaseModel


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


class TrendDataPoint(BaseModel):
    date: str
    inspections: int
    equipment_submissions: int
    material_submissions: int


class ProjectTrendsResponse(BaseModel):
    data_points: list[TrendDataPoint]


class DistributionItem(BaseModel):
    label: str
    value: int


class DistributionsResponse(BaseModel):
    inspection_status: list[DistributionItem]
    equipment_status: list[DistributionItem]
    material_status: list[DistributionItem]
    project_status: list[DistributionItem]
