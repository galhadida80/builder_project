import hashlib
import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.equipment_submission import EquipmentSubmission
from app.models.inspection import Inspection, Finding
from app.models.material_template import MaterialApprovalSubmission


def compute_checksum(data: list[dict]) -> str:
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


async def generate_audit_package(
    db: AsyncSession, project_id: UUID, date_from: datetime, date_to: datetime
) -> dict:
    audit_result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(
            AuditLog.project_id == project_id,
            AuditLog.created_at >= date_from,
            AuditLog.created_at <= date_to,
        )
        .order_by(AuditLog.created_at)
    )
    audit_logs = audit_result.scalars().all()

    audit_log_data = []
    for log in audit_logs:
        audit_log_data.append({
            "id": str(log.id),
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id),
            "action": log.action,
            "user_email": log.user.email if log.user else None,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

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

    approval_chain_data = []
    for sub in equipment_submissions:
        approval_chain_data.append({
            "type": "equipment",
            "id": str(sub.id),
            "name": sub.name,
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
        })
    for sub in material_submissions:
        approval_chain_data.append({
            "type": "material",
            "id": str(sub.id),
            "name": sub.name,
            "status": sub.status,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
        })

    insp_result = await db.execute(
        select(Inspection)
        .options(selectinload(Inspection.findings))
        .where(
            Inspection.project_id == project_id,
            Inspection.scheduled_date >= date_from,
            Inspection.scheduled_date <= date_to,
        )
    )
    inspections = insp_result.scalars().all()

    inspection_data = []
    for insp in inspections:
        findings_data = []
        for f in insp.findings:
            findings_data.append({
                "id": str(f.id),
                "title": f.title,
                "severity": f.severity,
                "status": f.status,
                "location": f.location,
            })
        inspection_data.append({
            "id": str(insp.id),
            "status": insp.status,
            "scheduled_date": insp.scheduled_date.isoformat() if insp.scheduled_date else None,
            "completed_date": insp.completed_date.isoformat() if insp.completed_date else None,
            "findings": findings_data,
        })

    return {
        "project_id": str(project_id),
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "generated_at": datetime.utcnow().isoformat(),
        "audit_logs": {
            "count": len(audit_log_data),
            "checksum": compute_checksum(audit_log_data),
            "data": audit_log_data,
        },
        "approval_chains": {
            "count": len(approval_chain_data),
            "checksum": compute_checksum(approval_chain_data),
            "data": approval_chain_data,
        },
        "inspections": {
            "count": len(inspection_data),
            "checksum": compute_checksum(inspection_data),
            "data": inspection_data,
        },
    }
