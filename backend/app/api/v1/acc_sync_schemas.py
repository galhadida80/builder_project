"""Response schemas for ACC sync API endpoints."""
import uuid
from typing import Optional

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


class AccSyncResponse(CamelCaseModel):
    """Response for manual ACC sync trigger"""
    message: str
    project_id: uuid.UUID
    status: str = Field(default="processing")


class AccSyncStatusResponse(CamelCaseModel):
    """Response for ACC sync health status"""
    project_id: uuid.UUID
    last_sync_at: Optional[str] = None
    sync_health: str = Field(description="ok, warning, error")
    total_rfis: int = 0
    synced_rfis: int = 0
    conflict_count: int = 0
    has_acc_connection: bool = False
    details: Optional[str] = None


class AccConflictDetail(CamelCaseModel):
    """Individual conflict details"""
    rfi_id: uuid.UUID
    rfi_number: str
    subject: str
    local_updated_at: str
    acc_updated_at: str
    last_synced_at: str
    conflicting_fields: list[str]


class AccConflictsResponse(CamelCaseModel):
    """Response for listing conflicts"""
    project_id: uuid.UUID
    total_conflicts: int
    conflicts: list[AccConflictDetail]


class ConflictResolveRequest(BaseModel):
    """Request to resolve a conflict"""
    strategy: str = Field(
        default="last_write_wins",
        description="Resolution strategy: last_write_wins, prefer_local, prefer_acc"
    )


class ConflictResolveResponse(CamelCaseModel):
    """Response for conflict resolution"""
    rfi_id: uuid.UUID
    chosen_version: str
    reason: str
    conflicting_fields: list[str]
    strategy: str
    resolved_at: str
