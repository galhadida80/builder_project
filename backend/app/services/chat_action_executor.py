import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import AreaProgress, ConstructionArea
from app.models.audit import AuditLog
from app.models.chat_action import ChatAction
from app.models.contact import Contact
from app.models.equipment import Equipment
from app.models.equipment_template import EquipmentApprovalDecision, EquipmentApprovalSubmission
from app.models.inspection import Inspection
from app.models.material import Material
from app.models.material_template import MaterialApprovalSubmission
from app.models.meeting import Meeting
from app.models.rfi import RFI

VALID_EQUIPMENT_STATUSES = {"draft", "submitted", "under_review", "approved", "rejected", "revision_requested"}
VALID_MATERIAL_STATUSES = {"draft", "submitted", "under_review", "approved", "rejected", "revision_requested"}
VALID_RFI_STATUSES = {"draft", "open", "waiting_response", "answered", "closed", "cancelled"}
VALID_INSPECTION_STATUSES = {"pending", "in_progress", "completed", "failed"}
VALID_MEETING_STATUSES = {"scheduled", "invitations_sent", "completed", "cancelled"}


async def execute_action(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    handlers = {
        "update_equipment_status": handle_update_equipment_status,
        "update_material_status": handle_update_material_status,
        "update_rfi_status": handle_update_rfi_status,
        "update_inspection_status": handle_update_inspection_status,
        "update_meeting_status": handle_update_meeting_status,
        "update_area_progress": handle_update_area_progress,
        "create_rfi": handle_create_rfi,
        "create_meeting": handle_create_meeting,
        "schedule_inspection": handle_schedule_inspection,
        "approve_submission": handle_approve_submission,
        "create_equipment": handle_create_equipment,
        "create_material": handle_create_material,
        "create_area": handle_create_area,
        "create_contact": handle_create_contact,
    }
    handler = handlers.get(action.action_type)
    if not handler:
        return {"error": f"Unknown action type: {action.action_type}"}
    return await handler(db, action, user_id, project_id)


async def handle_update_equipment_status(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    new_status = action.parameters.get("new_status")
    if new_status not in VALID_EQUIPMENT_STATUSES:
        return {"error": f"Invalid status: {new_status}"}
    result = await db.execute(
        select(Equipment).where(Equipment.id == action.entity_id, Equipment.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return {"error": "Equipment not found"}
    old_status = entity.status
    entity.status = new_status
    entity.updated_at = datetime.utcnow()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="equipment",
        entity_id=entity.id, action="status_change",
        old_values={"status": old_status}, new_values={"status": new_status},
    ))
    return {"old_status": old_status, "new_status": new_status, "name": entity.name}


async def handle_update_material_status(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    new_status = action.parameters.get("new_status")
    if new_status not in VALID_MATERIAL_STATUSES:
        return {"error": f"Invalid status: {new_status}"}
    result = await db.execute(
        select(Material).where(Material.id == action.entity_id, Material.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return {"error": "Material not found"}
    old_status = entity.status
    entity.status = new_status
    entity.updated_at = datetime.utcnow()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="material",
        entity_id=entity.id, action="status_change",
        old_values={"status": old_status}, new_values={"status": new_status},
    ))
    return {"old_status": old_status, "new_status": new_status, "name": entity.name}


async def handle_update_rfi_status(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    new_status = action.parameters.get("new_status")
    if new_status not in VALID_RFI_STATUSES:
        return {"error": f"Invalid status: {new_status}"}
    result = await db.execute(
        select(RFI).where(RFI.id == action.entity_id, RFI.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return {"error": "RFI not found"}
    old_status = entity.status
    entity.status = new_status
    entity.updated_at = datetime.utcnow()
    if new_status == "closed":
        entity.closed_at = datetime.utcnow()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="rfi",
        entity_id=entity.id, action="status_change",
        old_values={"status": old_status}, new_values={"status": new_status},
    ))
    return {"old_status": old_status, "new_status": new_status, "rfi_number": entity.rfi_number}


async def handle_update_inspection_status(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    new_status = action.parameters.get("new_status")
    if new_status not in VALID_INSPECTION_STATUSES:
        return {"error": f"Invalid status: {new_status}"}
    result = await db.execute(
        select(Inspection).where(Inspection.id == action.entity_id, Inspection.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return {"error": "Inspection not found"}
    old_status = entity.status
    entity.status = new_status
    entity.updated_at = datetime.utcnow()
    if new_status == "completed":
        entity.completed_date = datetime.utcnow()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="inspection",
        entity_id=entity.id, action="status_change",
        old_values={"status": old_status}, new_values={"status": new_status},
    ))
    return {"old_status": old_status, "new_status": new_status}


async def handle_update_meeting_status(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    new_status = action.parameters.get("new_status")
    if new_status not in VALID_MEETING_STATUSES:
        return {"error": f"Invalid status: {new_status}"}
    result = await db.execute(
        select(Meeting).where(Meeting.id == action.entity_id, Meeting.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return {"error": "Meeting not found"}
    old_status = entity.status
    entity.status = new_status
    entity.updated_at = datetime.utcnow()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="meeting",
        entity_id=entity.id, action="status_change",
        old_values={"status": old_status}, new_values={"status": new_status},
    ))
    return {"old_status": old_status, "new_status": new_status, "title": entity.title}


async def handle_update_area_progress(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    new_progress = action.parameters.get("new_progress")
    if new_progress is None or not (0 <= float(new_progress) <= 100):
        return {"error": "new_progress must be between 0 and 100"}
    result = await db.execute(
        select(ConstructionArea).where(ConstructionArea.id == action.entity_id, ConstructionArea.project_id == project_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        return {"error": "Area not found"}
    old_progress = float(entity.current_progress)
    entity.current_progress = float(new_progress)
    progress_record = AreaProgress(
        area_id=entity.id,
        progress_percentage=float(new_progress),
        notes=action.parameters.get("notes", ""),
        reported_by_id=user_id,
    )
    db.add(progress_record)
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="area",
        entity_id=entity.id, action="update",
        old_values={"progress": old_progress}, new_values={"progress": float(new_progress)},
    ))
    return {"old_progress": old_progress, "new_progress": float(new_progress), "name": entity.name}


async def handle_create_rfi(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    existing = await db.execute(
        select(func.count()).select_from(RFI).where(RFI.project_id == project_id)
    )
    next_num = (existing.scalar() or 0) + 1
    rfi_number = f"RFI-{next_num:04d}"
    rfi = RFI(
        project_id=project_id,
        rfi_number=rfi_number,
        subject=params.get("subject", ""),
        question=params.get("question", ""),
        category=params.get("category", "other"),
        priority=params.get("priority", "medium"),
        to_email=params.get("to_email", ""),
        status="draft",
        created_by_id=user_id,
    )
    db.add(rfi)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="rfi",
        entity_id=rfi.id, action="create",
        new_values={"rfi_number": rfi_number, "subject": rfi.subject},
    ))
    return {"rfi_id": str(rfi.id), "rfi_number": rfi_number}


async def handle_create_meeting(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    scheduled = params.get("scheduled_date")
    if scheduled:
        scheduled = datetime.fromisoformat(scheduled)
    meeting = Meeting(
        project_id=project_id,
        title=params.get("title", ""),
        description=params.get("description", ""),
        scheduled_date=scheduled or datetime.utcnow(),
        location=params.get("location", ""),
        status="scheduled",
        created_by_id=user_id,
    )
    db.add(meeting)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="meeting",
        entity_id=meeting.id, action="create",
        new_values={"title": meeting.title},
    ))
    return {"meeting_id": str(meeting.id), "title": meeting.title}


async def handle_schedule_inspection(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    scheduled = params.get("scheduled_date")
    if scheduled:
        scheduled = datetime.fromisoformat(scheduled)
    inspection = Inspection(
        project_id=project_id,
        consultant_type_id=uuid.UUID(params["consultant_type_id"]),
        scheduled_date=scheduled or datetime.utcnow(),
        notes=params.get("notes", ""),
        status="pending",
        created_by_id=user_id,
    )
    db.add(inspection)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="inspection",
        entity_id=inspection.id, action="create",
        new_values={"scheduled_date": str(inspection.scheduled_date)},
    ))
    return {"inspection_id": str(inspection.id)}


async def handle_approve_submission(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    entity_type = action.entity_type
    comments = params.get("comments", "")

    if entity_type == "equipment_submission":
        result = await db.execute(
            select(EquipmentApprovalSubmission)
            .where(EquipmentApprovalSubmission.id == action.entity_id, EquipmentApprovalSubmission.project_id == project_id)
        )
        submission = result.scalar_one_or_none()
        if not submission:
            return {"error": "Equipment submission not found"}
        old_status = submission.status
        submission.status = "approved"
        submission.updated_at = datetime.utcnow()
        db.add(EquipmentApprovalDecision(
            submission_id=submission.id,
            approver_id=user_id,
            decision="approved",
            comments=comments,
        ))
    elif entity_type == "material_submission":
        result = await db.execute(
            select(MaterialApprovalSubmission)
            .where(MaterialApprovalSubmission.id == action.entity_id, MaterialApprovalSubmission.project_id == project_id)
        )
        submission = result.scalar_one_or_none()
        if not submission:
            return {"error": "Material submission not found"}
        old_status = submission.status
        submission.status = "approved"
        submission.updated_at = datetime.utcnow()
    else:
        return {"error": f"Unknown submission entity_type: {entity_type}"}

    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type=entity_type,
        entity_id=submission.id, action="approval",
        old_values={"status": old_status}, new_values={"status": "approved", "comments": comments},
    ))
    return {"name": submission.name, "old_status": old_status, "new_status": "approved"}


async def handle_create_equipment(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    equipment = Equipment(
        project_id=project_id,
        name=params.get("name", ""),
        equipment_type=params.get("equipment_type") or None,
        manufacturer=params.get("manufacturer") or None,
        model_number=params.get("model_number") or None,
        notes=params.get("notes") or None,
        status="draft",
        created_by_id=user_id,
    )
    db.add(equipment)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="equipment",
        entity_id=equipment.id, action="create",
        new_values={"name": equipment.name, "equipment_type": equipment.equipment_type},
    ))
    return {"equipment_id": str(equipment.id), "name": equipment.name}


async def handle_create_material(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    quantity = params.get("quantity")
    material = Material(
        project_id=project_id,
        name=params.get("name", ""),
        material_type=params.get("material_type") or None,
        manufacturer=params.get("manufacturer") or None,
        quantity=Decimal(str(quantity)) if quantity else None,
        unit=params.get("unit") or None,
        notes=params.get("notes") or None,
        status="draft",
        created_by_id=user_id,
    )
    db.add(material)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="material",
        entity_id=material.id, action="create",
        new_values={"name": material.name, "material_type": material.material_type},
    ))
    return {"material_id": str(material.id), "name": material.name}


async def handle_create_area(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    area = ConstructionArea(
        project_id=project_id,
        name=params.get("name", ""),
        area_type=params.get("area_type") or None,
        floor_number=params.get("floor_number", 0),
        area_code=params.get("area_code") or None,
        total_units=params.get("total_units", 1),
    )
    db.add(area)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="area",
        entity_id=area.id, action="create",
        new_values={"name": area.name, "area_type": area.area_type},
    ))
    return {"area_id": str(area.id), "name": area.name}


async def handle_create_contact(db: AsyncSession, action: ChatAction, user_id: uuid.UUID, project_id: uuid.UUID) -> dict:
    params = action.parameters
    contact = Contact(
        project_id=project_id,
        contact_name=params.get("contact_name", ""),
        contact_type=params.get("contact_type", ""),
        company_name=params.get("company_name") or None,
        email=params.get("email") or None,
        phone=params.get("phone") or None,
        role_description=params.get("role_description") or None,
    )
    db.add(contact)
    await db.flush()
    db.add(AuditLog(
        project_id=project_id, user_id=user_id, entity_type="contact",
        entity_id=contact.id, action="create",
        new_values={"contact_name": contact.contact_name, "contact_type": contact.contact_type},
    ))
    return {"contact_id": str(contact.id), "contact_name": contact.contact_name}
