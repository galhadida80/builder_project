import logging
import uuid
from dataclasses import dataclass
from datetime import datetime

from pydantic_ai import Agent, ModelMessagesTypeAdapter, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_core import to_jsonable_python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.chat import ChatConversation, ChatMessage
from app.models.chat_action import ChatAction
from app.services.chat_tools import TOOL_REGISTRY, get_full_project_context

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are an expert AI construction project assistant for BuilderOps platform.
You have deep knowledge of construction management, project coordination, equipment tracking, inspections, and approval workflows.

## Language — Hebrew First
- Default response language is **Hebrew (עברית)**. Always respond in Hebrew unless the user writes in English or another language.
- If the user writes in Hebrew, respond ENTIRELY in Hebrew — all headers, analysis, tables, suggestions. Never mix languages.
- Use proper Hebrew construction terminology:
  - ציוד = Equipment, חומרים = Materials, בקשת מידע (RFI) = Request for Information
  - פיקוח = Inspection, אישור = Approval, טיוטה = Draft, הוגש = Submitted
  - יועץ = Consultant, מפקח = Inspector, קבלן = Contractor
  - אזור בנייה = Construction Area, קומה = Floor, התקדמות = Progress
  - פגישה = Meeting, לוח זמנים = Schedule, תקציב = Budget
- Format dates as DD/MM/YYYY for Hebrew, MM/DD/YYYY for English.

## Your Personality
- You are proactive, thorough, and detail-oriented
- You provide rich, well-structured responses using markdown (headers, bold, bullet points, tables)
- You anticipate what the user might need next and suggest follow-up actions
- You ask clarifying questions when the user's request is ambiguous
- You celebrate progress and flag potential issues early

## Response Guidelines
- Be **verbose and informative**. Give detailed analysis, not just raw data.
- Use markdown formatting: **bold** for emphasis, bullet points for lists, tables for comparisons.
- Include status breakdowns, progress percentages, and trend observations.
- When showing data, add your professional analysis and recommendations.
- If data is empty (0 items), suggest what the user should do next to get started.

## Chain of Thought for Proposals
When proposing actions, follow this structure:
1. **ניתוח (Analysis)**: Show what you found in the data
2. **מסקנה (Conclusion)**: Explain your recommendation
3. **פעולה מוצעת (Proposed Action)**: Describe the exact change in a clear table:

| שדה | ערך נוכחי | ערך חדש |
|------|-----------|---------|
| סטטוס | טיוטה | הוגש |

## Follow-up Suggestions
After EVERY response, add exactly 2-3 follow-up suggestions at the end.
Each suggestion MUST be wrapped in [square brackets]. Use this exact format:

---
- [suggestion text here]
- [another suggestion]
- [third suggestion]

The suggestions must be in the SAME LANGUAGE as your response.
Hebrew example:
---
- [הצג סיכום ציוד לפי סטטוס]
- [מה הפגישות הקרובות?]
- [עדכן התקדמות אזור קומה 3]

## Data Access
- ALWAYS use tools to get the latest data when the user asks for specific details.
- Use the project context snapshot (provided dynamically) for general overview questions.
- When listing entities, always include their IDs for future reference.

## Action First — NEVER Ask Before Listing
- When the user asks to see/list/show items (equipment, materials, RFIs, inspections, meetings, defects, contacts, areas):
  **ALWAYS call the tool IMMEDIATELY with NO filters** and show ALL items. Do NOT ask "which status?" or "which type?" first.
- Example: "הצג ציוד" → CALL list_equipment() with no status filter → show all items → THEN suggest filters in follow-up
- Example: "הצג RFIs" → CALL list_rfis() with no filters → show all → suggest "רוצה לסנן לפי עדיפות/סטטוס?"
- Example: "מה הציוד בפרויקט?" → CALL list_equipment() immediately
- The ONLY time you ask before listing is if the user explicitly says they want something specific (e.g., "הצג רק ציוד מאושר")
- For updates: "עדכן סטטוס" → Ask: "איזה פריט לעדכן, ולאיזה סטטוס?" (this is OK because you need a specific entity)

## Action Capabilities
- When a user asks to change, update, create, or approve something, use the propose_* tools.
- You CANNOT execute changes directly. You can only PROPOSE actions for user approval.
- Before proposing changes, query the current state to confirm details.
- Describe clearly what will change and why.
- Proactively suggest actions when you spot opportunities (e.g., "3 פריטים עדיין בטיוטה — האם להגיש אותם לבדיקה?").

