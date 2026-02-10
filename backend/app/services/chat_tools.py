import uuid
from datetime import datetime

from sqlalchemy import String, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.area import ConstructionArea
from app.models.contact import Contact
from app.models.document_analysis import DocumentAnalysis
from app.models.equipment import Equipment
from app.models.equipment_template import EquipmentApprovalSubmission
from app.models.inspection import Finding, Inspection
from app.models.material import Material
from app.models.material_template import MaterialApprovalSubmission
from app.models.meeting import Meeting
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI


async def get_project_summary(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        return {"error": "Project not found"}

    members = await db.execute(
        select(func.count()).select_from(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    equipment_count = await db.execute(
        select(func.count()).select_from(Equipment).where(Equipment.project_id == project_id)
    )
    material_count = await db.execute(
        select(func.count()).select_from(Material).where(Material.project_id == project_id)
    )
    rfi_count = await db.execute(
        select(func.count()).select_from(RFI).where(RFI.project_id == project_id)
    )
    inspection_count = await db.execute(
        select(func.count()).select_from(Inspection).where(Inspection.project_id == project_id)
    )

    return {
        "name": project.name,
        "code": project.code,
        "status": project.status,
        "description": project.description,
        "address": project.address,
        "start_date": str(project.start_date) if project.start_date else None,
        "estimated_end_date": str(project.estimated_end_date) if project.estimated_end_date else None,
        "team_members": members.scalar(),
        "total_equipment": equipment_count.scalar(),
        "total_materials": material_count.scalar(),
        "total_rfis": rfi_count.scalar(),
        "total_inspections": inspection_count.scalar(),
    }


async def count_equipment_by_status(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    result = await db.execute(
        select(Equipment.status, func.count(Equipment.id).label("count"))
        .where(Equipment.project_id == project_id)
        .group_by(Equipment.status)
    )
    rows = result.all()
    total = sum(r.count for r in rows)
    breakdown = {r.status: r.count for r in rows}
    return {"total": total, "by_status": breakdown}


async def list_equipment(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    status = kwargs.get("status")
    equipment_type = kwargs.get("equipment_type")
    limit = min(int(kwargs.get("limit", 20)), 50)

    query = select(Equipment).where(Equipment.project_id == project_id)
    if status:
        query = query.where(Equipment.status == status)
    if equipment_type:
        query = query.where(Equipment.equipment_type == equipment_type)
    query = query.order_by(Equipment.created_at.desc()).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": str(e.id),
                "name": e.name,
                "type": e.equipment_type,
                "manufacturer": e.manufacturer,
                "model_number": e.model_number,
                "status": e.status,
                "installation_date": str(e.installation_date) if e.installation_date else None,
            }
            for e in items
        ],
    }


async def get_equipment_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(Equipment).where(Equipment.id == entity_id, Equipment.project_id == project_id)
    )
    e = result.scalar_one_or_none()
    if not e:
        return {"error": "Equipment not found"}
    return {
        "id": str(e.id),
        "name": e.name,
        "type": e.equipment_type,
        "manufacturer": e.manufacturer,
        "model_number": e.model_number,
        "serial_number": e.serial_number,
        "status": e.status,
        "specifications": e.specifications,
        "installation_date": str(e.installation_date) if e.installation_date else None,
        "warranty_expiry": str(e.warranty_expiry) if e.warranty_expiry else None,
        "notes": e.notes,
        "created_at": str(e.created_at),
    }


async def count_materials_by_status(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    result = await db.execute(
        select(Material.status, func.count(Material.id).label("count"))
        .where(Material.project_id == project_id)
        .group_by(Material.status)
    )
    rows = result.all()
    total = sum(r.count for r in rows)
    breakdown = {r.status: r.count for r in rows}
    return {"total": total, "by_status": breakdown}


async def list_materials(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    status = kwargs.get("status")
    material_type = kwargs.get("material_type")
    limit = min(int(kwargs.get("limit", 20)), 50)

    query = select(Material).where(Material.project_id == project_id)
    if status:
        query = query.where(Material.status == status)
    if material_type:
        query = query.where(Material.material_type == material_type)
    query = query.order_by(Material.created_at.desc()).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": str(m.id),
                "name": m.name,
                "type": m.material_type,
                "manufacturer": m.manufacturer,
                "status": m.status,
                "quantity": str(m.quantity) if m.quantity else None,
                "unit": m.unit,
                "expected_delivery": str(m.expected_delivery) if m.expected_delivery else None,
            }
            for m in items
        ],
    }


