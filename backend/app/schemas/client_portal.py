from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    CamelCaseModel,
    sanitize_string,
)


class ClientPortalAccessResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID
    is_active: bool
    can_view_budget: bool
    can_view_documents: bool
    can_submit_feedback: bool
    last_accessed_at: Optional[datetime] = None
    created_at: datetime


class ClientPortalAuthRequest(BaseModel):
    email: EmailStr
    access_token: str = Field(min_length=1, max_length=255)


class ClientPortalAuthResponse(CamelCaseModel):
    access_token: str
    token_type: str = "bearer"
    user_email: str
    user_full_name: Optional[str] = None
    project_id: UUID
    project_name: str
    can_view_budget: bool
    can_view_documents: bool
    can_submit_feedback: bool


class ClientPortalProjectResponse(CamelCaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    status: str
    website: Optional[str] = None
    image_url: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_address: Optional[str] = None
    days_remaining: Optional[int] = None
    budget_visible_to_clients: bool = False
    milestone_tracking_enabled: bool = True


class ClientPortalProgressResponse(CamelCaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    completion_percentage: float = 0.0
    total_milestones: int = 0
    completed_milestones: int = 0
    upcoming_milestones: int = 0
    on_track: bool = True
    last_updated: datetime


class ClientPortalBudgetSummaryResponse(CamelCaseModel):
    total_budgeted: Decimal
    total_actual: Decimal
    total_variance: Decimal
    variance_percentage: float
    approved_change_orders: int
    total_change_order_amount: Decimal


class ClientPortalPhotoResponse(CamelCaseModel):
    id: UUID
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: str
    uploaded_at: datetime
    entity_type: str
    entity_id: UUID
    area_name: Optional[str] = None
    floor_number: Optional[int] = None


class ClientPortalDocumentResponse(CamelCaseModel):
    id: UUID
    filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    storage_path: str
    uploaded_at: datetime
    entity_type: str
    category: Optional[str] = None


class ClientPortalFeedbackCreate(BaseModel):
    subject: str = Field(min_length=2, max_length=200)
    content: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    entity_type: Optional[str] = Field(default="project", max_length=50)
    entity_id: Optional[UUID] = None

    @field_validator('subject', 'content', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)


class ClientPortalFeedbackResponse(CamelCaseModel):
    id: UUID
    subject: str
    content: str
    entity_type: str
    entity_id: UUID
    submitted_by: str
    submitted_at: datetime
    status: str = "pending"


class ClientPortalMilestoneResponse(CamelCaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    status: str
    completion_percentage: float = 0.0
    is_overdue: bool = False


class ClientPortalOverviewResponse(CamelCaseModel):
    project: ClientPortalProjectResponse
    progress: ClientPortalProgressResponse
    budget_summary: Optional[ClientPortalBudgetSummaryResponse] = None
    recent_photos: list[ClientPortalPhotoResponse] = []
    upcoming_milestones: list[ClientPortalMilestoneResponse] = []
