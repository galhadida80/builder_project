import logging
import uuid

from fastmcp import FastMCP

from app.db.session import AsyncSessionLocal
from app.services.chat_tools import TOOL_REGISTRY

logger = logging.getLogger(__name__)

mcp = FastMCP("builderops")


@mcp.tool()
async def get_project_summary(project_id: str) -> dict:
    """Get project overview including name, status, dates, team size, and total counts of equipment, materials, RFIs, and inspections."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_project_summary"](db, uuid.UUID(project_id))


@mcp.tool()
async def count_equipment_by_status(project_id: str) -> dict:
    """Get total equipment count and breakdown by approval status (draft, submitted, under_review, approved, rejected)."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["count_equipment_by_status"](db, uuid.UUID(project_id))


@mcp.tool()
async def list_equipment(project_id: str, status: str = "", equipment_type: str = "", limit: int = 20) -> dict:
    """List equipment items with optional filters. Status values: draft, submitted, under_review, approved, rejected."""
    kwargs = {"limit": limit}
    if status:
        kwargs["status"] = status
    if equipment_type:
        kwargs["equipment_type"] = equipment_type
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["list_equipment"](db, uuid.UUID(project_id), **kwargs)


@mcp.tool()
async def get_equipment_details(project_id: str, entity_id: str) -> dict:
    """Get full details for a single equipment item by its ID."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_equipment_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def count_materials_by_status(project_id: str) -> dict:
    """Get total materials count and breakdown by approval status."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["count_materials_by_status"](db, uuid.UUID(project_id))


@mcp.tool()
async def list_materials(project_id: str, status: str = "", material_type: str = "", limit: int = 20) -> dict:
    """List materials with optional filters. Status values: draft, submitted, under_review, approved, rejected."""
    kwargs = {"limit": limit}
    if status:
        kwargs["status"] = status
    if material_type:
        kwargs["material_type"] = material_type
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["list_materials"](db, uuid.UUID(project_id), **kwargs)


@mcp.tool()
async def get_material_details(project_id: str, entity_id: str) -> dict:
    """Get full details for a single material by its ID."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_material_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def count_rfis_by_status(project_id: str) -> dict:
    """Get RFI counts by status and by priority."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["count_rfis_by_status"](db, uuid.UUID(project_id))


@mcp.tool()
async def list_rfis(project_id: str, status: str = "", priority: str = "", category: str = "", limit: int = 20) -> dict:
    """List RFIs with filters. Categories: design, structural, mep, architectural, specifications, schedule, cost, other."""
    kwargs = {"limit": limit}
    if status:
        kwargs["status"] = status
    if priority:
        kwargs["priority"] = priority
    if category:
        kwargs["category"] = category
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["list_rfis"](db, uuid.UUID(project_id), **kwargs)


@mcp.tool()
async def get_rfi_details(project_id: str, entity_id: str) -> dict:
    """Get full RFI details by ID including question, responses, email history."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_rfi_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def count_inspections_by_status(project_id: str) -> dict:
    """Get inspection counts by status and findings by severity."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["count_inspections_by_status"](db, uuid.UUID(project_id))


@mcp.tool()
async def list_inspections(project_id: str, status: str = "", limit: int = 20) -> dict:
    """List inspections with optional status filter."""
    kwargs = {"limit": limit}
    if status:
        kwargs["status"] = status
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["list_inspections"](db, uuid.UUID(project_id), **kwargs)


@mcp.tool()
async def get_inspection_details(project_id: str, entity_id: str) -> dict:
    """Get full inspection details by ID including findings, stages, consultant type."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_inspection_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def get_meetings(project_id: str, upcoming: str = "true", limit: int = 10) -> dict:
    """Get meetings list. Set upcoming=true for future meetings, false for all."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_meetings"](db, uuid.UUID(project_id), upcoming=upcoming, limit=str(limit))


@mcp.tool()
async def get_meeting_details(project_id: str, entity_id: str) -> dict:
    """Get full meeting details by ID."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_meeting_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def get_approval_queue(project_id: str) -> dict:
    """Get pending approval submissions for equipment and materials."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_approval_queue"](db, uuid.UUID(project_id))


@mcp.tool()
async def get_area_progress(project_id: str, floor_number: int = -1, limit: int = 20) -> dict:
    """Get construction area progress. Optionally filter by floor number."""
    kwargs = {"limit": str(limit)}
    if floor_number >= 0:
        kwargs["floor_number"] = str(floor_number)
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_area_progress"](db, uuid.UUID(project_id), **kwargs)


@mcp.tool()
async def get_area_details(project_id: str, entity_id: str) -> dict:
    """Get full area details by ID including progress history."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_area_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def list_contacts(project_id: str, limit: int = 30) -> dict:
    """List project contacts with id, name, type, company, email, phone."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["list_contacts"](db, uuid.UUID(project_id), limit=str(limit))


@mcp.tool()
async def get_contact_details(project_id: str, entity_id: str) -> dict:
    """Get full contact details by ID including role description."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["get_contact_details"](db, uuid.UUID(project_id), entity_id=entity_id)


@mcp.tool()
async def search_documents(project_id: str, query: str, limit: int = 10) -> dict:
    """Search through analyzed documents for specific content."""
    async with AsyncSessionLocal() as db:
        return await TOOL_REGISTRY["search_documents"](db, uuid.UUID(project_id), query=query, limit=str(limit))