async def get_material_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(Material).where(Material.id == entity_id, Material.project_id == project_id)
    )
    m = result.scalar_one_or_none()
    if not m:
        return {"error": "Material not found"}
    return {
        "id": str(m.id),
        "name": m.name,
        "type": m.material_type,
        "manufacturer": m.manufacturer,
        "model_number": m.model_number,
        "status": m.status,
        "quantity": str(m.quantity) if m.quantity else None,
        "unit": m.unit,
        "specifications": m.specifications,
        "expected_delivery": str(m.expected_delivery) if m.expected_delivery else None,
        "actual_delivery": str(m.actual_delivery) if m.actual_delivery else None,
        "storage_location": m.storage_location,
        "notes": m.notes,
        "created_at": str(m.created_at),
    }


async def count_rfis_by_status(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    result = await db.execute(
        select(RFI.status, func.count(RFI.id).label("count"))
        .where(RFI.project_id == project_id)
        .group_by(RFI.status)
    )
    rows = result.all()
    total = sum(r.count for r in rows)
    by_status = {r.status: r.count for r in rows}

    priority_result = await db.execute(
        select(RFI.priority, func.count(RFI.id).label("count"))
        .where(RFI.project_id == project_id)
        .group_by(RFI.priority)
    )
    by_priority = {r.priority: r.count for r in priority_result.all()}

    return {"total": total, "by_status": by_status, "by_priority": by_priority}


async def list_rfis(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    status = kwargs.get("status")
    priority = kwargs.get("priority")
    category = kwargs.get("category")
    limit = min(int(kwargs.get("limit", 20)), 50)

    query = select(RFI).where(RFI.project_id == project_id)
    if status:
        query = query.where(RFI.status == status)
    if priority:
        query = query.where(RFI.priority == priority)
    if category:
        query = query.where(RFI.category == category)
    query = query.order_by(RFI.created_at.desc()).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": str(r.id),
                "rfi_number": r.rfi_number,
                "subject": r.subject,
                "category": r.category,
                "priority": r.priority,
                "status": r.status,
                "due_date": str(r.due_date) if r.due_date else None,
                "created_at": str(r.created_at),
            }
            for r in items
        ],
    }


async def get_rfi_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(RFI)
        .options(selectinload(RFI.responses))
        .where(RFI.id == entity_id, RFI.project_id == project_id)
    )
    r = result.scalar_one_or_none()
    if not r:
        return {"error": "RFI not found"}
    return {
        "id": str(r.id),
        "rfi_number": r.rfi_number,
        "subject": r.subject,
        "question": r.question,
        "category": r.category,
        "priority": r.priority,
        "status": r.status,
        "to_email": r.to_email,
        "to_name": r.to_name,
        "due_date": str(r.due_date) if r.due_date else None,
        "location": r.location,
        "drawing_reference": r.drawing_reference,
        "created_at": str(r.created_at),
        "responses": [
            {"from_email": resp.from_email, "text": resp.response_text[:300], "created_at": str(resp.created_at)}
            for resp in r.responses
        ],
    }


