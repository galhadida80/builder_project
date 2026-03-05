from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import Field

from app.core.validators import CamelCaseModel


class PortalProjectSummary(CamelCaseModel):
    """Summary of a project the subcontractor is assigned to"""
    id: UUID
    name: str
    status: str
    address: Optional[str] = None
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    days_remaining: Optional[int] = None
    assigned_tasks_count: int = Field(ge=0, description="Number of tasks assigned to this subcontractor")
    pending_rfis_count: int = Field(ge=0, description="Number of RFIs requiring response")
    pending_approvals_count: int = Field(ge=0, description="Number of approvals pending review")


class PortalTaskItem(CamelCaseModel):
    """Task assigned to the subcontractor"""
    id: UUID
    project_id: UUID
    project_name: str
    task_number: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    is_overdue: bool = False
    created_at: datetime


class PortalRFIItem(CamelCaseModel):
    """RFI assigned to or created by the subcontractor"""
    id: UUID
    project_id: UUID
    project_name: str
    rfi_number: str
    subject: str
    question: str
    category: str
    priority: str
    status: str
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    response_count: int = Field(ge=0)
    created_at: datetime
    sent_at: Optional[datetime] = None


class PortalApprovalItem(CamelCaseModel):
    """Approval request requiring the subcontractor's review"""
    id: UUID
    project_id: UUID
    project_name: str
    entity_type: str
    entity_id: UUID
    entity_description: Optional[str] = Field(default=None, description="Description of the entity being approved")
    current_status: str
    step_order: int = Field(description="Which approval step this is for the subcontractor")
    created_at: datetime
    days_pending: int = Field(ge=0)


class PortalDocumentItem(CamelCaseModel):
    """Document shared with or uploaded by the subcontractor"""
    id: UUID
    project_id: UUID
    project_name: str
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: str
    entity_type: str
    entity_id: UUID
    uploaded_at: datetime
    uploaded_by_name: Optional[str] = None


class PortalActivityItem(CamelCaseModel):
    """Activity feed item for the subcontractor"""
    id: UUID
    project_id: UUID
    project_name: str
    activity_type: str = Field(description="Type: task, rfi, approval, document, mention")
    entity_type: str
    entity_id: UUID
    title: str
    description: Optional[str] = None
    action_required: bool = Field(default=False, description="Whether this item requires subcontractor action")
    priority: Optional[str] = None
    created_at: datetime
    created_by_name: Optional[str] = None


class PortalStats(CamelCaseModel):
    """Statistics for the subcontractor portal dashboard"""
    total_projects: int = Field(ge=0)
    active_projects: int = Field(ge=0)
    total_tasks: int = Field(ge=0)
    overdue_tasks: int = Field(ge=0)
    tasks_by_status: dict[str, int] = Field(default_factory=dict)
    total_rfis: int = Field(ge=0)
    pending_rfis: int = Field(ge=0)
    overdue_rfis: int = Field(ge=0)
    total_approvals: int = Field(ge=0)
    pending_approvals: int = Field(ge=0)
    recent_documents: int = Field(ge=0)


class PortalDashboardResponse(CamelCaseModel):
    """Complete subcontractor portal dashboard with tasks, RFIs, approvals, and activity"""
    subcontractor_id: UUID
    company_name: str
    trade: str
    stats: PortalStats
    projects: list[PortalProjectSummary] = Field(default_factory=list, description="Projects assigned to this subcontractor")
    pending_tasks: list[PortalTaskItem] = Field(default_factory=list, description="Tasks requiring attention, sorted by priority and due date")
    pending_rfis: list[PortalRFIItem] = Field(default_factory=list, description="RFIs requiring response, sorted by due date")
    pending_approvals: list[PortalApprovalItem] = Field(default_factory=list, description="Approvals requiring review, sorted by days pending")
    recent_activity: list[PortalActivityItem] = Field(default_factory=list, description="Recent activity across all projects, sorted by date descending")
    recent_documents: list[PortalDocumentItem] = Field(default_factory=list, description="Recently shared documents")
    last_updated: datetime = Field(description="Timestamp when dashboard data was generated")
