import os
from datetime import date
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from weasyprint import HTML

from app.models.approval import ApprovalRequest
from app.models.equipment import Equipment
from app.models.inspection import Inspection
from app.models.material import Material
from app.models.meeting import Meeting
from app.models.rfi import RFI
from app.services.ai_report_generator import (
    generate_inspection_summary_narrative,
    generate_weekly_progress_narrative,
)
from app.services.chart_service import (
    generate_approval_trend_chart,
    generate_inspection_chart,
    generate_progress_chart,
    generate_rfi_aging_chart,
)
from app.utils import utcnow

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

STRINGS = {
    "he": {
        "report_title": "דוח ביקורות",
        "total_inspections": "ביקורות",
        "no_inspections": "לא נמצאו ביקורות",
        "scheduled_date": "תאריך מתוכנן",
        "completed_date": "תאריך השלמה",
        "created_by": "נוצר על ידי",
        "notes": "הערות",
        "findings": "ממצאים",
        "finding_title": "כותרת",
        "severity": "חומרה",
        "finding_status": "סטטוס",
        "location": "מיקום",
        "description": "תיאור",
        "statuses": {
            "pending": "ממתין",
            "in_progress": "בביצוע",
            "completed": "הושלם",
            "failed": "נכשל",
        },
        "severities": {
            "low": "נמוך",
            "medium": "בינוני",
            "high": "גבוה",
            "critical": "קריטי",
        },
        "finding_statuses": {
            "open": "פתוח",
            "resolved": "נפתר",
        },
    },
    "en": {
        "report_title": "Inspections Report",
        "total_inspections": "Inspections",
        "no_inspections": "No inspections found",
        "scheduled_date": "Scheduled Date",
        "completed_date": "Completed Date",
        "created_by": "Created By",
        "notes": "Notes",
        "findings": "Findings",
        "finding_title": "Title",
        "severity": "Severity",
        "finding_status": "Status",
        "location": "Location",
        "description": "Description",
        "statuses": {
            "pending": "Pending",
            "in_progress": "In Progress",
            "completed": "Completed",
            "failed": "Failed",
        },
        "severities": {
            "low": "Low",
            "medium": "Medium",
            "high": "High",
            "critical": "Critical",
        },
        "finding_statuses": {
            "open": "Open",
            "resolved": "Resolved",
        },
    },
}

STATUS_COLORS = {
    "pending": "#FB8C00",
    "in_progress": "#1E88E5",
    "completed": "#43A047",
    "failed": "#E53935",
}

SEVERITY_COLORS = {
    "critical": "#B71C1C",
    "high": "#E53935",
    "medium": "#FB8C00",
    "low": "#43A047",
}


def build_inspection_context(inspection: Inspection, strings: dict) -> dict:
    s = strings
    consultant_name = "-"
    if inspection.consultant_type:
        consultant_name = inspection.consultant_type.name

    created_by_name = "-"
    if inspection.created_by:
        created_by_name = inspection.created_by.full_name or inspection.created_by.email

    findings_data = []
    for f in (inspection.findings or []):
        findings_data.append({
            "title": f.title,
            "severity_label": s["severities"].get(f.severity, f.severity),
            "severity_color": SEVERITY_COLORS.get(f.severity, "#757575"),
            "status_label": s["finding_statuses"].get(f.status, f.status),
            "location": f.location,
            "description": f.description,
        })

    return {
        "consultant_name": consultant_name,
        "status_label": s["statuses"].get(inspection.status, inspection.status),
        "status_color": STATUS_COLORS.get(inspection.status, "#757575"),
        "current_stage": inspection.current_stage,
        "scheduled_date": inspection.scheduled_date.strftime("%d/%m/%Y %H:%M") if inspection.scheduled_date else "-",
        "completed_date": inspection.completed_date.strftime("%d/%m/%Y %H:%M") if inspection.completed_date else None,
        "created_by": created_by_name,
        "notes": inspection.notes,
        "findings": findings_data,
    }