async def count_inspections_by_status(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    result = await db.execute(
        select(Inspection.status, func.count(Inspection.id).label("count"))
        .where(Inspection.project_id == project_id)
        .group_by(Inspection.status)
    )
    rows = result.all()
    total = sum(r.count for r in rows)
    by_status = {r.status: r.count for r in rows}

    findings_result = await db.execute(
        select(Finding.severity, func.count(Finding.id).label("count"))
        .join(Inspection, Finding.inspection_id == Inspection.id)
        .where(Inspection.project_id == project_id)
        .group_by(Finding.severity)
    )
    findings_by_severity = {r.severity: r.count for r in findings_result.all()}

    return {"total": total, "by_status": by_status, "findings_by_severity": findings_by_severity}


async def list_inspections(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    status = kwargs.get("status")
    limit = min(int(kwargs.get("limit", 20)), 50)

    query = select(Inspection).where(Inspection.project_id == project_id)
    if status:
        query = query.where(Inspection.status == status)
    query = query.order_by(Inspection.scheduled_date.desc()).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": str(i.id),
                "status": i.status,
                "scheduled_date": str(i.scheduled_date),
                "completed_date": str(i.completed_date) if i.completed_date else None,
                "current_stage": i.current_stage,
                "notes": i.notes,
            }
            for i in items
        ],
    }


async def get_inspection_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(Inspection)
        .options(selectinload(Inspection.findings))
        .where(Inspection.id == entity_id, Inspection.project_id == project_id)
    )
    i = result.scalar_one_or_none()
    if not i:
        return {"error": "Inspection not found"}
    return {
        "id": str(i.id),
        "consultant_type_id": str(i.consultant_type_id),
        "status": i.status,
        "scheduled_date": str(i.scheduled_date),
        "completed_date": str(i.completed_date) if i.completed_date else None,
        "current_stage": i.current_stage,
        "notes": i.notes,
        "created_at": str(i.created_at),
        "findings": [
            {
                "id": str(f.id),
                "title": f.title,
                "severity": f.severity,
                "status": f.status,
                "location": f.location,
            }
            for f in i.findings
        ],
    }


async def get_meetings(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    upcoming = kwargs.get("upcoming", "true").lower() == "true"
    limit = min(int(kwargs.get("limit", 10)), 50)

    query = select(Meeting).where(Meeting.project_id == project_id)
    if upcoming:
        query = query.where(Meeting.scheduled_date >= datetime.utcnow()).order_by(Meeting.scheduled_date.asc())
    else:
        query = query.order_by(Meeting.scheduled_date.desc())
    query = query.limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": str(m.id),
                "title": m.title,
                "description": m.description,
                "meeting_type": m.meeting_type,
                "location": m.location,
                "scheduled_date": str(m.scheduled_date),
                "status": m.status,
            }
            for m in items
        ],
    }


async def get_meeting_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.attendees))
        .where(Meeting.id == entity_id, Meeting.project_id == project_id)
    )
    m = result.scalar_one_or_none()
    if not m:
        return {"error": "Meeting not found"}
    return {
        "id": str(m.id),
        "title": m.title,
        "description": m.description,
        "meeting_type": m.meeting_type,
        "location": m.location,
        "scheduled_date": str(m.scheduled_date),
        "status": m.status,
        "summary": m.summary,
        "action_items": m.action_items,
        "created_at": str(m.created_at),
        "attendees": [
            {"role": a.role, "confirmed": a.confirmed}
            for a in m.attendees
        ],
    }


