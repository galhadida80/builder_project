from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.user import UserResponse
from app.core.validators import (
    sanitize_string,
    MAX_NOTES_LENGTH,
    CamelCaseModel
)


# Document Comment Schemas
class DocumentCommentBase(BaseModel):
    comment_text: str = Field(min_length=1, max_length=MAX_NOTES_LENGTH)
    parent_comment_id: UUID | None = None

    @field_validator('comment_text', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class DocumentCommentCreate(DocumentCommentBase):
    pass


class DocumentCommentUpdate(BaseModel):
    comment_text: str | None = Field(default=None, min_length=1, max_length=MAX_NOTES_LENGTH)
    is_resolved: bool | None = None

    @field_validator('comment_text', mode='before')
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class DocumentCommentResponse(CamelCaseModel):
    id: UUID
    review_id: UUID
    parent_comment_id: UUID | None = None
    comment_text: str
    created_at: datetime
    updated_at: datetime
    created_by_id: UUID
    created_by: UserResponse | None = None
    is_resolved: bool = False
    replies: list["DocumentCommentResponse"] = []


# Document Review Schemas
class DocumentReviewBase(BaseModel):
    status: str | None = Field(default=None, max_length=50)


class DocumentReviewCreate(DocumentReviewBase):
    document_id: UUID


class DocumentReviewUpdate(BaseModel):
    status: str | None = Field(default=None, max_length=50)
    reviewed_by_id: UUID | None = None


class DocumentReviewResponse(CamelCaseModel):
    id: UUID
    project_id: UUID
    document_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    created_by_id: UUID | None = None
    created_by: UserResponse | None = None
    reviewed_by_id: UUID | None = None
    reviewed_by: UserResponse | None = None
    reviewed_at: datetime | None = None
    comments: list[DocumentCommentResponse] = []
