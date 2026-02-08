from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.core.validators import CamelCaseModel


class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[UUID] = None


class ChatMessageResponse(CamelCaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: Optional[str] = None
    tool_calls: Optional[list] = None
    created_at: datetime


class ChatSendResponse(CamelCaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    conversation_id: UUID


class ConversationListResponse(CamelCaseModel):
    id: UUID
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int


class ConversationDetailResponse(CamelCaseModel):
    id: UUID
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageResponse]
