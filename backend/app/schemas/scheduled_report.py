from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, CamelCaseModel, sanitize_string
from app.schemas.user import UserResponse


class ReportType(str, Enum):
    """Valid report types for templates and scheduled reports."""
    # AI-generated reports
    WEEKLY_AI = "weekly-ai"
    INSPECTION_SUMMARY_AI = "inspection-summary-ai"
    EXECUTIVE_SUMMARY_AI = "executive-summary-ai"

    # Traditional reports
    INSPECTION_SUMMARY = "inspection-summary"
    APPROVAL_STATUS = "approval-status"
    RFI_AGING = "rfi-aging"
    COMPLIANCE_AUDIT = "compliance-audit"


class ReportTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    report_type: str = Field(max_length=50)
    config: dict = Field(default_factory=dict)

    @field_validator('name', 'description', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('report_type')
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        valid_types = [rt.value for rt in ReportType]
        if v not in valid_types:
            raise ValueError(f"Invalid report_type. Must be one of: {', '.join(valid_types)}")
        return v


class ReportTemplateResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: Optional[str] = None
    report_type: str
    config: dict = {}
    created_by_id: Optional[UUID] = None
    created_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime


class ScheduledReportCreate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    report_type: str = Field(max_length=50)
    schedule_cron: str = Field(max_length=100)
    template_id: Optional[UUID] = None
    recipients: list[str] = Field(default_factory=list)
    config: dict = Field(default_factory=dict)

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_text(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_string(v)

    @field_validator('report_type')
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        valid_types = [rt.value for rt in ReportType]
        if v not in valid_types:
            raise ValueError(f"Invalid report_type. Must be one of: {', '.join(valid_types)}")
        return v


class ScheduledReportUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=MAX_NAME_LENGTH)
    schedule_cron: Optional[str] = Field(default=None, max_length=100)
    recipients: Optional[list[str]] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None


class ScheduledReportResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    template_id: Optional[UUID] = None
    name: str
    report_type: str
    schedule_cron: str
    recipients: list = []
    config: dict = {}
    is_active: bool = True
    last_run_at: Optional[datetime] = None
    run_count: int = 0
    created_by_id: Optional[UUID] = None
    created_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime
