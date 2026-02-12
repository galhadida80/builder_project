from datetime import date


STRINGS = {
    "en": {
        "subject": "Daily Summary - {project_name} ({date})",
        "title": "Daily Work Summary",
        "project": "Project",
        "date": "Date",
        "activity_overview": "Activity Overview",
        "entity_type": "Entity",
        "action": "Action",
        "count": "Count",
        "equipment_materials": "Equipment & Materials",
        "equipment": "Equipment",
        "materials": "Materials",
        "created": "Created",
        "approved": "Approved",
        "rejected": "Rejected",
        "inspections": "Inspections",
        "completed": "Completed",
        "new_findings": "New Findings",
        "rfis": "RFIs",
        "opened": "Opened",
        "answered": "Answered",
        "closed": "Closed",
        "overdue": "Overdue",
        "pending_approvals": "Pending Approvals",
        "equipment_pending": "Equipment submissions",
        "material_pending": "Material submissions",
        "total_pending": "Total pending",
        "upcoming_meetings": "Upcoming Meetings (7 days)",
        "meeting_type": "Type",
        "scheduled": "Scheduled",
        "location": "Location",
        "project_progress": "Project Progress",
        "view_in_app": "View in BuilderOps",
        "no_meetings": "No upcoming meetings",
        "footer": "This is an automated daily summary from BuilderOps.",
    },
    "he": {
        "subject": "סיכום יומי - {project_name} ({date})",
        "title": "סיכום עבודה יומי",
        "project": "פרויקט",
        "date": "תאריך",
        "activity_overview": "סקירת פעילות",
        "entity_type": "ישות",
        "action": "פעולה",
        "count": "כמות",
        "equipment_materials": "ציוד וחומרים",
        "equipment": "ציוד",
        "materials": "חומרים",
        "created": "נוצרו",
        "approved": "אושרו",
        "rejected": "נדחו",
        "inspections": "בדיקות",
        "completed": "הושלמו",
        "new_findings": "ממצאים חדשים",
        "rfis": "בקשות מידע",
        "opened": "נפתחו",
        "answered": "נענו",
        "closed": "נסגרו",
        "overdue": "באיחור",
        "pending_approvals": "אישורים ממתינים",
        "equipment_pending": "הגשות ציוד",
        "material_pending": "הגשות חומרים",
        "total_pending": "סה״כ ממתינים",
        "upcoming_meetings": "פגישות קרובות (7 ימים)",
        "meeting_type": "סוג",
        "scheduled": "מתוכנן",
        "location": "מיקום",
        "project_progress": "התקדמות פרויקט",
        "view_in_app": "צפה ב-BuilderOps",
        "no_meetings": "אין פגישות קרובות",
        "footer": "זהו סיכום יומי אוטומטי מ-BuilderOps.",
    },
}