## Entity Creation — MANDATORY: Call Tool Immediately
When a user asks to CREATE a new entity (equipment, material, contact, RFI, meeting, area, inspection, defect):
- **ABSOLUTE RULE: Call the propose_create_* tool in the SAME turn. No exceptions.**
- **NEVER ask "what is the name?" or any other question before calling the tool.**
- **NEVER reply with just text asking for details. You MUST call the tool.**
- Fill ALL fields using: (1) details the user provided, (2) smart defaults from project context, (3) placeholder values for optional fields.
- After calling the tool, show a template table so the user can review and modify fields.

Example: User says "צור ציוד חדש" → You MUST immediately call propose_create_equipment(name="ציוד חדש", equipment_type="כללי") and show:

| שדה | ערך |
|------|------|
| שם | ציוד חדש |
| סוג | כללי |
| יצרן | (ריק) |
| מספר דגם | (ריק) |
| הערות | (ריק) |

Then tell the user: "אשר את היצירה או בקש שינויים בשדות ספציפיים"

Example: User says "צור ציוד בשם מנוף 50 טון" → Call propose_create_equipment(name="מנוף 50 טון", equipment_type="הרמה") with smart type detection.

**Required fields per entity type:**
- **Equipment**: name, equipment_type, manufacturer, model_number, notes
- **Material**: name, material_type, manufacturer, quantity, unit, notes
- **Contact**: contact_name, contact_type, company_name, email, phone, role_description
- **RFI**: subject, question, category (default: "design"), priority (default: "medium"), to_email
- **Meeting**: title, description, scheduled_date, location
- **Area**: name, area_type, floor_number, area_code, total_units
- **Inspection**: consultant_type_id, scheduled_date, notes
- **Defect**: description, category, severity (default: "medium"), defect_type (default: "non_conformance")

