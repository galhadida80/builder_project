import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, verify_project_access
from app.db.session import get_db
from app.models.chat import ChatConversation, ChatMessage
from app.models.chat_action import ChatAction
from app.models.user import User
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSendResponse,
    ConversationDetailResponse,
    ConversationListResponse,
)
from app.schemas.chat_action import ChatActionResponse
from app.services.chat_action_executor import execute_action
from app.services.chat_service import send_message

logger = logging.getLogger(__name__)

router = APIRouter()


class RejectRequest(BaseModel):
    reason: Optional[str] = None


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

        pending_actions = result.get("pending_actions", [])
        action_responses = [
            ChatActionResponse.model_validate(a, from_attributes=True)
            for a in pending_actions
        ]

        user_msg = result["user_message"]
        assistant_msg = result["assistant_message"]

        return ChatSendResponse(
            user_message=ChatMessageResponse(
                id=user_msg.id,
                conversation_id=user_msg.conversation_id,
                role=user_msg.role,
                content=user_msg.content,
                tool_calls=user_msg.tool_calls,
                created_at=user_msg.created_at,
                pending_actions=[],
            ),
            assistant_message=ChatMessageResponse(
                id=assistant_msg.id,
                conversation_id=assistant_msg.conversation_id,
                role=assistant_msg.role,
                content=assistant_msg.content,
                tool_calls=assistant_msg.tool_calls,
                created_at=assistant_msg.created_at,
                pending_actions=action_responses,
            ),
            conversation_id=result["conversation_id"],
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process chat message")


@router.post("/projects/{project_id}/chat/actions/{action_id}/execute", response_model=ChatActionResponse)
async def execute_chat_action(
    project_id: UUID,
    action_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ChatAction)
        .join(ChatConversation, ChatAction.conversation_id == ChatConversation.id)
        .where(ChatAction.id == action_id, ChatConversation.project_id == project_id)
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if action.status != "proposed":
        raise HTTPException(status_code=400, detail=f"Action is already {action.status}")

    try:
        exec_result = await execute_action(db, action, current_user.id, project_id)
        if "error" in exec_result:
            action.status = "failed"
            action.result = exec_result
            raise HTTPException(status_code=400, detail=exec_result["error"])
        action.status = "executed"
        action.result = exec_result
        action.executed_at = datetime.utcnow()
        action.executed_by_id = current_user.id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Action execution error: {e}", exc_info=True)
        action.status = "failed"
        action.result = {"error": str(e)}
        raise HTTPException(status_code=500, detail="Action execution failed")

    return ChatActionResponse.model_validate(action, from_attributes=True)


@router.post("/projects/{project_id}/chat/actions/{action_id}/reject", response_model=ChatActionResponse)
async def reject_chat_action(
    project_id: UUID,
    action_id: UUID,
    body: RejectRequest = RejectRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    result = await db.execute(
        select(ChatAction)
        .join(ChatConversation, ChatAction.conversation_id == ChatConversation.id)
        .where(ChatAction.id == action_id, ChatConversation.project_id == project_id)
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if action.status != "proposed":
        raise HTTPException(status_code=400, detail=f"Action is already {action.status}")

    action.status = "rejected"
    action.result = {"reason": body.reason} if body.reason else None
    action.executed_at = datetime.utcnow()
    action.executed_by_id = current_user.id

    return ChatActionResponse.model_validate(action, from_attributes=True)


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

    actions_result = await db.execute(
        select(ChatAction).where(ChatAction.conversation_id == conversation_id)
    )
    all_actions = actions_result.scalars().all()
    actions_by_msg = {}
    for a in all_actions:
        actions_by_msg.setdefault(a.message_id, []).append(a)

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
                pending_actions=[
                    ChatActionResponse.model_validate(a, from_attributes=True)
                    for a in actions_by_msg.get(m.id, [])
                ],
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
