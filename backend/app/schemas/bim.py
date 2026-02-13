from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel

from app.core.validators import CamelCaseModel
from app.schemas.user import UserResponse


class BimModelResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    filename: str
    file_size: Optional[int] = None
    storage_path: Optional[str] = None
    urn: Optional[str] = None
    translation_status: str = "uploaded"
    translation_progress: int = 0
    metadata_json: Optional[Any] = None
    uploaded_by_id: Optional[UUID] = None
    uploaded_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime


class TranslationStatusResponse(CamelCaseModel):
    translation_status: str
    translation_progress: int


class AutodeskConnectionResponse(CamelCaseModel):
    id: UUID
    user_id: UUID
    acc_account_id: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class OAuthCallbackParams(BaseModel):
    code: str
    state: str


class ViewerTokenResponse(CamelCaseModel):
    access_token: str
    expires_in: int
