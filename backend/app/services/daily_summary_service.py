import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import ConstructionArea
from app.models.audit import AuditLog
from app.models.defect import Defect
from app.models.equipment import Equipment
from app.models.equipment_template import EquipmentApprovalSubmission
from app.models.inspection import Finding, Inspection
from app.models.material import Material
from app.models.material_template import MaterialApprovalSubmission
from app.models.meeting import Meeting
from app.models.rfi import RFI


async def collect_project_daily_summary(
    db: AsyncSession, project_id: uuid.UUID, summary_date: date
) -> dict:
    day_start = datetime.combine(summary_date, datetime.min.time(), tzinfo=timezone.utc)
    day_end = datetime.combine(summary_date + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)

    audit_entries = await _get_audit_entries(db, project_id, day_start, day_end)
    equipment_stats = await _get_entity_day_stats(db, Equipment, project_id, day_start, day_end)
    material_stats = await _get_entity_day_stats(db, Material, project_id, day_start, day_end)
    inspection_stats = await _get_inspection_stats(db, project_id, day_start, day_end)
    rfi_stats = await _get_rfi_stats(db, project_id, day_start, day_end, summary_date)
    defect_stats = await _get_defect_stats(db, project_id, day_start, day_end)
    pending_approvals = await _get_pending_approvals_count(db, project_id)
    upcoming_meetings = await _get_upcoming_meetings(db, project_id, summary_date)
    overall_progress = await _get_overall_progress(db, project_id)

    has_activity = (
        len(audit_entries) > 0
        or equipment_stats["created"] > 0
        or material_stats["created"] > 0
        or inspection_stats["completed"] > 0
        or rfi_stats["opened"] > 0
        or rfi_stats["answered"] > 0
        or rfi_stats["closed"] > 0
        or defect_stats["new"] > 0
        or defect_stats["resolved"] > 0
    )

    return {
        "has_activity": has_activity,
        "summary_date": summary_date.isoformat(),
        "audit_entries": audit_entries,
        "equipment": equipment_stats,
        "materials": material_stats,
        "inspections": inspection_stats,
        "rfis": rfi_stats,
        "defects": defect_stats,
        "pending_approvals": pending_approvals,
        "upcoming_meetings": upcoming_meetings,
        "overall_progress": overall_progress,
    }


async def _get_audit_entries(
    db: AsyncSession, project_id: uuid.UUID, day_start: datetime, day_end: datetime
) -> list[dict]:
    result = await db.execute(
        select(
            AuditLog.entity_type,
            AuditLog.action,
            func.count().label("count"),
        )
        .where(
            AuditLog.project_id == project_id,
            AuditLog.created_at >= day_start,
            AuditLog.created_at < day_end,
        )
        .group_by(AuditLog.entity_type, AuditLog.action)
        .order_by(func.count().desc())
        .limit(50)
    )
    return [
        {"entity_type": row.entity_type, "action": row.action, "count": row.count}
        for row in result.all()
    ]


async def _get_entity_day_stats(
    db: AsyncSession, model, project_id: uuid.UUID, day_start: datetime, day_end: datetime
) -> dict:
    created = await db.execute(
        select(func.count())
        .select_from(model)
        .where(
            model.project_id == project_id,
            model.created_at >= day_start,
            model.created_at < day_end,
        )
    )
    approved = await db.execute(
        select(func.count())
        .select_from(model)
        .where(
            model.project_id == project_id,
            model.status == "approved",
            model.updated_at >= day_start,
            model.updated_at < day_end,
        )
    )
    rejected = await db.execute(
        select(func.count())
        .select_from(model)
        .where(
            model.project_id == project_id,
            model.status == "rejected",
            model.updated_at >= day_start,
            model.updated_at < day_end,
        )
    )
    return {
        "created": created.scalar() or 0,
        "approved": approved.scalar() or 0,
        "rejected": rejected.scalar() or 0,
    }


async def _get_inspection_stats(
    db: AsyncSession, project_id: uuid.UUID, day_start: datetime, day_end: datetime
) -> dict:
    completed = await db.execute(
        select(func.count())
        .select_from(Inspection)
        .where(
            Inspection.project_id == project_id,
            Inspection.status == "completed",
            Inspection.completed_date >= day_start,
            Inspection.completed_date < day_end,
        )
    )
    findings_count = await db.execute(
        select(func.count())
        .select_from(Finding)
        .join(Inspection, Finding.inspection_id == Inspection.id)
        .where(
            Inspection.project_id == project_id,
            Finding.created_at >= day_start,
            Finding.created_at < day_end,
        )
    )
    return {
        "completed": completed.scalar() or 0,
        "new_findings": findings_count.scalar() or 0,
    }


