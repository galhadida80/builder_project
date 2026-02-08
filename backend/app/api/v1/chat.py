import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user, verify_project_access
from app.models.user import User
from app.models.chat import ChatConversation, ChatMessage
from app.schemas.chat import (
    ChatMessageRequest,
    ChatSendResponse,
    ConversationListResponse,
    ConversationDetailResponse,
    ChatMessageResponse,
)
from app.services.chat_service import send_message

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/projects/{project_id}/chat", response_model=ChatSendResponse)
async def chat_send(
    project_id: UUID,
    data: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    try:
        result = await send_message(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            message=data.message,
            conversation_id=data.conversation_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat message")


@router.get("/projects/{project_id}/chat/conversations", response_model=list[ConversationListResponse])
async def list_conversations(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(
            ChatConversation.id,
            ChatConversation.title,
            ChatConversation.created_at,
            ChatConversation.updated_at,
            func.count(ChatMessage.id).label("message_count"),
        )
        .outerjoin(ChatMessage, ChatMessage.conversation_id == ChatConversation.id)
        .where(ChatConversation.project_id == project_id)
        .where(ChatConversation.user_id == current_user.id)
        .group_by(ChatConversation.id)
        .order_by(ChatConversation.updated_at.desc())
        .limit(50)
    )
    rows = result.all()
    return [
        ConversationListResponse(
            id=row.id,
            title=row.title,
            created_at=row.created_at,
            updated_at=row.updated_at,
            message_count=row.message_count,
        )
        for row in rows
    ]


@router.get("/projects/{project_id}/chat/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    project_id: UUID,
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.project_id == project_id,
            ChatConversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = messages_result.scalars().all()

    return ConversationDetailResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            ChatMessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                tool_calls=m.tool_calls,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.delete("/projects/{project_id}/chat/conversations/{conversation_id}")
async def delete_conversation(
    project_id: UUID,
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.project_id == project_id,
            ChatConversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    return {"detail": "Conversation deleted"}