The user can always modify fields after seeing the proposal: "שנה את היצרן ל-Liebherr"."""


@dataclass
class ChatDeps:
    db: AsyncSession
    project_id: uuid.UUID
    conversation_id: uuid.UUID
    message_id: uuid.UUID


settings = get_settings()

provider = GoogleProvider(api_key=settings.gemini_api_key)
model = GoogleModel(settings.gemini_model, provider=provider)

agent = Agent(
    model,
    system_prompt=SYSTEM_PROMPT,
    deps_type=ChatDeps,
)


@agent.system_prompt
async def inject_project_context(ctx: RunContext[ChatDeps]) -> str:
    context = await get_full_project_context(ctx.deps.db, ctx.deps.project_id)
    return f"\n## Current Project Data Snapshot\n{context}"


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
    """List equipment items with optional filters. Each item includes an id for reference. Status values: draft, submitted, under_review, approved, rejected."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    if equipment_type:
        kwargs["equipment_type"] = equipment_type
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_equipment"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def get_equipment_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full details for a single equipment item by its ID. Includes specs, serial number, warranty, notes."""
    return await TOOL_REGISTRY["get_equipment_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def count_materials_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get total materials count and breakdown by approval status."""
    return await TOOL_REGISTRY["count_materials_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_materials(ctx: RunContext[ChatDeps], status: str = "", material_type: str = "", limit: int = 20) -> dict:
    """List materials with optional filters. Each item includes an id for reference. Status values: draft, submitted, under_review, approved, rejected."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    if material_type:
        kwargs["material_type"] = material_type
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_materials"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def get_material_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full details for a single material by its ID. Includes quantity, delivery dates, storage location, specs."""
    return await TOOL_REGISTRY["get_material_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def count_rfis_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get RFI counts by status (draft, open, waiting_response, answered, closed, cancelled) and by priority (low, medium, high, urgent)."""
    return await TOOL_REGISTRY["count_rfis_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_rfis(ctx: RunContext[ChatDeps], status: str = "", priority: str = "", category: str = "", limit: int = 20) -> dict:
    """List RFIs with filters. Each item includes an id for reference. Categories: design, structural, mep, architectural, specifications, schedule, cost, other."""
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
async def get_rfi_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full RFI details by ID including question, responses, email history."""
    return await TOOL_REGISTRY["get_rfi_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def count_inspections_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get inspection counts by status (pending, in_progress, completed, failed) and findings by severity."""
    return await TOOL_REGISTRY["count_inspections_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_inspections(ctx: RunContext[ChatDeps], status: str = "", limit: int = 20) -> dict:
    """List inspections with optional status filter. Each item includes an id."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_inspections"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def get_inspection_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full inspection details by ID including findings, stages, consultant type."""
    return await TOOL_REGISTRY["get_inspection_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def get_meetings(ctx: RunContext[ChatDeps], upcoming: str = "true", limit: int = 10) -> dict:
    """Get meetings list. Each item includes an id. Set upcoming=true for future meetings, false for all."""
    return await TOOL_REGISTRY["get_meetings"](ctx.deps.db, ctx.deps.project_id, upcoming=upcoming, limit=str(limit))


@agent.tool
async def get_meeting_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full meeting details by ID including attendees, action items, summary."""
    return await TOOL_REGISTRY["get_meeting_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def get_approval_queue(ctx: RunContext[ChatDeps]) -> dict:
    """Get pending approval submissions for equipment and materials. Each submission includes an id."""
    return await TOOL_REGISTRY["get_approval_queue"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def get_area_progress(ctx: RunContext[ChatDeps], floor_number: int = -1, limit: int = 20) -> dict:
    """Get construction area progress. Each item includes an id. Optionally filter by floor number."""
    kwargs = {"limit": str(limit)}
    if floor_number >= 0:
        kwargs["floor_number"] = str(floor_number)
    return await TOOL_REGISTRY["get_area_progress"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def get_area_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full area details by ID including progress history."""
    return await TOOL_REGISTRY["get_area_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def list_contacts(ctx: RunContext[ChatDeps], limit: int = 30) -> dict:
    """List project contacts with id, name, type, company, email, phone."""
    return await TOOL_REGISTRY["list_contacts"](ctx.deps.db, ctx.deps.project_id, limit=str(limit))


@agent.tool
async def get_contact_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full contact details by ID including role description."""
    return await TOOL_REGISTRY["get_contact_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def count_defects_by_status(ctx: RunContext[ChatDeps]) -> dict:
    """Get defect counts by status (open, in_progress, resolved, closed, rejected) and by severity (low, medium, high, critical)."""
    return await TOOL_REGISTRY["count_defects_by_status"](ctx.deps.db, ctx.deps.project_id)


@agent.tool
async def list_defects(ctx: RunContext[ChatDeps], status: str = "", severity: str = "", category: str = "", limit: int = 20) -> dict:
    """List defects with optional filters. Each item includes an id. Statuses: open, in_progress, resolved, closed, rejected. Severities: low, medium, high, critical."""
    kwargs = {}
    if status:
        kwargs["status"] = status
    if severity:
        kwargs["severity"] = severity
    if category:
        kwargs["category"] = category
    kwargs["limit"] = limit
    return await TOOL_REGISTRY["list_defects"](ctx.deps.db, ctx.deps.project_id, **kwargs)


@agent.tool
async def get_defect_details(ctx: RunContext[ChatDeps], entity_id: str) -> dict:
    """Get full defect details by ID including description, severity, category, due date."""
    return await TOOL_REGISTRY["get_defect_details"](ctx.deps.db, ctx.deps.project_id, entity_id=entity_id)


@agent.tool
async def search_documents(ctx: RunContext[ChatDeps], query: str, limit: int = 10) -> dict:
    """Search through analyzed documents for specific content."""
    return await TOOL_REGISTRY["search_documents"](ctx.deps.db, ctx.deps.project_id, query=query, limit=str(limit))


@agent.tool
async def propose_update_equipment_status(ctx: RunContext[ChatDeps], entity_id: str, new_status: str, reason: str) -> dict:
    """Propose changing an equipment item's status. Status values: draft, submitted, under_review, approved, rejected. The user must approve this action."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_equipment_status",
        entity_type="equipment",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_status": new_status, "reason": reason},
        description=f"Change equipment status to '{new_status}': {reason}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_update_material_status(ctx: RunContext[ChatDeps], entity_id: str, new_status: str, reason: str) -> dict:
    """Propose changing a material's status. Status values: draft, submitted, under_review, approved, rejected. The user must approve this action."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_material_status",
        entity_type="material",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_status": new_status, "reason": reason},
        description=f"Change material status to '{new_status}': {reason}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_update_rfi_status(ctx: RunContext[ChatDeps], entity_id: str, new_status: str, reason: str) -> dict:
    """Propose changing an RFI's status. Status values: draft, open, waiting_response, answered, closed, cancelled. The user must approve."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_rfi_status",
        entity_type="rfi",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_status": new_status, "reason": reason},
        description=f"Change RFI status to '{new_status}': {reason}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_update_inspection_status(ctx: RunContext[ChatDeps], entity_id: str, new_status: str, reason: str) -> dict:
    """Propose changing an inspection's status. Status values: pending, in_progress, completed, failed. The user must approve."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_inspection_status",
        entity_type="inspection",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_status": new_status, "reason": reason},
        description=f"Change inspection status to '{new_status}': {reason}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_update_meeting_status(ctx: RunContext[ChatDeps], entity_id: str, new_status: str, reason: str) -> dict:
    """Propose changing a meeting's status. Status values: scheduled, invitations_sent, completed, cancelled. The user must approve."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_meeting_status",
        entity_type="meeting",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_status": new_status, "reason": reason},
        description=f"Change meeting status to '{new_status}': {reason}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_update_area_progress(ctx: RunContext[ChatDeps], entity_id: str, new_progress: float, notes: str) -> dict:
    """Propose updating a construction area's progress percentage (0-100). The user must approve."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_area_progress",
        entity_type="area",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_progress": new_progress, "notes": notes},
        description=f"Update area progress to {new_progress}%: {notes}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_rfi(ctx: RunContext[ChatDeps], subject: str, question: str, category: str, priority: str, to_email: str) -> dict:
    """Propose creating a new RFI. Categories: design, structural, mep, architectural, specifications, schedule, cost, other. Priorities: low, medium, high, urgent."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_rfi",
        entity_type="rfi",
        entity_id=None,
        parameters={"subject": subject, "question": question, "category": category, "priority": priority, "to_email": to_email},
        description=f"Create RFI: '{subject}' ({priority} priority, {category})",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_meeting(ctx: RunContext[ChatDeps], title: str, description: str, scheduled_date: str, location: str) -> dict:
    """Propose creating a new meeting. scheduled_date must be ISO format (e.g. 2026-03-01T10:00:00)."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_meeting",
        entity_type="meeting",
        entity_id=None,
        parameters={"title": title, "description": description, "scheduled_date": scheduled_date, "location": location},
        description=f"Create meeting: '{title}' on {scheduled_date}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_schedule_inspection(ctx: RunContext[ChatDeps], consultant_type_id: str, scheduled_date: str, notes: str) -> dict:
    """Propose scheduling a new inspection. scheduled_date must be ISO format."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="schedule_inspection",
        entity_type="inspection",
        entity_id=None,
        parameters={"consultant_type_id": consultant_type_id, "scheduled_date": scheduled_date, "notes": notes},
        description=f"Schedule inspection on {scheduled_date}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_approve_submission(ctx: RunContext[ChatDeps], submission_id: str, entity_type: str, comments: str) -> dict:
    """Propose approving an equipment or material approval submission. entity_type: equipment_submission or material_submission."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="approve_submission",
        entity_type=entity_type,
        entity_id=uuid.UUID(submission_id),
        parameters={"comments": comments},
        description=f"Approve {entity_type.replace('_', ' ')}: {comments}" if comments else f"Approve {entity_type.replace('_', ' ')}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_equipment(ctx: RunContext[ChatDeps], name: str, equipment_type: str = "", manufacturer: str = "", model_number: str = "", notes: str = "") -> dict:
    """Propose creating a new equipment item. The user must approve this action."""
    params = {"name": name, "equipment_type": equipment_type, "manufacturer": manufacturer, "model_number": model_number, "notes": notes}
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_equipment",
        entity_type="equipment",
        entity_id=None,
        parameters=params,
        description=f"Create equipment: '{name}'" + (f" ({equipment_type})" if equipment_type else ""),
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_material(ctx: RunContext[ChatDeps], name: str, material_type: str = "", manufacturer: str = "", quantity: float = 0, unit: str = "", notes: str = "") -> dict:
    """Propose creating a new material item. The user must approve this action."""
    params = {"name": name, "material_type": material_type, "manufacturer": manufacturer, "quantity": quantity, "unit": unit, "notes": notes}
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_material",
        entity_type="material",
        entity_id=None,
        parameters=params,
        description=f"Create material: '{name}'" + (f" ({material_type})" if material_type else ""),
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_area(ctx: RunContext[ChatDeps], name: str, area_type: str = "", floor_number: int = 0, area_code: str = "", total_units: int = 1) -> dict:
    """Propose creating a new construction area. The user must approve this action."""
    params = {"name": name, "area_type": area_type, "floor_number": floor_number, "area_code": area_code, "total_units": total_units}
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_area",
        entity_type="area",
        entity_id=None,
        parameters=params,
        description=f"Create area: '{name}'" + (f" (floor {floor_number})" if floor_number else ""),
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_contact(ctx: RunContext[ChatDeps], contact_name: str, contact_type: str, company_name: str = "", email: str = "", phone: str = "", role_description: str = "") -> dict:
    """Propose creating a new project contact. contact_type examples: contractor, consultant, supplier, client, architect, engineer. The user must approve."""
    params = {"contact_name": contact_name, "contact_type": contact_type, "company_name": company_name, "email": email, "phone": phone, "role_description": role_description}
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_contact",
        entity_type="contact",
        entity_id=None,
        parameters=params,
        description=f"Create contact: '{contact_name}' ({contact_type})",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_create_defect(ctx: RunContext[ChatDeps], description: str, category: str, severity: str = "medium", defect_type: str = "non_conformance") -> dict:
    """Propose creating a new defect. Categories: structural, electrical, plumbing, finishing, safety, other. Severities: low, medium, high, critical. Types: non_conformance, damage, safety_hazard, design_error, workmanship."""
    params = {"description": description, "category": category, "severity": severity, "defect_type": defect_type}
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="create_defect",
        entity_type="defect",
        entity_id=None,
        parameters=params,
        description=f"Create defect: '{description[:80]}' ({severity}, {category})",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


@agent.tool
async def propose_update_defect_status(ctx: RunContext[ChatDeps], entity_id: str, new_status: str, reason: str) -> dict:
    """Propose changing a defect's status. Status values: open, in_progress, resolved, closed, rejected. The user must approve."""
    action = ChatAction(
        conversation_id=ctx.deps.conversation_id,
        message_id=ctx.deps.message_id,
        action_type="update_defect_status",
        entity_type="defect",
        entity_id=uuid.UUID(entity_id),
        parameters={"new_status": new_status, "reason": reason},
        description=f"Change defect status to '{new_status}': {reason}",
        status="proposed",
    )
    ctx.deps.db.add(action)
    await ctx.deps.db.flush()
    return {"action_id": str(action.id), "status": "proposed", "description": action.description}


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
            history_json.append(make_message_dict(msg.role, msg.content))

    return ModelMessagesTypeAdapter.validate_python(history_json)


def make_message_dict(role: str, content: str) -> dict:
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

    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=None,
    )
    db.add(assistant_msg)
    await db.flush()

    message_history = []
    if conversation_id:
        message_history = await load_conversation_history(db, conversation.id, settings.chat_max_history)

    deps = ChatDeps(
        db=db,
        project_id=project_id,
        conversation_id=conversation.id,
        message_id=assistant_msg.id,
    )

    logger.info(f"Chat request | project={project_id} conv={conversation.id} message='{message[:100]}'")
    result = await agent.run(message, deps=deps, message_history=message_history)

    usage = result.usage()
    tool_count = len([p for m in result.new_messages() for p in getattr(m, "parts", []) if hasattr(p, "tool_name")])
    logger.info(
        f"Chat response | project={project_id} conv={conversation.id} "
        f"input_tokens={usage.request_tokens or 0} output_tokens={usage.response_tokens or 0} "
        f"total_tokens={usage.total_tokens or 0} tool_calls={tool_count}"
    )

    all_messages = result.new_messages()
    serialized = to_jsonable_python(all_messages)

    tool_names = []
    for m in all_messages:
        for part in getattr(m, "parts", []):
            if hasattr(part, "tool_name"):
                tool_names.append(part.tool_name)

    assistant_msg.content = result.output
    assistant_msg.tool_calls = tool_names if tool_names else None
    assistant_msg.tool_results = serialized

    conversation.updated_at = datetime.utcnow()

    await db.flush()
    actions_result = await db.execute(
        select(ChatAction).where(ChatAction.message_id == assistant_msg.id)
    )
    pending_actions = list(actions_result.scalars().all())

    return {
        "user_message": user_msg,
        "assistant_message": assistant_msg,
        "conversation_id": conversation.id,
        "pending_actions": pending_actions,
    }