def render_daily_summary_email(
    summary: dict, project_name: str, language: str, frontend_url: str
) -> tuple[str, str]:
    s = STRINGS.get(language, STRINGS["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    summary_date = summary["summary_date"]

    subject = s["subject"].format(project_name=project_name, date=summary_date)

    sections = []
    sections.append(_render_activity_overview(summary["audit_entries"], s))
    sections.append(_render_equipment_materials(summary["equipment"], summary["materials"], s))
    sections.append(_render_inspections(summary["inspections"], s))
    sections.append(_render_rfis(summary["rfis"], s))
    sections.append(_render_pending_approvals(summary["pending_approvals"], s))
    sections.append(_render_upcoming_meetings(summary["upcoming_meetings"], s))
    sections.append(_render_progress_bar(summary["overall_progress"], s))

    body_html = f"""<!DOCTYPE html>
<html lang="{language}" dir="{direction}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<tr><td style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:28px 32px;text-align:{align};">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">{s["title"]}</h1>
<p style="margin:8px 0 0;color:#bbdefb;font-size:14px;">{s["project"]}: <strong style="color:#ffffff;">{_esc(project_name)}</strong> &middot; {s["date"]}: {summary_date}</p>
</td></tr>

<tr><td style="padding:24px 32px;">
{"".join(sections)}
</td></tr>

<tr><td style="padding:0 32px 24px;text-align:center;">
<a href="{_esc(frontend_url)}" style="display:inline-block;background-color:#1565c0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;">{s["view_in_app"]}</a>
</td></tr>

<tr><td style="background-color:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e0e0e0;">
<p style="margin:0;color:#9e9e9e;font-size:12px;">{s["footer"]}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    return subject, body_html


def _render_section_header(title: str) -> str:
    return f'<h2 style="margin:20px 0 12px;font-size:16px;font-weight:600;color:#1565c0;border-bottom:2px solid #e3f2fd;padding-bottom:6px;">{title}</h2>'


def _render_activity_overview(audit_entries: list[dict], s: dict) -> str:
    if not audit_entries:
        return ""
    header = _render_section_header(s["activity_overview"])
    rows = ""
    for entry in audit_entries[:15]:
        rows += f'<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">{_esc(entry["entity_type"])}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">{_esc(entry["action"])}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;font-weight:600;">{entry["count"]}</td></tr>'
    return f"""{header}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:4px;">
<tr style="background-color:#f5f5f5;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#616161;">{s["entity_type"]}</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#616161;">{s["action"]}</th><th style="padding:8px 12px;text-align:center;font-size:12px;color:#616161;">{s["count"]}</th></tr>
{rows}
</table>"""


def _render_stat_cell(label: str, value: int, color: str = "#424242") -> str:
    return f'<td style="text-align:center;padding:8px;"><div style="font-size:22px;font-weight:700;color:{color};">{value}</div><div style="font-size:11px;color:#757575;margin-top:2px;">{label}</div></td>'


def _render_equipment_materials(equipment: dict, materials: dict, s: dict) -> str:
    if all(v == 0 for v in [*equipment.values(), *materials.values()]):
        return ""
    header = _render_section_header(s["equipment_materials"])
    return f"""{header}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
<tr><td colspan="3" style="font-size:13px;font-weight:600;color:#424242;padding:4px 8px;">{s["equipment"]}</td></tr>
<tr>{_render_stat_cell(s["created"], equipment["created"], "#1565c0")}{_render_stat_cell(s["approved"], equipment["approved"], "#2e7d32")}{_render_stat_cell(s["rejected"], equipment["rejected"], "#c62828")}</tr>
<tr><td colspan="3" style="font-size:13px;font-weight:600;color:#424242;padding:12px 8px 4px;">{s["materials"]}</td></tr>
<tr>{_render_stat_cell(s["created"], materials["created"], "#1565c0")}{_render_stat_cell(s["approved"], materials["approved"], "#2e7d32")}{_render_stat_cell(s["rejected"], materials["rejected"], "#c62828")}</tr>
</table>"""


def _render_inspections(inspections: dict, s: dict) -> str:
    if inspections["completed"] == 0 and inspections["new_findings"] == 0:
        return ""
    header = _render_section_header(s["inspections"])
    return f"""{header}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>{_render_stat_cell(s["completed"], inspections["completed"], "#2e7d32")}{_render_stat_cell(s["new_findings"], inspections["new_findings"], "#e65100")}</tr>
</table>"""


def _render_rfis(rfis: dict, s: dict) -> str:
    if all(v == 0 for v in rfis.values()):
        return ""
    header = _render_section_header(s["rfis"])
    overdue_color = "#c62828" if rfis["overdue"] > 0 else "#424242"
    return f"""{header}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>{_render_stat_cell(s["opened"], rfis["opened"], "#1565c0")}{_render_stat_cell(s["answered"], rfis["answered"], "#2e7d32")}{_render_stat_cell(s["closed"], rfis["closed"], "#616161")}{_render_stat_cell(s["overdue"], rfis["overdue"], overdue_color)}</tr>
</table>"""


def _render_pending_approvals(pending: dict, s: dict) -> str:
    if pending["total"] == 0:
        return ""
    header = _render_section_header(s["pending_approvals"])
    bg = "#fff8e1" if pending["total"] > 5 else "#f5f5f5"
    return f"""{header}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{bg};border-radius:4px;border:1px solid #ffe082;">
<tr><td style="padding:12px 16px;font-size:13px;">{s["equipment_pending"]}: <strong>{pending["equipment"]}</strong></td></tr>
<tr><td style="padding:0 16px 12px;font-size:13px;">{s["material_pending"]}: <strong>{pending["materials"]}</strong></td></tr>
<tr><td style="padding:0 16px 12px;font-size:14px;font-weight:700;color:#f57f17;">{s["total_pending"]}: {pending["total"]}</td></tr>
</table>"""


def _render_upcoming_meetings(meetings: list[dict], s: dict) -> str:
    header = _render_section_header(s["upcoming_meetings"])
    if not meetings:
        return f'{header}<p style="color:#9e9e9e;font-size:13px;">{s["no_meetings"]}</p>'
    rows = ""
    for m in meetings[:7]:
        rows += f'<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:500;">{_esc(m["title"])}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">{_esc(m.get("meeting_type", ""))}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">{m["scheduled_date"]}</td></tr>'
    return f"""{header}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:4px;">
<tr style="background-color:#f5f5f5;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#616161;">{s["upcoming_meetings"].split("(")[0].strip()}</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#616161;">{s["meeting_type"]}</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#616161;">{s["scheduled"]}</th></tr>
{rows}
</table>"""


def _render_progress_bar(progress: float, s: dict) -> str:
    pct = max(0, min(100, progress))
    color = "#2e7d32" if pct >= 60 else "#f57f17" if pct >= 30 else "#c62828"
    header = _render_section_header(s["project_progress"])
    return f"""{header}
<div style="background-color:#e0e0e0;border-radius:10px;height:20px;overflow:hidden;margin:8px 0;">
<div style="background-color:{color};height:100%;width:{pct}%;border-radius:10px;transition:width 0.3s;"></div>
</div>
<p style="text-align:center;font-size:14px;font-weight:700;color:{color};margin:4px 0 0;">{pct:.1f}%</p>"""


def _esc(text: str) -> str:
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