async def get_approval_queue(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    eq_result = await db.execute(
        select(EquipmentApprovalSubmission)
        .where(EquipmentApprovalSubmission.project_id == project_id)
        .where(EquipmentApprovalSubmission.status == "pending_review")
        .order_by(EquipmentApprovalSubmission.submitted_at.desc())
        .limit(20)
    )
    eq_items = eq_result.scalars().all()

    mat_result = await db.execute(
        select(MaterialApprovalSubmission)
        .where(MaterialApprovalSubmission.project_id == project_id)
        .where(MaterialApprovalSubmission.status == "pending_review")
        .order_by(MaterialApprovalSubmission.submitted_at.desc())
        .limit(20)
    )
    mat_items = mat_result.scalars().all()

    return {
        "equipment_pending": len(eq_items),
        "material_pending": len(mat_items),
        "total_pending": len(eq_items) + len(mat_items),
        "equipment_submissions": [
            {"id": str(s.id), "name": s.name, "submitted_at": str(s.submitted_at) if s.submitted_at else None, "status": s.status}
            for s in eq_items
        ],
        "material_submissions": [
            {"id": str(s.id), "name": s.name, "submitted_at": str(s.submitted_at) if s.submitted_at else None, "status": s.status}
            for s in mat_items
        ],
    }


async def get_area_progress(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    floor_number = kwargs.get("floor_number")
    limit = min(int(kwargs.get("limit", 20)), 50)

    query = select(ConstructionArea).where(ConstructionArea.project_id == project_id)
    if floor_number is not None:
        query = query.where(ConstructionArea.floor_number == int(floor_number))
    query = query.order_by(ConstructionArea.floor_number, ConstructionArea.name).limit(limit)

    result = await db.execute(query)
    items = result.scalars().all()

    avg_result = await db.execute(
        select(func.avg(ConstructionArea.current_progress))
        .where(ConstructionArea.project_id == project_id)
    )
    avg_progress = avg_result.scalar()

    return {
        "count": len(items),
        "average_progress": float(avg_progress) if avg_progress else 0,
        "items": [
            {
                "id": str(a.id),
                "name": a.name,
                "area_type": a.area_type,
                "floor_number": a.floor_number,
                "area_code": a.area_code,
                "current_progress": float(a.current_progress),
                "total_units": a.total_units,
            }
            for a in items
        ],
    }


async def get_area_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(ConstructionArea)
        .options(selectinload(ConstructionArea.progress_updates))
        .where(ConstructionArea.id == entity_id, ConstructionArea.project_id == project_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        return {"error": "Area not found"}
    recent = sorted(a.progress_updates, key=lambda p: p.reported_at, reverse=True)[:10]
    return {
        "id": str(a.id),
        "name": a.name,
        "area_type": a.area_type,
        "floor_number": a.floor_number,
        "area_code": a.area_code,
        "current_progress": float(a.current_progress),
        "total_units": a.total_units,
        "created_at": str(a.created_at),
        "progress_history": [
            {"progress": float(p.progress_percentage), "notes": p.notes, "reported_at": str(p.reported_at)}
            for p in recent
        ],
    }


async def list_contacts(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    limit = min(int(kwargs.get("limit", 30)), 50)
    query = select(Contact).where(Contact.project_id == project_id).order_by(Contact.contact_name).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "count": len(items),
        "items": [
            {
                "id": str(c.id),
                "contact_name": c.contact_name,
                "contact_type": c.contact_type,
                "company_name": c.company_name,
                "email": c.email,
                "phone": c.phone,
                "is_primary": c.is_primary,
            }
            for c in items
        ],
    }


async def get_contact_details(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    entity_id = kwargs.get("entity_id")
    if not entity_id:
        return {"error": "entity_id is required"}
    result = await db.execute(
        select(Contact).where(Contact.id == entity_id, Contact.project_id == project_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        return {"error": "Contact not found"}
    return {
        "id": str(c.id),
        "contact_name": c.contact_name,
        "contact_type": c.contact_type,
        "company_name": c.company_name,
        "email": c.email,
        "phone": c.phone,
        "role_description": c.role_description,
        "is_primary": c.is_primary,
        "created_at": str(c.created_at),
    }


async def search_documents(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    query_text = kwargs.get("query", "")
    if not query_text:
        return {"error": "query parameter is required", "results": []}

    limit = min(int(kwargs.get("limit", 10)), 20)

    result = await db.execute(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.project_id == project_id)
        .where(DocumentAnalysis.status == "completed")
        .where(
            cast(DocumentAnalysis.result, String).ilike(f"%{query_text}%")
        )
        .order_by(DocumentAnalysis.created_at.desc())
        .limit(limit)
    )
    items = result.scalars().all()

    return {
        "count": len(items),
        "results": [
            {
                "file_id": str(d.file_id),
                "analysis_type": d.analysis_type,
                "result_summary": extract_summary(d.result),
                "created_at": str(d.created_at),
            }
            for d in items
        ],
    }


def extract_summary(result: dict | None) -> str:
    if not result:
        return ""
    if "summary" in result:
        return str(result["summary"])[:500]
    if "text" in result:
        return str(result["text"])[:500]
    if "key_findings" in result:
        return str(result["key_findings"])[:500]
    return str(result)[:500]


async def get_full_project_context(db: AsyncSession, project_id: uuid.UUID) -> str:
    summary = await get_project_summary(db, project_id)
    if "error" in summary:
        return "Project not found."

    eq_status = await count_equipment_by_status(db, project_id)
    mat_status = await count_materials_by_status(db, project_id)
    rfi_status = await count_rfis_by_status(db, project_id)
    insp_status = await count_inspections_by_status(db, project_id)
    meetings = await get_meetings(db, project_id, upcoming="true", limit="5")
    approvals = await get_approval_queue(db, project_id)
    areas = await get_area_progress(db, project_id, limit="50")
    contacts = await list_contacts(db, project_id, limit="30")

    lines = [
        f"**Project:** {summary['name']} ({summary['code']})",
        f"**Status:** {summary['status']}",
        f"**Description:** {summary['description'] or 'N/A'}",
        f"**Address:** {summary['address'] or 'N/A'}",
        f"**Start Date:** {summary['start_date'] or 'Not set'}",
        f"**Estimated End:** {summary['estimated_end_date'] or 'Not set'}",
        f"**Team Members:** {summary['team_members']}",
        "",
        f"**Equipment:** {eq_status['total']} total — {eq_status['by_status']}" if eq_status['total'] else "**Equipment:** 0 items",
        f"**Materials:** {mat_status['total']} total — {mat_status['by_status']}" if mat_status['total'] else "**Materials:** 0 items",
        f"**RFIs:** {rfi_status['total']} total — status: {rfi_status['by_status']}, priority: {rfi_status['by_priority']}" if rfi_status['total'] else "**RFIs:** 0 items",
        f"**Inspections:** {insp_status['total']} total — {insp_status['by_status']}" if insp_status['total'] else "**Inspections:** 0 items",
        f"**Upcoming Meetings:** {meetings['count']}",
        f"**Pending Approvals:** {approvals['total_pending']} ({approvals['equipment_pending']} equipment, {approvals['material_pending']} materials)",
        f"**Construction Areas:** {areas['count']} total, average progress: {areas['average_progress']:.0f}%",
        f"**Contacts:** {contacts['count']} total",
    ]

    if meetings['count'] > 0:
        lines.append("\n**Next Meetings:**")
        for m in meetings['items'][:5]:
            lines.append(f"  - {m['title']} ({m['meeting_type']}) on {m['scheduled_date']} — {m['status']}")

    if areas['count'] > 0 and areas['items']:
        lines.append("\n**Area Progress:**")
        for a in areas['items'][:10]:
            lines.append(f"  - {a['name']} (Floor {a['floor_number']}, {a['area_code']}): {a['current_progress']}%")

    if contacts['count'] > 0:
        lines.append("\n**Key Contacts:**")
        for c in contacts['items'][:10]:
            lines.append(f"  - {c['contact_name']} ({c['contact_type']}, {c['company_name'] or 'N/A'}) — {c['email'] or 'N/A'}")

    return "\n".join(lines)


TOOL_REGISTRY = {
    "get_project_summary": get_project_summary,
    "count_equipment_by_status": count_equipment_by_status,
    "list_equipment": list_equipment,
    "get_equipment_details": get_equipment_details,
    "count_materials_by_status": count_materials_by_status,
    "list_materials": list_materials,
    "get_material_details": get_material_details,
    "count_rfis_by_status": count_rfis_by_status,
    "list_rfis": list_rfis,
    "get_rfi_details": get_rfi_details,
    "count_inspections_by_status": count_inspections_by_status,
    "list_inspections": list_inspections,
    "get_inspection_details": get_inspection_details,
    "get_meetings": get_meetings,
    "get_meeting_details": get_meeting_details,
    "get_approval_queue": get_approval_queue,
    "get_area_progress": get_area_progress,
    "get_area_details": get_area_details,
    "list_contacts": list_contacts,
    "get_contact_details": get_contact_details,
    "search_documents": search_documents,
}