async def _get_rfi_stats(
    db: AsyncSession, project_id: uuid.UUID, day_start: datetime, day_end: datetime, summary_date: date
) -> dict:
    opened = await db.execute(
        select(func.count())
        .select_from(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.created_at >= day_start,
            RFI.created_at < day_end,
        )
    )
    answered = await db.execute(
        select(func.count())
        .select_from(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.status == "answered",
            RFI.responded_at >= day_start,
            RFI.responded_at < day_end,
        )
    )
    closed = await db.execute(
        select(func.count())
        .select_from(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.status == "closed",
            RFI.closed_at >= day_start,
            RFI.closed_at < day_end,
        )
    )
    overdue = await db.execute(
        select(func.count())
        .select_from(RFI)
        .where(
            RFI.project_id == project_id,
            RFI.status.in_(["open", "waiting_response"]),
            RFI.due_date < datetime.combine(summary_date, datetime.min.time()),
        )
    )
    return {
        "opened": opened.scalar() or 0,
        "answered": answered.scalar() or 0,
        "closed": closed.scalar() or 0,
        "overdue": overdue.scalar() or 0,
    }


async def _get_defect_stats(
    db: AsyncSession, project_id: uuid.UUID, day_start: datetime, day_end: datetime
) -> dict:
    new_count = await db.execute(
        select(func.count())
        .select_from(Defect)
        .where(
            Defect.project_id == project_id,
            Defect.created_at >= day_start,
            Defect.created_at < day_end,
        )
    )
    resolved_count = await db.execute(
        select(func.count())
        .select_from(Defect)
        .where(
            Defect.project_id == project_id,
            Defect.status == "resolved",
            Defect.resolved_at >= day_start,
            Defect.resolved_at < day_end,
        )
    )
    critical_open = await db.execute(
        select(func.count())
        .select_from(Defect)
        .where(
            Defect.project_id == project_id,
            Defect.severity == "critical",
            Defect.status.in_(["open", "in_progress"]),
        )
    )
    return {
        "new": new_count.scalar() or 0,
        "resolved": resolved_count.scalar() or 0,
        "critical_open": critical_open.scalar() or 0,
    }


async def _get_pending_approvals_count(db: AsyncSession, project_id: uuid.UUID) -> dict:
    eq_pending = await db.execute(
        select(func.count())
        .select_from(EquipmentApprovalSubmission)
        .where(
            EquipmentApprovalSubmission.project_id == project_id,
            EquipmentApprovalSubmission.status == "pending_review",
        )
    )
    mat_pending = await db.execute(
        select(func.count())
        .select_from(MaterialApprovalSubmission)
        .where(
            MaterialApprovalSubmission.project_id == project_id,
            MaterialApprovalSubmission.status == "pending_review",
        )
    )
    eq = eq_pending.scalar() or 0
    mat = mat_pending.scalar() or 0
    return {"equipment": eq, "materials": mat, "total": eq + mat}


async def _get_upcoming_meetings(
    db: AsyncSession, project_id: uuid.UUID, summary_date: date
) -> list[dict]:
    start = datetime.combine(summary_date, datetime.min.time())
    end = datetime.combine(summary_date + timedelta(days=7), datetime.min.time())
    result = await db.execute(
        select(Meeting)
        .where(
            Meeting.project_id == project_id,
            Meeting.scheduled_date >= start,
            Meeting.scheduled_date < end,
        )
        .order_by(Meeting.scheduled_date.asc())
        .limit(10)
    )
    meetings = result.scalars().all()
    return [
        {
            "title": m.title,
            "meeting_type": m.meeting_type,
            "scheduled_date": str(m.scheduled_date),
            "location": m.location,
        }
        for m in meetings
    ]


async def _get_overall_progress(db: AsyncSession, project_id: uuid.UUID) -> float:
    result = await db.execute(
        select(func.avg(ConstructionArea.current_progress))
        .where(ConstructionArea.project_id == project_id)
    )
    avg = result.scalar()
    return round(float(avg), 1) if avg is not None else 0.0
