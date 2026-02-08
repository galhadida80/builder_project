import uuid
from datetime import datetime
from sqlalchemy import select, func, case, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.project import Project, ProjectMember
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.rfi import RFI
from app.models.inspection import Inspection, Finding
from app.models.meeting import Meeting
from app.models.area import ConstructionArea
from app.models.equipment_template import EquipmentApprovalSubmission
from app.models.material_template import MaterialApprovalSubmission
from app.models.document_analysis import DocumentAnalysis


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
                "status": i.status,
                "scheduled_date": str(i.scheduled_date),
                "completed_date": str(i.completed_date) if i.completed_date else None,
                "current_stage": i.current_stage,
                "notes": i.notes,
            }
            for i in items
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


async def get_approval_queue(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> dict:
    eq_result = await db.execute(
        select(EquipmentApprovalSubmission)
        .where(EquipmentApprovalSubmission.project_id == project_id)
        .where(EquipmentApprovalSubmission.status == "pending")
        .order_by(EquipmentApprovalSubmission.submitted_at.desc())
        .limit(20)
    )
    eq_items = eq_result.scalars().all()

    mat_result = await db.execute(
        select(MaterialApprovalSubmission)
        .where(MaterialApprovalSubmission.project_id == project_id)
        .where(MaterialApprovalSubmission.status == "pending")
        .order_by(MaterialApprovalSubmission.submitted_at.desc())
        .limit(20)
    )
    mat_items = mat_result.scalars().all()

    return {
        "equipment_pending": len(eq_items),
        "material_pending": len(mat_items),
        "total_pending": len(eq_items) + len(mat_items),
        "equipment_submissions": [
            {"name": s.name, "submitted_at": str(s.submitted_at) if s.submitted_at else None, "status": s.status}
            for s in eq_items
        ],
        "material_submissions": [
            {"name": s.name, "submitted_at": str(s.submitted_at) if s.submitted_at else None, "status": s.status}
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
                "result_summary": _extract_summary(d.result),
                "created_at": str(d.created_at),
            }
            for d in items
        ],
    }


def _extract_summary(result: dict | None) -> str:
    if not result:
        return ""
    if "summary" in result:
        return str(result["summary"])[:500]
    if "text" in result:
        return str(result["text"])[:500]
    if "key_findings" in result:
        return str(result["key_findings"])[:500]
    return str(result)[:500]


TOOL_REGISTRY = {
    "get_project_summary": get_project_summary,
    "count_equipment_by_status": count_equipment_by_status,
    "list_equipment": list_equipment,
    "count_materials_by_status": count_materials_by_status,
    "list_materials": list_materials,
    "count_rfis_by_status": count_rfis_by_status,
    "list_rfis": list_rfis,
    "count_inspections_by_status": count_inspections_by_status,
    "list_inspections": list_inspections,
    "get_meetings": get_meetings,
    "get_approval_queue": get_approval_queue,
    "get_area_progress": get_area_progress,
    "search_documents": search_documents,
}
