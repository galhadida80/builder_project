import os
from datetime import datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models.inspection import Inspection

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

STRINGS = {
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


def generate_inspections_report_pdf(inspections: list[Inspection], project) -> bytes:
    s = STRINGS
    today = datetime.utcnow().strftime("%d/%m/%Y")

    inspection_items = [build_inspection_context(insp, s) for insp in inspections]

    template = env.get_template("inspections_report.html")
    html_content = template.render(
        s=s,
        direction="rtl",
        align="right",
        project_name=project.name,
        project_code=getattr(project, "code", ""),
        report_date=today,
        total_count=len(inspections),
        inspections=inspection_items,
    )

    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes
