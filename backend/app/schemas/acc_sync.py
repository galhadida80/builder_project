from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.validators import CamelCaseModel


class AccProjectLinkCreate(BaseModel):
    acc_project_id: str = Field(max_length=255)
    acc_hub_id: str = Field(max_length=255)


class AccProjectLinkResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    acc_project_id: str
    acc_hub_id: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class AccProjectLinkStatus(CamelCaseModel):
    linked: bool
    link: AccProjectLinkResponse | None = None


class RfiSyncStatusResponse(CamelCaseModel):
    rfi_id: UUID
    acc_rfi_id: str | None = None
    sync_status: str
    last_synced_at: datetime | None = None
    sync_error: str | None = None


class SyncLogResponse(CamelCaseModel):
    id: UUID
    rfi_id: UUID
    direction: str
    status: str
    details: dict | None = None
    created_at: datetime


class AccUserMappingCreate(BaseModel):
    acc_user_id: str = Field(max_length=255)
    builderops_user_id: UUID


class AccUserMappingResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    acc_user_id: str
    builderops_user_id: UUID
    created_at: datetime


class SyncHealthResponse(CamelCaseModel):
    linked: bool
    enabled: bool
    total_rfis: int
    synced_count: int
    failed_count: int
    pending_count: int
    last_sync: datetime | None = None


class PushAllResponse(CamelCaseModel):
    pushed: int
    failed: int
    errors: list[str]


class PullResponse(CamelCaseModel):
    created: int
    updated: int
    errors: list[str]
