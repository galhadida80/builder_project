from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import (
    MAX_CODE_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    CamelCaseModel,
    sanitize_string,
)
from app.schemas.user import UserResponse


class OrgCreate(BaseModel):
    name: str = Field(min_length=2, max_length=MAX_NAME_LENGTH)
    code: str = Field(min_length=2, max_length=MAX_CODE_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    logo_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class OrgUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=MAX_NAME_LENGTH)
    code: Optional[str] = Field(default=None, min_length=2, max_length=MAX_CODE_LENGTH)
    description: Optional[str] = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    logo_url: Optional[str] = Field(default=None, max_length=500)

    @field_validator("name", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class OrgResponse(CamelCaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    member_count: int = 0


class OrgMemberCreate(BaseModel):
    user_id: UUID
    role: Literal["org_admin", "org_member"] = "org_member"


class OrgMemberResponse(CamelCaseModel):
    id: UUID
    organization_id: UUID
    user_id: UUID
    role: str
    added_at: datetime
    user: Optional[UserResponse] = None


class OrgMemberUpdate(BaseModel):
    role: Literal["org_admin", "org_member"]
