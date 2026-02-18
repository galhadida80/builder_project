from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.validators import CamelCaseModel, MAX_DESCRIPTION_LENGTH, sanitize_string

ENTITY_TYPES = Literal[
    "equipment", "material", "rfi", "inspection",
    "defect", "meeting", "area", "task",
]


class DiscussionCreate(BaseModel):
    entity_type: ENTITY_TYPES
    entity_id: UUID
    content: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    parent_id: Optional[UUID] = None

    @field_validator("content", mode="before")
    @classmethod
    def sanitize_content(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class DiscussionUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)

    @field_validator("content", mode="before")
    @classmethod
    def sanitize_content(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class AuthorBrief(CamelCaseModel):
    id: UUID
    full_name: str
    email: str


class DiscussionResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    author_id: UUID
    parent_id: Optional[UUID] = None
    content: str
    created_at: datetime
    updated_at: datetime
    author: Optional[AuthorBrief] = None
    replies: list[DiscussionResponse] = []


DiscussionResponse.model_rebuild()
