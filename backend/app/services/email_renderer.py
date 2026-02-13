import os

from jinja2 import Environment, FileSystemLoader, select_autoescape

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


def render_rfi_email(rfi) -> tuple[str, str]:
    due_date = rfi.due_date.strftime("%Y-%m-%d") if rfi.due_date else "N/A"
    location = rfi.location or "N/A"
    drawing_ref = rfi.drawing_reference or "N/A"

    template = env.get_template("rfi.html")
    html = template.render(
        rfi=rfi,
        is_response=False,
        due_date=due_date,
        location=location,
        drawing_ref=drawing_ref,
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
