import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Permission, get_effective_permissions
from app.models.contact import Contact
from app.models.defect import Defect, DefectAssignee
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.project import ProjectMember
from app.models.user import User


READ_TOOLS = {
    "get_project_summary", "count_equipment_by_status", "list_equipment",
    "get_equipment_details", "count_materials_by_status", "list_materials",
    "get_material_details", "count_rfis_by_status", "list_rfis",
    "get_rfi_details", "count_inspections_by_status", "list_inspections",
    "get_inspection_details", "get_meetings", "get_meeting_details",
    "get_approval_queue", "get_area_progress", "get_area_details",
    "list_contacts", "get_contact_details", "count_defects_by_status",
    "list_defects", "get_defect_details", "search_documents",
}

CREATE_TOOLS = {
    "propose_create_rfi", "propose_create_meeting", "propose_schedule_inspection",
    "propose_create_equipment", "propose_create_material", "propose_create_area",
    "propose_create_contact", "propose_create_defect",
}

EDIT_TOOLS = {
    "propose_update_equipment_status", "propose_update_material_status",
    "propose_update_rfi_status", "propose_update_inspection_status",
    "propose_update_meeting_status", "propose_update_area_progress",
    "propose_update_defect_status",
}

APPROVE_TOOLS = {"propose_approve_submission"}

ACTION_PERMISSION_MAP = {
    "create_rfi": Permission.CREATE, "create_meeting": Permission.CREATE,
    "schedule_inspection": Permission.CREATE, "create_equipment": Permission.CREATE,
    "create_material": Permission.CREATE, "create_area": Permission.CREATE,
    "create_contact": Permission.CREATE, "create_defect": Permission.CREATE,
    "update_equipment_status": Permission.EDIT, "update_material_status": Permission.EDIT,
    "update_rfi_status": Permission.EDIT, "update_inspection_status": Permission.EDIT,
    "update_meeting_status": Permission.EDIT, "update_area_progress": Permission.EDIT,
    "update_defect_status": Permission.EDIT, "approve_submission": Permission.APPROVE,
}

APPROVAL_STATUSES = {
    "equipment": {"approved", "rejected"},
    "material": {"approved", "rejected"},
    "inspection": {"completed", "failed"},
    "defect": {"resolved", "closed"},
}


def get_allowed_tools(effective_permissions: set[str]) -> set[str]:
    allowed = set(READ_TOOLS)
    if Permission.CREATE.value in effective_permissions:
        allowed |= CREATE_TOOLS
    if Permission.EDIT.value in effective_permissions:
        allowed |= EDIT_TOOLS
    if Permission.APPROVE.value in effective_permissions:
        allowed |= APPROVE_TOOLS
    return allowed


async def get_user_chat_context(
    db: AsyncSession, user_id: uuid.UUID, project_id: uuid.UUID,
) -> tuple[str, set[str]]:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if user and user.is_super_admin:
        return "project_admin", READ_TOOLS | CREATE_TOOLS | EDIT_TOOLS | APPROVE_TOOLS

    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalars().first()
    if not member:
        return "viewer", set(READ_TOOLS)

    effective = await get_effective_permissions(member, db)
    return member.role, get_allowed_tools(effective)


async def authorize_action(
    db: AsyncSession, action, user_id: uuid.UUID, project_id: uuid.UUID,
) -> dict | None:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user and user.is_super_admin:
        return None

    required = ACTION_PERMISSION_MAP.get(action.action_type)
    if not required:
        return None

    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = member_result.scalars().first()
    if not member:
        return {"error": "You do not have access to this project"}

    effective = await get_effective_permissions(member, db)
    if required.value not in effective:
        return {"error": f"Permission '{required.value}' required for this action"}

    new_status = action.parameters.get("new_status")
    if not new_status:
        return None

    approval_set = APPROVAL_STATUSES.get(action.entity_type)
    if not approval_set or new_status not in approval_set:
        return None

    if action.entity_type in ("equipment", "material"):
        return await _check_approver_contacts(db, action, user_id, project_id, member)

    if action.entity_type == "inspection":
        if member.role in ("consultant", "inspector", "supervisor", "project_admin"):
            return None
        return {"error": "Only consultants, inspectors, or supervisors can complete/fail inspections"}

    if action.entity_type == "defect":
        return await _check_defect_assignees(db, action, user_id, project_id, member)

    return None


async def _check_approver_contacts(
    db: AsyncSession, action, user_id: uuid.UUID, project_id: uuid.UUID, member: ProjectMember,
) -> dict | None:
    Model = Equipment if action.entity_type == "equipment" else Material
    result = await db.execute(
        select(Model).where(Model.id == action.entity_id, Model.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return None

    approver_ids = entity.approver_contact_ids or []
    if not approver_ids:
        if member.role == "project_admin":
            return None
        return {"error": "No approvers set for this item. A project admin must assign approvers first."}

    parsed_ids = [uuid.UUID(cid) if isinstance(cid, str) else cid for cid in approver_ids]
    contacts_result = await db.execute(
        select(Contact.user_id).where(Contact.id.in_(parsed_ids), Contact.user_id.isnot(None))
    )
    if user_id in {row[0] for row in contacts_result.all()}:
        return None
    return {"error": "Only designated approvers can approve or reject this item"}


async def _check_defect_assignees(
    db: AsyncSession, action, user_id: uuid.UUID, project_id: uuid.UUID, member: ProjectMember,
) -> dict | None:
    result = await db.execute(
        select(Defect).where(Defect.id == action.entity_id, Defect.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return None

    if entity.created_by_id == user_id or member.role == "project_admin":
        return None

    assigned_user_ids: set[uuid.UUID] = set()
    if entity.assigned_contact_id:
        row = (await db.execute(
            select(Contact.user_id).where(Contact.id == entity.assigned_contact_id, Contact.user_id.isnot(None))
        )).first()
        if row and row[0]:
            assigned_user_ids.add(row[0])

    assignee_rows = (await db.execute(
        select(Contact.user_id)
        .join(DefectAssignee, DefectAssignee.contact_id == Contact.id)
        .where(DefectAssignee.defect_id == action.entity_id, Contact.user_id.isnot(None))
    )).all()
    for row in assignee_rows:
        if row[0]:
            assigned_user_ids.add(row[0])

    if user_id in assigned_user_ids:
        return None
    return {"error": "Only assigned users or the creator can resolve/close this defect"}
