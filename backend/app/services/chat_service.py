import uuid
from dataclasses import dataclass
from datetime import datetime
from pydantic_core import to_jsonable_python
from pydantic_ai import Agent, RunContext, ModelMessagesTypeAdapter
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.models.chat import ChatConversation, ChatMessage
from app.services.chat_tools import TOOL_REGISTRY


SYSTEM_PROMPT = """You are an AI assistant for a construction project management platform called BuilderOps.
You help users query and understand their project data including equipment, materials, RFIs, inspections, meetings, approvals, and construction areas.

Rules:
- ALWAYS use the available tools to get real data. NEVER guess or make up numbers.
- If the user asks about data you don't have a tool for, say so honestly.
- Respond in the SAME LANGUAGE as the user's message. If they write in Hebrew, respond in Hebrew. If English, respond in English.
- Be concise and professional. Use bullet points and numbers for lists.
- When presenting counts or summaries, include the status breakdown.
- You are READ-ONLY. You cannot create, update, or delete any data.
- Format dates in a human-readable way.
- If a query returns no results, say so clearly and suggest what data might be available."""


@dataclass
class ChatDeps:
    db: AsyncSession
    project_id: uuid.UUID


settings = get_settings()

provider = GoogleProvider(api_key=settings.gemini_api_key)
model = GoogleModel(settings.gemini_model, provider=provider)

agent = Agent(
    model,
    system_prompt=SYSTEM_PROMPT,
    deps_type=ChatDeps,
)


@agent.tool
async def get_project_summary(ctx: RunContext[ChatDeps]) -> dict:
    """Get project overview including name, status, dates, team size, and total counts of equipment, materials, RFIs, and inspections."""
    return await TOOL_REGISTRY["get_project_summary"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def count_equipment_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get total equipment count and breakdown by approval status (draft, submitted, under_review, approved, rejected)."""
    return await TOOL_REGISTRY["count_equipment_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_equipment(ctx: RunContext[ChatDeps], status: str = "", equipment_type: str = "", limit: int = 20) -> dict:
    """List equipment items with optional filters. Status values: draft, submitted, under_review, approved, rejected."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    if equipment_type:
        kwargs["equipment_type"] = equipment_type
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_equipment"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def count_materials_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get total materials count and breakdown by approval status."""
    return await TOOL_REGISTRY["count_materials_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_materials(ctx: RunContext[ChatDeps], status: str = "", material_type: str = "", limit: int = 20) -> dict:
    """List materials with optional filters. Status values: draft, submitted, under_review, approved, rejected."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    if material_type:
        kwargs["material_type"] = material_type
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_materials"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def count_rfis_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get RFI counts by status (draft, open, waiting_response, answered, closed, cancelled) and by priority (low, medium, high, urgent)."""
    return await TOOL_REGISTRY["count_rfis_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_rfis(ctx: RunContext[ChatDeps], status: str = "", priority: str = "", category: str = "", limit: int = 20) -> dict:
    """List RFIs with filters. Categories: design, structural, mep, architectural, specifications, schedule, cost, other."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    if priority:
        kwargs["priority"] = priority
    if category:
        kwargs["category"] = category
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_rfis"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def count_inspections_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get inspection counts by status (pending, in_progress, completed, failed) and findings by severity."""
    return await TOOL_REGISTRY["count_inspections_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_inspections(ctx: RunContext[ChatDeps], status: str = "", limit: int = 20) -> dict:
    """List inspections with optional status filter."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_inspections"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def get_meetings(ctx: RunContext[ChatDeps], upcoming: str = "true", limit: int = 10) -> dict:
    """Get meetings list. Set upcoming=true for future meetings, false for all meetings sorted by date descending."""
    return await TOOL_REGISTRY["get_meetings"](ctx.deps.db, ctx.deps.project_id, upcoming=upcoming, limit=str(limit))


@agent.tool
async def get_approval_queue(ctx: RunContext[ChatDeps]) -> dict:
    """Get pending approval submissions for equipment and materials."""
    return await TOOL_REGISTRY["get_approval_queue"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def get_area_progress(ctx: RunContext[ChatDeps], floor_number: int = -1, limit: int = 20) -> dict:
    """Get construction area progress. Optionally filter by floor number."""
    kwargs = {"limit": str(limit)}
    if floor_number >= 0:
        kwargs["floor_number"] = str(floor_number)
    return await TOOL_REGISTRY["get_area_progress"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def search_documents(ctx: RunContext[ChatDeps], query: str, limit: int = 10) -> dict:
    """Search through analyzed documents (PDFs, Word, images) for specific content. Uses text search on extracted text, summaries, and key findings."""
    return await TOOL_REGISTRY["search_documents"](ctx.deps.db, ctx.deps.project_id, query=query, limit=str(limit))


async def load_conversation_history(db: AsyncSession, conversation_id: uuid.UUID, max_messages: int = 20) -> list:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(max_messages)
    )
    messages = list(reversed(result.scalars().all()))

    if not messages:
        return []

    history_json = []
    skip_next_user = set()
    for i, msg in enumerate(messages):
        if msg.role == "assistant" and msg.tool_results:
            if i > 0 and messages[i - 1].role == "user":
                skip_next_user.add(i - 1)

    for i, msg in enumerate(messages):
        if i in skip_next_user:
            continue
        if msg.tool_results:
            history_json.extend(msg.tool_results)
        else:
            history_json.append(_make_message_dict(msg.role, msg.content))

    return ModelMessagesTypeAdapter.validate_python(history_json)


def _make_message_dict(role: str, content: str) -> dict:
    ts = datetime.utcnow().isoformat() + "Z"
    if role == "user":
        return {"kind": "request", "parts": [{"part_kind": "user-prompt", "content": content, "timestamp": ts}]}
    return {"kind": "response", "parts": [{"part_kind": "text", "content": content or ""}]}


async def send_message(db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID, message: str, conversation_id: uuid.UUID | None = None) -> dict:
    settings = get_settings()

    if conversation_id:
        conv_result = await db.execute(
            select(ChatConversation).where(
                ChatConversation.id == conversation_id,
                ChatConversation.project_id == project_id,
                ChatConversation.user_id == user_id,
            )
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise ValueError("Conversation not found")
    else:
        conversation = ChatConversation(
            project_id=project_id,
            user_id=user_id,
            title=message[:100],
        )
        db.add(conversation)
        await db.flush()

    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=message,
    )
    db.add(user_msg)
    await db.flush()

    message_history = []
    if conversation_id:
        message_history = await load_conversation_history(db, conversation.id, settings.chat_max_history)

    deps = ChatDeps(db=db, project_id=project_id)
    result = await agent.run(message, deps=deps, message_history=message_history)

    all_messages = result.new_messages()
    serialized = to_jsonable_python(all_messages)

    tool_names = []
    for m in all_messages:
        for part in getattr(m, "parts", []):
            if hasattr(part, "tool_name"):
                tool_names.append(part.tool_name)

    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=result.output,
        tool_calls=tool_names if tool_names else None,
        tool_results=serialized,
    )
    db.add(assistant_msg)
    await db.flush()

    conversation.updated_at = datetime.utcnow()

    return {
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "conversation_id": conversation.id,
    }
