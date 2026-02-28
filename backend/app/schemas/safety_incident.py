from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


INCIDENT_SEVERITIES = Literal["low", "medium", "high", "critical"]
INCIDENT_STATUSES = Literal["open", "investigating", "resolved", "closed"]


class ContactBrief(CamelCaseModel):
    id: UUID
    contact_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class AreaBrief(CamelCaseModel):
    id: UUID
    name: str
    area_code: Optional[str] = None
    floor_number: Optional[int] = None


class SafetyIncidentCreate(BaseModel):
    title: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    description: str = Field(min_length=2, max_length=MAX_DESCRIPTION_LENGTH)
    severity: INCIDENT_SEVERITIES
    occurred_at: datetime
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    area_id: Optional[UUID] = None
    photos: list = Field(default_factory=list)
    witnesses: list = Field(default_factory=list)
    root_cause: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    corrective_actions: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    reported_by_id: Optional[UUID] = None

    @field_validator("occurred_at", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("title", "description", "location", "root_cause", "corrective_actions", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SafetyIncidentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    severity: Optional[INCIDENT_SEVERITIES] = None
    status: Optional[INCIDENT_STATUSES] = None
    occurred_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=MAX_NAME_LENGTH)
    area_id: Optional[UUID] = None
    photos: Optional[list] = None
    witnesses: Optional[list] = None
    root_cause: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    corrective_actions: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    reported_by_id: Optional[UUID] = None

    @field_validator("occurred_at", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("title", "description", "location", "root_cause", "corrective_actions", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class SafetyIncidentResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    incident_number: int
    title: str
    description: str
    severity: str
    status: str
    occurred_at: datetime
    location: Optional[str] = None
    area_id: Optional[UUID] = None
    photos: Optional[list] = None
    witnesses: Optional[list] = None
    root_cause: Optional[str] = None
    corrective_actions: Optional[str] = None
    reported_by_id: Optional[UUID] = None
    created_by_id: UUID
    created_at: datetime
    updated_at: datetime
    area: Optional[AreaBrief] = None
    reported_by: Optional[ContactBrief] = None
    created_by: Optional[UserResponse] = None


class SafetyKPIResponse(CamelCaseModel):
    """Overall safety KPI summary for a project"""
    # Incidents
    total_incidents: int
    incidents_by_severity: dict[str, int]
    incidents_by_status: dict[str, int]

    # Near Misses
    total_near_misses: int
    near_misses_by_severity: dict[str, int]
    anonymous_near_misses: int

    # Training
    total_trainings: int
    valid_trainings: int
    expired_trainings: int
    expiring_soon_trainings: int
    unique_trained_workers: int

    # Toolbox Talks
    total_toolbox_talks: int
    completed_toolbox_talks: int
    total_talk_attendees: int
    total_attended: int