def generate_inspections_report_pdf(inspections: list[Inspection], project, language: str = "he") -> bytes:
    s = STRINGS.get(language, STRINGS["he"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    today = utcnow().strftime("%d/%m/%Y")

    inspection_items = [build_inspection_context(insp, s) for insp in inspections]

    template = env.get_template("inspections_report.html")
    html_content = template.render(
        s=s,
        direction=direction,
        align=align,
        project_name=project.name,
        project_code="",
        report_date=today,
        total_count=len(inspections),
        inspections=inspection_items,
    )

    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes


async def generate_ai_weekly_report_html(
    db: AsyncSession,
    project_id: UUID,
    project,
    date_from: date,
    date_to: date,
    language: str = "he",
) -> str:
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    today = utcnow().strftime("%d/%m/%Y")

    ai_narrative = await generate_weekly_progress_narrative(
        db, project_id, date_from, date_to, language
    )

    equipment_count = await db.scalar(
        select(func.count(Equipment.id)).where(Equipment.project_id == project_id)
    )
    materials_count = await db.scalar(
        select(func.count(Material.id)).where(Material.project_id == project_id)
    )
    inspections_count = await db.scalar(
        select(func.count(Inspection.id)).where(
            and_(
                Inspection.project_id == project_id,
                Inspection.scheduled_date >= date_from,
                Inspection.scheduled_date <= date_to,
            )
        )
    )
    approvals_count = await db.scalar(
        select(func.count(ApprovalRequest.id)).where(ApprovalRequest.project_id == project_id)
    )
    rfis_count = await db.scalar(
        select(func.count(RFI.id)).where(RFI.project_id == project_id)
    )

    progress_chart = generate_progress_chart({
        "completed": equipment_count or 0,
        "pending": materials_count or 0,
    })

    inspection_stats = {}
    inspections = await db.scalars(
        select(Inspection).where(
            and_(
                Inspection.project_id == project_id,
                Inspection.scheduled_date >= date_from,
                Inspection.scheduled_date <= date_to,
            )
        )
    )
    for insp in inspections:
        status = insp.status or "pending"
        inspection_stats[status] = inspection_stats.get(status, 0) + 1

    inspection_chart = generate_inspection_chart(inspection_stats) if inspection_stats else None

    photos = []

    template = env.get_template("weekly_progress_report.html")
    html_content = template.render(
        direction=direction,
        align=align,
        project_name=project.name,
        report_date=today,
        date_from=date_from.strftime("%d/%m/%Y"),
        date_to=date_to.strftime("%d/%m/%Y"),
        narrative=ai_narrative,
        equipment_count=equipment_count or 0,
        materials_count=materials_count or 0,
        inspections_count=inspections_count or 0,
        approvals_count=approvals_count or 0,
        rfis_count=rfis_count or 0,
        progress_chart=progress_chart,
        inspection_chart=inspection_chart,
        photos=photos,
        language=language,
    )

    return html_content


async def generate_ai_weekly_report_pdf(
    db: AsyncSession,
    project_id: UUID,
    project,
    date_from: date,
    date_to: date,
    language: str = "he",
) -> bytes:
    html_content = await generate_ai_weekly_report_html(
        db, project_id, project, date_from, date_to, language
    )
    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes


async def generate_ai_inspection_summary_pdf(
    db: AsyncSession,
    project_id: UUID,
    project,
    date_from: date,
    date_to: date,
    language: str = "he",
) -> bytes:
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    today = utcnow().strftime("%d/%m/%Y")

    ai_summary = await generate_inspection_summary_narrative(
        db, project_id, date_from, date_to, language
    )

    inspections = await db.scalars(
        select(Inspection)
        .where(
            and_(
                Inspection.project_id == project_id,
                Inspection.scheduled_date >= date_from,
                Inspection.scheduled_date <= date_to,
            )
        )
        .options(
            selectinload(Inspection.consultant_type),
            selectinload(Inspection.created_by),
            selectinload(Inspection.findings),
        )
    )
    inspections_list = list(inspections)

    inspection_stats = {}
    for insp in inspections_list:
        status = insp.status or "pending"
        inspection_stats[status] = inspection_stats.get(status, 0) + 1

    inspection_chart = generate_inspection_chart(inspection_stats) if inspection_stats else None

    total_findings = sum(len(insp.findings or []) for insp in inspections_list)
    critical_findings = sum(
        1 for insp in inspections_list for f in (insp.findings or []) if f.severity == "critical"
    )
    high_findings = sum(
        1 for insp in inspections_list for f in (insp.findings or []) if f.severity == "high"
    )

    findings_data = []
    s = STRINGS.get(language, STRINGS["he"])
    for insp in inspections_list:
        for f in (insp.findings or []):
            findings_data.append({
                "title": f.title,
                "severity_label": s["severities"].get(f.severity, f.severity),
                "severity_color": SEVERITY_COLORS.get(f.severity, "#757575"),
                "status_label": s["finding_statuses"].get(f.status, f.status),
                "location": f.location,
                "description": f.description,
            })

    photos = []

    template = env.get_template("inspection_summary_ai.html")
    html_content = template.render(
        direction=direction,
        align=align,
        project_name=project.name,
        report_date=today,
        date_from=date_from.strftime("%d/%m/%Y"),
        date_to=date_to.strftime("%d/%m/%Y"),
        summary=ai_summary,
        total_inspections=len(inspections_list),
        total_findings=total_findings,
        critical_findings=critical_findings,
        high_findings=high_findings,
        inspection_chart=inspection_chart,
        findings=findings_data,
        photos=photos,
        language=language,
    )

    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes
