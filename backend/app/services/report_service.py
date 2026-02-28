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
from app.models.time_entry import TimeEntry
from app.models.user import User
from app.utils import utcnow


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

    now = utcnow()
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


async def generate_attendance_report(
    db: AsyncSession, project_id: UUID, date_from: datetime, date_to: datetime
) -> dict:
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(TimeEntry)
        .options(selectinload(TimeEntry.user))
        .where(
            TimeEntry.project_id == project_id,
            TimeEntry.clock_in_time >= date_from,
            TimeEntry.clock_in_time <= date_to,
            TimeEntry.status == "completed",
        )
        .order_by(TimeEntry.clock_in_time)
    )
    time_entries = result.scalars().all()

    daily_attendance = {}
    user_totals = {}

    for entry in time_entries:
        if not entry.clock_out_time:
            continue

        date_key = entry.clock_in_time.date().isoformat()
        user_name = entry.user.full_name if entry.user else "Unknown"
        user_id = str(entry.user_id)

        total_hours = (entry.clock_out_time - entry.clock_in_time).total_seconds() / 3600
        break_hours = (entry.break_minutes or 0) / 60
        worked_hours = round(total_hours - break_hours, 2)

        if date_key not in daily_attendance:
            daily_attendance[date_key] = {}

        if user_id not in daily_attendance[date_key]:
            daily_attendance[date_key][user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "clock_in": entry.clock_in_time.isoformat(),
                "clock_out": entry.clock_out_time.isoformat(),
                "total_hours": worked_hours,
                "entries": 1,
            }
        else:
            daily_attendance[date_key][user_id]["total_hours"] += worked_hours
            daily_attendance[date_key][user_id]["entries"] += 1
            if entry.clock_out_time.isoformat() > daily_attendance[date_key][user_id]["clock_out"]:
                daily_attendance[date_key][user_id]["clock_out"] = entry.clock_out_time.isoformat()

        if user_id not in user_totals:
            user_totals[user_id] = {"user_name": user_name, "total_hours": 0, "days_worked": set()}
        user_totals[user_id]["total_hours"] += worked_hours
        user_totals[user_id]["days_worked"].add(date_key)

    daily_summary = []
    for date, users in sorted(daily_attendance.items()):
        daily_summary.append({
            "date": date,
            "total_workers": len(users),
            "total_hours": round(sum(u["total_hours"] for u in users.values()), 2),
            "workers": list(users.values()),
        })

    user_summary = []
    for user_id, data in user_totals.items():
        user_summary.append({
            "user_id": user_id,
            "user_name": data["user_name"],
            "total_hours": round(data["total_hours"], 2),
            "days_worked": len(data["days_worked"]),
        })

    return {
        "total_entries": len(time_entries),
        "total_unique_workers": len(user_totals),
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "daily_summary": daily_summary,
        "user_summary": sorted(user_summary, key=lambda x: x["total_hours"], reverse=True),
    }


async def generate_labor_cost_report(
    db: AsyncSession, project_id: UUID, date_from: datetime, date_to: datetime
) -> dict:
    from sqlalchemy.orm import selectinload
    from app.models.timesheet import Timesheet

    result = await db.execute(
        select(Timesheet)
        .options(selectinload(Timesheet.user))
        .where(
            Timesheet.project_id == project_id,
            Timesheet.start_date >= date_from,
            Timesheet.end_date <= date_to,
            Timesheet.status == "approved",
        )
        .order_by(Timesheet.start_date)
    )
    timesheets = result.scalars().all()

    total_cost = 0.0
    total_hours = 0.0
    total_overtime_hours = 0.0
    user_breakdown = {}
    cost_items = []

    for timesheet in timesheets:
        user_id = str(timesheet.user_id)
        user_name = timesheet.user.full_name if timesheet.user else "Unknown"

        time_entries_result = await db.execute(
            select(TimeEntry).where(
                TimeEntry.user_id == timesheet.user_id,
                TimeEntry.project_id == project_id,
                TimeEntry.clock_in_time >= timesheet.start_date,
                TimeEntry.clock_in_time <= timesheet.end_date,
                TimeEntry.status == "completed",
            )
        )
        time_entries = list(time_entries_result.scalars().all())

        timesheet_hours = 0.0
        timesheet_overtime = 0.0
        for entry in time_entries:
            if entry.clock_out_time:
                total_time = (entry.clock_out_time - entry.clock_in_time).total_seconds() / 3600
                break_time = (entry.break_minutes or 0) / 60
                worked_hours = total_time - break_time
                timesheet_hours += worked_hours

        timesheet_cost = float(timesheet.total_cost or 0.0)
        total_cost += timesheet_cost
        total_hours += timesheet_hours

        if user_id not in user_breakdown:
            user_breakdown[user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "total_hours": 0.0,
                "total_cost": 0.0,
                "timesheets_count": 0,
            }

        user_breakdown[user_id]["total_hours"] += round(timesheet_hours, 2)
        user_breakdown[user_id]["total_cost"] += round(timesheet_cost, 2)
        user_breakdown[user_id]["timesheets_count"] += 1

        cost_items.append({
            "id": str(timesheet.id),
            "user_id": user_id,
            "user_name": user_name,
            "start_date": timesheet.start_date.isoformat(),
            "end_date": timesheet.end_date.isoformat(),
            "total_hours": round(timesheet_hours, 2),
            "total_cost": round(timesheet_cost, 2),
            "status": timesheet.status,
        })

    return {
        "total_cost": round(total_cost, 2),
        "total_hours": round(total_hours, 2),
        "total_timesheets": len(timesheets),
        "total_workers": len(user_breakdown),
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "user_breakdown": sorted(user_breakdown.values(), key=lambda x: x["total_cost"], reverse=True),
        "cost_items": cost_items,
    }


def generate_csv_export(data: list[dict]) -> str:
    if not data:
        return ""

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()
