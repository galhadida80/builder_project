from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    MAX_NAME_LENGTH,
    MAX_NOTES_LENGTH,
    MIN_NAME_LENGTH,
    sanitize_string,
)
from app.schemas.user import UserResponse

MAX_SUBJECT_LENGTH = 500
MAX_EMAIL_LENGTH = 255


class RFIBase(BaseModel):
    subject: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_SUBJECT_LENGTH)
    question: str = Field(min_length=MIN_NAME_LENGTH, max_length=MAX_NOTES_LENGTH)
    to_email: EmailStr
    to_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    cc_emails: list[EmailStr] | None = Field(default=None, max_length=20)
    category: str = Field(default="other", max_length=50)
    priority: str = Field(default="medium", max_length=20)
    due_date: datetime | None = None
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    drawing_reference: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    specification_reference: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    attachments: list[dict] | None = Field(default=None, max_length=50)

    @field_validator("due_date", mode="before")
    @classmethod
    def strip_timezone(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("subject", "question", "to_name", "location", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, v: str) -> str:
        valid_categories = [
            "design", "structural", "mep", "architectural",
            "specifications", "schedule", "cost", "other"
        ]
        if v and v.lower() not in valid_categories:
            return "other"
        return v.lower() if v else "other"

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        valid_priorities = ["low", "medium", "high", "urgent"]
        if v and v.lower() not in valid_priorities:
            return "medium"
        return v.lower() if v else "medium"


class RFICreate(RFIBase):
    assigned_to_id: UUID | None = None
    related_equipment_id: UUID | None = None
    related_material_id: UUID | None = None


class RFIUpdate(BaseModel):
    subject: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_SUBJECT_LENGTH)
    question: str | None = Field(default=None, min_length=MIN_NAME_LENGTH, max_length=MAX_NOTES_LENGTH)
    to_email: EmailStr | None = None
    to_name: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    cc_emails: list[EmailStr] | None = Field(default=None, max_length=20)
    category: str | None = Field(default=None, max_length=50)
    priority: str | None = Field(default=None, max_length=20)
    due_date: datetime | None = None
    location: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    drawing_reference: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    specification_reference: str | None = Field(default=None, max_length=MAX_NAME_LENGTH)
    attachments: list[dict] | None = Field(default=None, max_length=50)
    assigned_to_id: UUID | None = None
    related_equipment_id: UUID | None = None
    related_material_id: UUID | None = None

    @field_validator("subject", "question", "to_name", "location", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is None:
            return v
        valid_categories = [
            "design", "structural", "mep", "architectural",
            "specifications", "schedule", "cost", "other"
        ]
        if v.lower() not in valid_categories:
            return "other"
        return v.lower()

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: str | None) -> str | None:
        if v is None:
            return v
        valid_priorities = ["low", "medium", "high", "urgent"]
        if v.lower() not in valid_priorities:
            return "medium"
        return v.lower()


class RFIStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = [
            "draft", "open", "waiting_response", "answered", "closed", "cancelled"
        ]
        if v and v.lower() not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v.lower()


class RFIResponseBase(BaseModel):
    response_text: str = Field(min_length=1, max_length=MAX_NOTES_LENGTH)
    attachments: list[dict] | None = Field(default=None, max_length=50)

    @field_validator("response_text", mode="before")
    @classmethod
    def sanitize_text(cls, v: str | None) -> str | None:
        return sanitize_string(v)


class RFIResponseCreate(RFIResponseBase):
    is_internal: bool = False


class RFIResponseSchema(BaseModel):
    id: UUID
    rfi_id: UUID
    email_message_id: str | None = None
    in_reply_to: str | None = None
    response_text: str
    attachments: list[dict] | None = None
    from_email: str
    from_name: str | None = None
    responder: UserResponse | None = None
    is_internal: bool = False
    is_cc_participant: bool = False
    source: str = "email"
    created_at: datetime
    received_at: datetime | None = None

    class Config:
        from_attributes = True


class RFIEmailLogSchema(BaseModel):
    id: UUID
    rfi_id: UUID | None = None
    event_type: str
    email_message_id: str | None = None
    from_email: str | None = None
    to_email: str | None = None
    subject: str | None = None
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RFIListResponse(BaseModel):
    id: UUID
    project_id: UUID
    rfi_number: str
    subject: str
    to_email: str
    to_name: str | None = None
    category: str
    priority: str
    status: str
    due_date: datetime | None = None
    created_at: datetime
    sent_at: datetime | None = None
    responded_at: datetime | None = None
    response_count: int = 0
    related_equipment_id: UUID | None = None
    related_material_id: UUID | None = None

    class Config:
        from_attributes = True


class RFIResponse(BaseModel):
    id: UUID
    project_id: UUID
    rfi_number: str
    email_thread_id: str | None = None
    email_message_id: str | None = None
    subject: str
    question: str
    category: str
    priority: str
    to_email: str
    to_name: str | None = None
    cc_emails: list[str] | None = None
    status: str
    due_date: datetime | None = None
    responded_at: datetime | None = None
    closed_at: datetime | None = None
    location: str | None = None
    drawing_reference: str | None = None
    specification_reference: str | None = None
    attachments: list[dict] | None = None
    created_at: datetime
    updated_at: datetime
    sent_at: datetime | None = None
    created_by: UserResponse | None = None
    assigned_to: UserResponse | None = None
    related_equipment_id: UUID | None = None
    related_material_id: UUID | None = None
    responses: list[RFIResponseSchema] = []

    class Config:
        from_attributes = True


class RFISummaryResponse(BaseModel):
    total_rfis: int
    draft_count: int
    open_count: int
    waiting_response_count: int
    answered_count: int
    closed_count: int
    overdue_count: int
    by_priority: dict[str, int]
    by_category: dict[str, int]


class RFISendRequest(BaseModel):
    send_now: bool = True


class PaginatedRFIResponse(BaseModel):
    items: list[RFIListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class RFIDeadlineResponse(BaseModel):
    id: UUID
    project_id: UUID
    rfi_number: str
    subject: str
    to_email: str
    to_name: str | None = None
    category: str
    priority: str
    status: str
    due_date: datetime
    days_overdue: int | None = None
    days_until_due: int | None = None
    created_at: datetime
    sent_at: datetime | None = None

    class Config:
        from_attributes = True
