import io
import csv
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment_submission import EquipmentSubmission
from app.models.inspection import Inspection, Finding
from app.models.material_template import MaterialApprovalSubmission
from app.models.rfi import RFI


async def generate_inspection_summary(
    db: AsyncSession, project_id: UUID, date_from: datetime, date_to: datetime
) -> dict:
    result = await db.execute(
        select(Inspection)
        .where(
            Inspection.project_id == project_id,
            Inspection.scheduled_date >= date_from,
            Inspection.scheduled_date <= date_to,
        )
    )
    inspections = result.scalars().all()

    status_counts = {}
    for insp in inspections:
        status_counts[insp.status] = status_counts.get(insp.status, 0) + 1

    inspection_ids = [insp.id for insp in inspections]
    findings_list = []
    if inspection_ids:
        findings_result = await db.execute(
            select(Finding).where(Finding.inspection_id.in_(inspection_ids))
        )
        findings = findings_result.scalars().all()
        for f in findings:
            findings_list.append({
                "id": str(f.id),
                "title": f.title,
                "severity": f.severity,
                "status": f.status,
                "location": f.location,
            })

    severity_counts = {}
    for f in findings_list:
        severity_counts[f["severity"]] = severity_counts.get(f["severity"], 0) + 1

    return {
        "total_inspections": len(inspections),
        "status_breakdown": status_counts,
        "total_findings": len(findings_list),
        "severity_breakdown": severity_counts,
        "findings": findings_list,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }


async def generate_approval_report(
    db: AsyncSession, project_id: UUID, date_from: datetime, date_to: datetime
) -> dict:
    eq_result = await db.execute(
        select(EquipmentSubmission).where(
            EquipmentSubmission.project_id == project_id,
            EquipmentSubmission.created_at >= date_from,
            EquipmentSubmission.created_at <= date_to,
        )
    )
    equipment_submissions = eq_result.scalars().all()

    mat_result = await db.execute(
        select(MaterialApprovalSubmission).where(
            MaterialApprovalSubmission.project_id == project_id,
            MaterialApprovalSubmission.created_at >= date_from,
            MaterialApprovalSubmission.created_at <= date_to,
        )
    )
    material_submissions = mat_result.scalars().all()

    eq_status = {}
    for sub in equipment_submissions:
        eq_status[sub.status] = eq_status.get(sub.status, 0) + 1

    mat_status = {}
    for sub in material_submissions:
        mat_status[sub.status] = mat_status.get(sub.status, 0) + 1

    eq_items = []
    for sub in equipment_submissions:
        eq_items.append({
            "id": str(sub.id),
            "name": sub.name,
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
        })

    mat_items = []
    for sub in material_submissions:
        mat_items.append({
            "id": str(sub.id),
            "name": sub.name,
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
        })

    return {
        "total_equipment_submissions": len(equipment_submissions),
        "equipment_status_breakdown": eq_status,
        "equipment_items": eq_items,
        "total_material_submissions": len(material_submissions),
        "material_status_breakdown": mat_status,
        "material_items": mat_items,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
    }


async def generate_rfi_aging_report(db: AsyncSession, project_id: UUID) -> dict:
    result = await db.execute(
        select(RFI).where(
            RFI.project_id == project_id,
            RFI.status.in_(["draft", "open", "waiting_response"]),
        )
    )
    open_rfis = result.scalars().all()

    now = datetime.utcnow()
    priority_groups = {}
    aging_items = []

    for rfi in open_rfis:
        age_days = (now - rfi.created_at).days
        priority = rfi.priority or "medium"

        if priority not in priority_groups:
            priority_groups[priority] = {"count": 0, "total_age_days": 0}
        priority_groups[priority]["count"] += 1
        priority_groups[priority]["total_age_days"] += age_days

        aging_items.append({
            "id": str(rfi.id),
            "rfi_number": rfi.rfi_number,
            "subject": rfi.subject,
            "priority": priority,
            "status": rfi.status,
            "age_days": age_days,
            "created_at": rfi.created_at.isoformat(),
            "due_date": rfi.due_date.isoformat() if rfi.due_date else None,
        })

    for group in priority_groups.values():
        group["avg_age_days"] = round(group["total_age_days"] / group["count"], 1) if group["count"] else 0

    aging_items.sort(key=lambda x: x["age_days"], reverse=True)

    return {
        "total_open_rfis": len(open_rfis),
        "priority_breakdown": priority_groups,
        "items": aging_items,
    }


def generate_csv_export(data: list[dict]) -> str:
    if not data:
        return ""

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()
