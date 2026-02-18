import os

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import get_settings

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

STRINGS = {
    "welcome": {
        "en": {
            "subject": "Welcome to BuilderOps!",
            "greeting": "Welcome, {name}!",
            "message": "Your account has been created successfully. You can now manage construction projects, track equipment approvals, schedule inspections, and collaborate with your team.",
            "cta": "Go to Dashboard",
            "footer": "This is an automated message from BuilderOps.",
        },
        "he": {
            "subject": "!BuilderOps-ברוכים הבאים ל",
            "greeting": "!{name} ,ברוכים הבאים",
            "message": "החשבון שלך נוצר בהצלחה. כעת תוכל לנהל פרויקטי בנייה, לעקוב אחר אישורי ציוד, לתזמן בדיקות ולשתף פעולה עם הצוות שלך.",
            "cta": "עבור ללוח הבקרה",
            "footer": ".זוהי הודעה אוטומטית מ-BuilderOps",
        },
    },
    "password_reset": {
        "en": {
            "subject": "BuilderOps - Password Reset",
            "title": "Password Reset",
            "intro": "You requested a password reset for your BuilderOps account.",
            "cta": "Reset Password",
            "expires": "This link expires in 1 hour.",
            "ignore": "If you didn't request this, please ignore this email.",
            "footer": "This is an automated message from BuilderOps.",
        },
        "he": {
            "subject": "BuilderOps - איפוס סיסמה",
            "title": "איפוס סיסמה",
            "intro": ".בקשת איפוס סיסמה עבור חשבון BuilderOps שלך",
            "cta": "איפוס סיסמה",
            "expires": ".קישור זה יפוג תוך שעה",
            "ignore": ".אם לא ביקשת זאת, אנא התעלם מהודעה זו",
            "footer": ".זוהי הודעה אוטומטית מ-BuilderOps",
        },
    },
    "notification": {
        "en": {
            "project_label": "Project",
            "cta": "View in BuilderOps",
            "footer": "This is an automated notification from BuilderOps.",
        },
        "he": {
            "project_label": "פרויקט",
            "cta": "צפה ב-BuilderOps",
            "footer": "זוהי הודעה אוטומטית מ-BuilderOps.",
        },
    },
    "daily_summary": {
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
    },
}


def render_welcome_email(name: str, language: str, frontend_url: str) -> tuple[str, str]:
    s = STRINGS["welcome"].get(language, STRINGS["welcome"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    greeting = s["greeting"].format(name=name)
    strings = {**s, "greeting": greeting}

    template = env.get_template("welcome.html")
    html = template.render(
        strings=strings,
        frontend_url=frontend_url,
        lang=language,
        direction=direction,
        align=align,
    )
    return s["subject"], html


def render_password_reset_email(reset_url: str, language: str) -> tuple[str, str]:
    s = STRINGS["password_reset"].get(language, STRINGS["password_reset"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    template = env.get_template("password_reset.html")
    html = template.render(
        strings=s,
        reset_url=reset_url,
        lang=language,
        direction=direction,
        align=align,
    )
    return s["subject"], html


def render_rfi_email(rfi, frontend_url: str = "") -> tuple[str, str]:
    due_date = rfi.due_date.strftime("%Y-%m-%d") if rfi.due_date else "N/A"
    location = rfi.location or "N/A"
    drawing_ref = rfi.drawing_reference or "N/A"
    spec_ref = rfi.specification_reference or "N/A"

    if not frontend_url:
        frontend_url = get_settings().frontend_base_url

    template = env.get_template("rfi.html")
    html = template.render(
        rfi=rfi,
        is_response=False,
        due_date=due_date,
        location=location,
        drawing_ref=drawing_ref,
        spec_ref=spec_ref,
        frontend_url=frontend_url,
        lang="en",
        direction="ltr",
        align="left",
    )
    return f"RFI: {rfi.subject}", html


def render_rfi_response_email(rfi, response_text: str) -> tuple[str, str]:
    template = env.get_template("rfi.html")
    html = template.render(
        rfi=rfi,
        response_text=response_text,
        is_response=True,
        lang="en",
        direction="ltr",
        align="left",
    )
    return f"Re: {rfi.subject}", html


def render_daily_summary_email(
    summary: dict, project_name: str, language: str, frontend_url: str
) -> tuple[str, str]:
    s = STRINGS["daily_summary"].get(language, STRINGS["daily_summary"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    summary_date = summary["summary_date"]

    subject = s["subject"].format(project_name=project_name, date=summary_date)

    equipment = summary["equipment"]
    materials = summary["materials"]
    rfis = summary["rfis"]
    has_equip_materials = any(
        v != 0 for v in [*equipment.values(), *materials.values()]
    )
    has_rfis = any(v != 0 for v in rfis.values())

    template = env.get_template("daily_summary.html")
    html = template.render(
        s=s,
        summary_date=summary_date,
        project_name=project_name,
        frontend_url=frontend_url,
        audit_entries=summary["audit_entries"],
        equipment=equipment,
        materials=materials,
        has_equip_materials=has_equip_materials,
        inspections=summary["inspections"],
        rfis=rfis,
        has_rfis=has_rfis,
        pending=summary["pending_approvals"],
        meetings=summary["upcoming_meetings"],
        progress=summary["overall_progress"],
        lang=language,
        direction=direction,
        align=align,
    )
    return subject, html


def render_notification_email(
    title: str, message: str, action_url: str, project_name: str = "", language: str = "en"
) -> tuple[str, str]:
    s = STRINGS["notification"].get(language, STRINGS["notification"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    template = env.get_template("notification.html")
    html = template.render(
        title=title,
        message=message,
        action_url=action_url,
        project_name=project_name,
        strings=s,
        lang=language,
        direction=direction,
        align=align,
    )
    return title, html
