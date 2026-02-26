import os
from datetime import date, datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import get_settings

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

ROLE_DISPLAY = {
    "en": {
        "project_admin": "Project Admin",
        "project_manager": "Project Manager",
        "engineer": "Engineer",
        "inspector": "Inspector",
        "viewer": "Viewer",
    },
    "he": {
        "project_admin": "מנהל פרויקט",
        "project_manager": "מנהל עבודה",
        "engineer": "מהנדס ביצוע",
        "inspector": "מפקח",
        "viewer": "צופה",
    },
}

ROLE_PERMISSIONS = {
    "en": {
        "project_admin": ["Full project management", "Team management", "Approve submissions", "View all data"],
        "project_manager": ["Create and edit resources", "Manage inspections", "Submit for approval", "View all data"],
        "engineer": ["Create RFIs", "Update equipment & materials", "Manage checklists", "View project data"],
        "inspector": ["Manage inspections", "Update checklists", "Add findings", "View project data"],
        "viewer": ["View all project data", "View reports and analytics"],
    },
    "he": {
        "project_admin": ["ניהול מלא של הפרויקט", "ניהול חברי צוות", "אישור הגשות", "צפייה בכל הנתונים"],
        "project_manager": ["יצירה ועריכת משאבים", "ניהול בדיקות", "הגשה לאישור", "צפייה בכל הנתונים"],
        "engineer": ["יצירת בקשות מידע (RFI)", "עדכון ציוד וחומרים", "ניהול צ'קליסטים", "צפייה בנתוני הפרויקט"],
        "inspector": ["ניהול בדיקות", "עדכון צ'קליסטים", "הוספת ממצאים", "צפייה בנתוני הפרויקט"],
        "viewer": ["צפייה בכל נתוני הפרויקט", "צפייה בדוחות ואנליטיקה"],
    },
}

STRINGS = {
    "welcome": {
        "en": {
            "subject": "Welcome to BuilderOps!",
            "greeting": "Welcome, {name}!",
            "subtitle": "Your account is ready",
            "message": "Your account has been created successfully. You can now manage construction projects, track equipment approvals, schedule inspections, and collaborate with your team.",
            "account_details": "Account Details",
            "name_label": "Name",
            "email_label": "Email",
            "joined_label": "Joined",
            "whats_next": "What's Next?",
            "features_title": "Key Features",
            "feat_dashboard": "Smart Dashboard",
            "feat_ai": "AI Assistant",
            "feat_mobile": "Any Device",
            "feat_reports": "Reports & Analytics",
            "cta": "Go to Dashboard",
            "need_help": "Need help?",
            "help_text": "Our support team is here for you.",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated message from BuilderOps.",
            "steps": [
                {"title": "Create your first project", "desc": "Set up a project with name, code, and location."},
                {"title": "Invite team members", "desc": "Add engineers, inspectors, and managers to your project."},
                {"title": "Configure equipment & materials", "desc": "Set up approval workflows for your submissions."},
                {"title": "Start managing inspections", "desc": "Create checklists and track quality control."},
            ],
        },
        "he": {
            "subject": "!ברוכים הבאים ל-BuilderOps",
            "greeting": "!{name} ,ברוכים הבאים",
            "subtitle": "החשבון שלך מוכן",
            "message": "החשבון שלך נוצר בהצלחה. כעת תוכל לנהל פרויקטי בנייה, לעקוב אחר אישורי ציוד, לתזמן בדיקות ולשתף פעולה עם הצוות שלך.",
            "account_details": "פרטי חשבון",
            "name_label": "שם",
            "email_label": "אימייל",
            "joined_label": "תאריך הצטרפות",
            "whats_next": "מה הצעד הבא?",
            "features_title": "יכולות מרכזיות",
            "feat_dashboard": "לוח בקרה חכם",
            "feat_ai": "עוזר AI",
            "feat_mobile": "גישה מכל מכשיר",
            "feat_reports": "דוחות ואנליטיקה",
            "cta": "עבור ללוח הבקרה",
            "need_help": "צריך עזרה?",
            "help_text": "צוות התמיכה שלנו כאן בשבילך.",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי הודעה אוטומטית מ-BuilderOps.",
            "steps": [
                {"title": "צור את הפרויקט הראשון שלך", "desc": "הגדר פרויקט עם שם, קוד ומיקום."},
                {"title": "הזמן את חברי הצוות", "desc": "הוסף מהנדסים, מפקחים ומנהלים לפרויקט."},
                {"title": "הגדר ציוד וחומרים", "desc": "הגדר תהליכי אישור להגשות שלך."},
                {"title": "התחל לנהל בדיקות", "desc": "צור צ'קליסטים ועקוב אחר בקרת איכות."},
            ],
        },
    },
    "password_reset": {
        "en": {
            "subject": "BuilderOps - Password Reset",
            "title": "Password Reset",
            "intro": "You requested a password reset for your BuilderOps account. Click the button below to set a new password.",
            "cta": "Reset Password",
            "expires": "This link expires in 1 hour.",
            "ignore": "If you didn't request this, please ignore this email. Your password will remain unchanged.",
            "security_title": "Security Tips",
            "security_tip1": "Never share your password with anyone.",
            "security_tip2": "Use a strong password with letters, numbers, and symbols.",
            "security_tip3": "If you didn't request this reset, your account may be at risk.",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated security message from BuilderOps.",
        },
        "he": {
            "subject": "BuilderOps - איפוס סיסמה",
            "title": "איפוס סיסמה",
            "intro": "ביקשת איפוס סיסמה עבור חשבון BuilderOps שלך. לחץ על הכפתור למטה כדי להגדיר סיסמה חדשה.",
            "cta": "איפוס סיסמה",
            "expires": "קישור זה יפוג תוך שעה.",
            "ignore": "אם לא ביקשת זאת, אנא התעלם מהודעה זו. הסיסמה שלך תישאר ללא שינוי.",
            "security_title": "טיפים לאבטחה",
            "security_tip1": "לעולם אל תשתף את הסיסמה שלך עם אף אחד.",
            "security_tip2": "השתמש בסיסמה חזקה עם אותיות, מספרים וסמלים.",
            "security_tip3": "אם לא ביקשת איפוס זה, ייתכן שחשבונך בסיכון.",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי הודעת אבטחה אוטומטית מ-BuilderOps.",
        },
    },
    "invitation": {
        "en": {
            "subject": "You're invited to join {project_name} on BuilderOps",
            "title": "Project Invitation",
            "subtitle": "You've been invited to join a construction project",
            "intro": "{invited_by} has invited you to join the project \"{project_name}\" on BuilderOps.",
            "invited_you": "invited you to this project",
            "project_details": "Project Details",
            "project_label": "Project Name",
            "code_label": "Project Code",
            "address_label": "Location",
            "description_label": "Description",
            "your_role": "Your Role",
            "feature_dashboard": "Dashboard",
            "feature_checklists": "Checklists",
            "feature_rfi": "RFI",
            "cta": "Accept Invitation & Join",
            "expires": "This invitation expires in 7 days.",
            "terms": "By joining, you agree to the terms of use and privacy policy.",
            "ignore": "If you don't recognize this invitation, you can safely ignore it.",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated invitation from BuilderOps.",
        },
        "he": {
            "subject": "הוזמנת להצטרף ל-{project_name} ב-BuilderOps",
            "title": "הזמנה לפרויקט",
            "subtitle": "הוזמנת להצטרף לפרויקט בנייה",
            "intro": "{invited_by} הזמין/ה אותך להצטרף לפרויקט \"{project_name}\" ב-BuilderOps.",
            "invited_you": "הזמין/ה אותך לפרויקט זה",
            "project_details": "פרטי הפרויקט",
            "project_label": "שם הפרויקט",
            "code_label": "קוד פרויקט",
            "address_label": "מיקום",
            "description_label": "תיאור",
            "your_role": "התפקיד שלך",
            "feature_dashboard": "לוח בקרה",
            "feature_checklists": "צ'קליסטים",
            "feature_rfi": "בקשות מידע",
            "cta": "קבל הזמנה והצטרף לפרויקט",
            "expires": "הזמנה זו תפוג בעוד 7 ימים.",
            "terms": "בהצטרפותך, אתה מסכים לתנאי השימוש ומדיניות הפרטיות.",
            "ignore": "אם אינך מזהה הזמנה זו, ניתן להתעלם ממנה בבטחה.",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי הזמנה אוטומטית מ-BuilderOps.",
        },
    },
    "meeting_invitation": {
        "en": {
            "subject": "Meeting Invitation: {title}",
            "title": "Meeting Invitation",
            "project_label": "Project",
            "greeting": "Hi {name}, you've been invited to a meeting.",
            "meeting_label": "Meeting",
            "organized_by": "Organized by",
            "date_label": "Date",
            "time_label": "Time",
            "location_label": "Location",
            "description_label": "Description",
            "rsvp_prompt": "Will you attend?",
            "accept": "Accept",
            "tentative": "Maybe",
            "decline": "Decline",
            "calendar_tip": "After responding, the meeting will appear in your BuilderOps calendar.",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated meeting invitation from BuilderOps.",
        },
        "he": {
            "subject": "הזמנה לפגישה: {title}",
            "title": "הזמנה לפגישה",
            "project_label": "פרויקט",
            "greeting": "שלום {name}, הוזמנת לפגישה.",
            "meeting_label": "פגישה",
            "organized_by": "מאורגן על ידי",
            "date_label": "תאריך",
            "time_label": "שעה",
            "location_label": "מיקום",
            "description_label": "תיאור",
            "rsvp_prompt": "האם תשתתף/י?",
            "accept": "אשתתף",
            "tentative": "אולי",
            "decline": "לא אשתתף",
            "calendar_tip": "לאחר המענה, הפגישה תופיע ביומן BuilderOps שלך.",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי הזמנת פגישה אוטומטית מ-BuilderOps.",
        },
    },
    "meeting_vote": {
        "en": {
            "subject": "Vote for Meeting Time: {title}",
            "title": "Choose a Meeting Time",
            "greeting": "Hi {name}, please vote for your preferred meeting time.",
            "meeting_label": "Meeting",
            "organized_by": "Organized by",
            "location_label": "Location",
            "description_label": "Description",
            "vote_prompt": "Select your preferred time slot:",
            "option": "Option",
            "vote_note": "Your vote helps the organizer pick the best time for everyone.",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated meeting scheduling request from BuilderOps.",
        },
        "he": {
            "subject": "הצבע על מועד לפגישה: {title}",
            "title": "בחר מועד לפגישה",
            "greeting": "שלום {name}, אנא הצבע על המועד המועדף עליך לפגישה.",
            "meeting_label": "פגישה",
            "organized_by": "מאורגן על ידי",
            "location_label": "מיקום",
            "description_label": "תיאור",
            "vote_prompt": "בחר את המועד המועדף:",
            "option": "אפשרות",
            "vote_note": "ההצבעה שלך עוזרת למארגן לבחור את הזמן הטוב ביותר לכולם.",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי בקשת תזמון פגישה אוטומטית מ-BuilderOps.",
        },
    },
    "notification": {
        "en": {
            "project_label": "Project",
            "cta": "View in BuilderOps",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated notification from BuilderOps.",
        },
        "he": {
            "project_label": "פרויקט",
            "cta": "צפה ב-BuilderOps",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי הודעה אוטומטית מ-BuilderOps.",
        },
    },
    "checklist_pdf": {
        "en": {
            "title": "Checklist Report",
            "generated": "Generated",
            "checklist_label": "Checklist",
            "unit_label": "Unit",
            "project_label": "Project",
            "status_label": "Status",
            "created_label": "Created",
            "progress_label": "Progress",
            "item_label": "Item",
            "details_label": "Details",
            "signature_label": "Signature",
            "footer": "Automated report",
            "statuses": {
                "pending": "Pending",
                "approved": "Approved",
                "rejected": "Rejected",
                "not_applicable": "N/A",
                "in_progress": "In Progress",
                "completed": "Completed",
            },
        },
        "he": {
            "title": "דוח צ'קליסט",
            "generated": "נוצר",
            "checklist_label": "צ'קליסט",
            "unit_label": "יחידה",
            "project_label": "פרויקט",
            "status_label": "סטטוס",
            "created_label": "נוצר",
            "progress_label": "התקדמות",
            "item_label": "פריט",
            "details_label": "פרטים",
            "signature_label": "חתימה",
            "footer": "דוח אוטומטי",
            "statuses": {
                "pending": "ממתין",
                "approved": "אושר",
                "rejected": "נדחה",
                "not_applicable": "לא רלוונטי",
                "in_progress": "בתהליך",
                "completed": "הושלם",
            },
        },
    },
    "checklist_notification": {
        "en": {
            "title": "Checklist Update",
            "subject_item": "Checklist item {status}: {checklist_name}",
            "subject_completed": "Checklist completed: {checklist_name}",
            "project_label": "Project",
            "checklist_label": "Checklist",
            "unit_label": "Unit",
            "section_label": "Section",
            "item_label": "Item",
            "status_label": "Status",
            "notes_label": "Notes",
            "attachments_label": "Attachments",
            "more_files": "more files",
            "status_approved": "Approved",
            "status_rejected": "Rejected",
            "status_completed": "Completed",
            "cta": "View Checklist",
            "footer": "BuilderOps - Construction Project Management",
        },
        "he": {
            "title": "עדכון צ'קליסט",
            "subject_item": "פריט צ'קליסט {status}: {checklist_name}",
            "subject_completed": "צ'קליסט הושלם: {checklist_name}",
            "project_label": "פרויקט",
            "checklist_label": "צ'קליסט",
            "unit_label": "יחידה",
            "section_label": "סעיף",
            "item_label": "פריט",
            "status_label": "סטטוס",
            "notes_label": "הערות",
            "attachments_label": "קבצים מצורפים",
            "more_files": "קבצים נוספים",
            "status_approved": "אושר",
            "status_rejected": "נדחה",
            "status_completed": "הושלם",
            "cta": "צפה בצ'קליסט",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
        },
    },
    "rfi": {
        "en": {
            "title": "Request for Information",
            "category": "Category",
            "priority": "Priority",
            "due_date": "Due Date",
            "location": "Location",
            "drawing_ref": "Drawing Ref",
            "spec_ref": "Spec Ref",
            "question": "Question",
            "attachments": "Attachments",
            "sent_by": "Sent by",
            "addressed_to": "Addressed to",
            "cta": "View & Respond to RFI",
            "reply_note": "Reply directly to this email — your response will be tracked automatically.",
            "reference": "Reference",
            "response": "Response",
            "footer": "BuilderOps. All rights reserved.",
            "priority_urgent": "Urgent",
            "priority_high": "High",
            "priority_medium": "Medium",
            "priority_low": "Low",
        },
        "he": {
            "title": "בקשת מידע (RFI)",
            "category": "קטגוריה",
            "priority": "עדיפות",
            "due_date": "תאריך יעד",
            "location": "מיקום",
            "drawing_ref": "הפניה לשרטוט",
            "spec_ref": "הפניה למפרט",
            "question": "שאלה",
            "attachments": "קבצים מצורפים",
            "sent_by": "נשלח על ידי",
            "addressed_to": "ממוען אל",
            "cta": "צפה והגב לבקשת מידע",
            "reply_note": "השב ישירות לאימייל זה — התשובה שלך תיעקב אוטומטית.",
            "reference": "הפניה",
            "response": "תשובה",
            "footer": "BuilderOps. כל הזכויות שמורות.",
            "priority_urgent": "דחוף",
            "priority_high": "גבוהה",
            "priority_medium": "בינונית",
            "priority_low": "נמוכה",
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
    "subcontractor_invite": {
        "en": {
            "subject": "You're invited to join {project_name} as a subcontractor",
            "title": "Subcontractor Invitation",
            "subtitle": "You've been invited to join a construction project as a subcontractor",
            "intro": "{invited_by} has invited you to join the project \"{project_name}\" as a subcontractor.",
            "trade_label": "Trade",
            "company_label": "Company",
            "message_label": "Message from the project manager",
            "cta": "Accept Invitation & Join",
            "expires": "This invitation expires in 7 days.",
            "ignore": "If you don't recognize this invitation, you can safely ignore it.",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated invitation from BuilderOps.",
        },
        "he": {
            "subject": "הוזמנת להצטרף ל-{project_name} כקבלן משנה",
            "title": "הזמנת קבלן משנה",
            "subtitle": "הוזמנת להצטרף לפרויקט בנייה כקבלן משנה",
            "intro": "{invited_by} הזמין/ה אותך להצטרף לפרויקט \"{project_name}\" כקבלן משנה.",
            "trade_label": "מקצוע",
            "company_label": "חברה",
            "message_label": "הודעה ממנהל הפרויקט",
            "cta": "קבל הזמנה והצטרף",
            "expires": "הזמנה זו תפוג בעוד 7 ימים.",
            "ignore": "אם אינך מזהה הזמנה זו, ניתן להתעלם ממנה בבטחה.",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי הזמנה אוטומטית מ-BuilderOps.",
        },
    },
    "approval_reminder": {
        "en": {
            "reminder_subject": "{type_label} Approval Pending: {name} ({days} days)",
            "escalation_subject": "ESCALATION: {type_label} Approval Overdue — {name} ({days} days)",
            "reminder_heading": "Approval Reminder",
            "escalation_heading": "Approval Escalation",
            "reminder_badge": "Reminder",
            "escalation_badge": "Escalation",
            "reminder_detail": "The {type_label} approval for \"{name}\" has been pending for {days} days. Please review and take action.",
            "escalation_detail": "The {type_label} approval for \"{name}\" has been pending for {days} days and requires immediate attention.",
            "type_label_equipment": "Equipment",
            "type_label_material": "Material",
            "field_type": "Type",
            "field_submission": "Submission",
            "field_project": "Project",
            "field_pending_days": "Pending Days",
            "field_submitted_by": "Submitted by",
            "action_note": "Please log in to review and process this approval.",
            "cta": "Review Submission",
            "footer": "BuilderOps - Construction Project Management",
            "auto_message": "This is an automated alert from BuilderOps.",
        },
        "he": {
            "reminder_subject": "אישור {type_label} ממתין: {name} ({days} ימים)",
            "escalation_subject": "אסקלציה: אישור {type_label} באיחור — {name} ({days} ימים)",
            "reminder_heading": "תזכורת אישור",
            "escalation_heading": "אסקלציית אישור",
            "reminder_badge": "תזכורת",
            "escalation_badge": "אסקלציה",
            "reminder_detail": "אישור ה{type_label} עבור \"{name}\" ממתין כבר {days} ימים. אנא סקור ופעל.",
            "escalation_detail": "אישור ה{type_label} עבור \"{name}\" ממתין כבר {days} ימים ודורש טיפול מיידי.",
            "type_label_equipment": "ציוד",
            "type_label_material": "חומרים",
            "field_type": "סוג",
            "field_submission": "הגשה",
            "field_project": "פרויקט",
            "field_pending_days": "ימי המתנה",
            "field_submitted_by": "הוגש על ידי",
            "action_note": "אנא התחבר כדי לסקור ולעבד אישור זה.",
            "cta": "סקירת הגשה",
            "footer": "BuilderOps - ניהול פרויקטי בנייה",
            "auto_message": "זוהי התראה אוטומטית מ-BuilderOps.",
        },
    },
}


def render_welcome_email(
    name: str,
    language: str,
    frontend_url: str,
    user_email: str = "",
) -> tuple[str, str]:
    s = STRINGS["welcome"].get(language, STRINGS["welcome"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    greeting = s["greeting"].format(name=name)
    strings = {**s, "greeting": greeting}
    join_date = date.today().strftime("%d/%m/%Y")

    template = env.get_template("welcome.html")
    html = template.render(
        strings=strings,
        frontend_url=frontend_url,
        user_name=name,
        user_email=user_email,
        join_date=join_date,
        steps=s["steps"],
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


def render_rfi_email(
    rfi,
    frontend_url: str = "",
    language: str = "en",
    sender_name: str = "",
    recipient_name: str = "",
) -> tuple[str, str]:
    s = STRINGS["rfi"].get(language, STRINGS["rfi"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    due_date = rfi.due_date.strftime("%d/%m/%Y") if rfi.due_date else "N/A"
    location = rfi.location or "N/A"
    drawing_ref = rfi.drawing_reference or "N/A"
    spec_ref = rfi.specification_reference or "N/A"

    if not frontend_url:
        frontend_url = get_settings().frontend_base_url

    template = env.get_template("rfi.html")
    html = template.render(
        rfi=rfi,
        strings=s,
        is_response=False,
        due_date=due_date,
        location=location,
        drawing_ref=drawing_ref,
        spec_ref=spec_ref,
        sender_name=sender_name,
        recipient_name=recipient_name,
        frontend_url=frontend_url,
        lang=language,
        direction=direction,
        align=align,
    )
    return f"RFI: {rfi.subject}", html


def render_rfi_response_email(rfi, response_text: str, language: str = "en") -> tuple[str, str]:
    s = STRINGS["rfi"].get(language, STRINGS["rfi"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    template = env.get_template("rfi.html")
    html = template.render(
        rfi=rfi,
        strings=s,
        response_text=response_text,
        is_response=True,
        sender_name="",
        recipient_name="",
        lang=language,
        direction=direction,
        align=align,
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


def render_invitation_email(
    project_name: str,
    role: str,
    invited_by: str,
    invite_url: str,
    language: str = "en",
    project_address: str = "",
    project_description: str = "",
) -> tuple[str, str]:
    s = STRINGS["invitation"].get(language, STRINGS["invitation"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    subject = s["subject"].format(project_name=project_name)
    intro = s["intro"].format(invited_by=invited_by, project_name=project_name)
    strings = {**s, "intro": intro}

    role_displays = ROLE_DISPLAY.get(language, ROLE_DISPLAY["en"])
    role_display = role_displays.get(role, role)

    role_perms = ROLE_PERMISSIONS.get(language, ROLE_PERMISSIONS["en"])
    permissions = role_perms.get(role, [])

    template = env.get_template("invitation.html")
    html = template.render(
        strings=strings,
        project_name=project_name,
        project_address=project_address,
        project_description=project_description,
        role=role,
        role_display=role_display,
        permissions=permissions,
        invited_by=invited_by,
        invite_url=invite_url,
        lang=language,
        direction=direction,
        align=align,
    )
    return subject, html


def render_subcontractor_invite_email(
    project_name: str,
    company_name: str,
    trade: str,
    invited_by: str,
    invite_url: str,
    language: str = "en",
    message: str = "",
) -> tuple[str, str]:
    s = STRINGS["subcontractor_invite"].get(language, STRINGS["subcontractor_invite"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    subject = s["subject"].format(project_name=project_name)
    intro = s["intro"].format(invited_by=invited_by, project_name=project_name)

    message_block = ""
    if message:
        message_block = f"""
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["message_label"]}</p>
        <p style="margin:0;font-size:14px;color:#334155;font-style:italic;">{message}</p>
      </td>
    </tr>"""

    body_html = f"""<!DOCTYPE html>
<html lang="{language}" dir="{direction}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#0F172A,#1E293B);padding:36px 36px 30px;">
  <p style="margin:0 0 20px;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#3B82F6;">BUILDEROPS</p>
  <h1 style="margin:0 0 10px;color:#ffffff;font-size:24px;font-weight:800;">{s["title"]}</h1>
  <p style="margin:0;color:#94A3B8;font-size:14px;">{s["subtitle"]}</p>
</td></tr>
<tr><td style="padding:36px;text-align:{align};">
  <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.7;">{intro}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:24px;">
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["company_label"]}</p>
        <p style="margin:0;font-size:15px;color:#0F172A;font-weight:700;">{company_name}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["trade_label"]}</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:600;">{trade}</p>
      </td>
    </tr>{message_block}
  </table>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="{invite_url}" style="display:inline-block;background:linear-gradient(135deg,#0369A1,#0EA5E9);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:700;box-shadow:0 4px 12px rgba(3,105,161,0.3);">{s["cta"]}</a>
  </div>
  <p style="margin:0 0 8px;font-size:13px;color:#64748B;text-align:center;">{s["expires"]}</p>
  <p style="margin:0;font-size:13px;color:#94A3B8;text-align:center;">{s["ignore"]}</p>
</td></tr>
<tr><td style="background-color:#F8FAFC;padding:24px 36px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="margin:0 0 8px;color:#94A3B8;font-size:12px;">{s["footer"]}</p>
  <p style="margin:0;color:#CBD5E1;font-size:11px;">{s["auto_message"]}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    return subject, body_html


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


def render_meeting_invitation_email(
    meeting_title: str,
    meeting_date: str,
    meeting_time: str,
    meeting_location: str,
    meeting_description: str,
    attendee_name: str,
    organizer_name: str,
    rsvp_token: str,
    frontend_url: str,
    language: str = "en",
    project_name: str = "",
) -> tuple[str, str]:
    s = STRINGS["meeting_invitation"].get(language, STRINGS["meeting_invitation"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    subject = s["subject"].format(title=meeting_title)

    template = env.get_template("meeting_invitation.html")
    html = template.render(
        strings=s,
        attendee_name=attendee_name,
        meeting_title=meeting_title,
        meeting_date=meeting_date,
        meeting_time=meeting_time,
        meeting_location=meeting_location,
        meeting_description=meeting_description,
        organizer_name=organizer_name,
        project_name=project_name,
        rsvp_token=rsvp_token,
        rsvp_base_url=frontend_url,
        lang=language,
        direction=direction,
        align=align,
    )
    return subject, html


SLOT_COLORS = ["#2563EB", "#7C3AED", "#0891B2"]


def render_meeting_vote_email(
    meeting_title: str,
    meeting_location: str,
    meeting_description: str,
    attendee_name: str,
    organizer_name: str,
    vote_token: str,
    time_slots: list,
    backend_url: str,
    language: str = "en",
) -> tuple[str, str]:
    s = STRINGS["meeting_vote"].get(language, STRINGS["meeting_vote"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    subject = s["subject"].format(title=meeting_title)

    template = env.get_template("meeting_vote.html")
    html = template.render(
        strings=s,
        attendee_name=attendee_name,
        meeting_title=meeting_title,
        meeting_location=meeting_location,
        meeting_description=meeting_description,
        organizer_name=organizer_name,
        vote_token=vote_token,
        vote_base_url=backend_url,
        time_slots=time_slots,
        slot_colors=SLOT_COLORS,
        lang=language,
        direction=direction,
        align=align,
    )
    return subject, html


def render_checklist_email(
    checklist_name: str,
    unit_identifier: str,
    status: str,
    project_name: str,
    action_url: str = "",
    section_name: str = "",
    item_name: str = "",
    notes: str = "",
    image_urls: list | None = None,
    message: str = "",
    is_completed: bool = False,
    language: str = "en",
) -> tuple[str, str]:
    s = STRINGS["checklist_notification"].get(language, STRINGS["checklist_notification"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    status_labels = {"approved": s["status_approved"], "rejected": s["status_rejected"], "completed": s["status_completed"]}
    status_display = status_labels.get(status, status)

    if is_completed:
        subject = s["subject_completed"].format(checklist_name=checklist_name)
    else:
        subject = s["subject_item"].format(status=status_display, checklist_name=checklist_name)

    template = env.get_template("checklist_notification.html")
    html = template.render(
        strings=s,
        checklist_name=checklist_name,
        unit_identifier=unit_identifier,
        status=status,
        project_name=project_name,
        action_url=action_url,
        section_name=section_name,
        item_name=item_name,
        notes=notes,
        image_urls=image_urls or [],
        message=message,
        lang=language,
        direction=direction,
        align=align,
    )
    return subject, html


def render_checklist_pdf_html(
    checklist_name: str,
    unit_identifier: str,
    project_name: str,
    instance_status: str,
    created_at: str,
    sections: list,
    progress_completed: int,
    progress_total: int,
    language: str = "en",
) -> str:
    s = STRINGS["checklist_pdf"].get(language, STRINGS["checklist_pdf"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    progress_percent = round(progress_completed / progress_total * 100) if progress_total > 0 else 0

    template = env.get_template("checklist_pdf.html")
    return template.render(
        s=s,
        checklist_name=checklist_name,
        unit_identifier=unit_identifier,
        project_name=project_name,
        instance_status=instance_status,
        created_at=created_at,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        sections=sections,
        progress_completed=progress_completed,
        progress_total=progress_total,
        progress_percent=progress_percent,
        year=datetime.now().year,
        lang=language,
        direction=direction,
        align=align,
    )


def render_approval_reminder_email(
    submission_name: str,
    submission_type: str,
    alert_type: str,
    pending_days: int,
    language: str = "en",
    project_name: str = "",
    submitted_by_name: str = "",
    frontend_url: str = "",
) -> tuple[str, str]:
    s = STRINGS["approval_reminder"].get(language, STRINGS["approval_reminder"]["en"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"

    type_label = s["type_label_equipment"] if submission_type == "equipment" else s["type_label_material"]

    if alert_type == "reminder":
        email_subject = s["reminder_subject"].format(type_label=type_label, name=submission_name, days=pending_days)
        accent_color = "#D97706"
        accent_bg = "#FFFBEB"
        badge_text = s["reminder_badge"]
        heading = s["reminder_heading"]
        detail = s["reminder_detail"].format(type_label=type_label.lower(), name=submission_name, days=pending_days)
    else:
        email_subject = s["escalation_subject"].format(type_label=type_label, name=submission_name, days=pending_days)
        accent_color = "#DC2626"
        accent_bg = "#FEF2F2"
        badge_text = s["escalation_badge"]
        heading = s["escalation_heading"]
        detail = s["escalation_detail"].format(type_label=type_label.lower(), name=submission_name, days=pending_days)

    body_html = f"""<!DOCTYPE html>
<html lang="{language}" dir="{direction}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06),0 8px 32px rgba(0,0,0,0.04);">
<tr><td style="background:linear-gradient(135deg,#0F172A,#1E293B);padding:36px 36px 30px;">
  <p style="margin:0 0 20px;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:#3B82F6;">BUILDEROPS</p>
  <h1 style="margin:0 0 10px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.3px;">{heading}</h1>
  <p style="margin:0;">
    <span style="display:inline-block;background:{accent_bg};color:{accent_color};padding:4px 14px;border-radius:8px;font-size:12px;font-weight:700;">{badge_text} &middot; {pending_days} {"ימים" if language == "he" else "days"}</span>
  </p>
</td></tr>
<tr><td style="padding:36px;text-align:{align};">
  <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.7;">{detail}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:24px;">
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["field_type"]}</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:600;">{type_label}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["field_submission"]}</p>
        <p style="margin:0;font-size:15px;color:#0F172A;font-weight:700;">{submission_name}</p>
      </td>
    </tr>"""

    if project_name:
        body_html += f"""
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["field_project"]}</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:500;">{project_name}</p>
      </td>
    </tr>"""

    if submitted_by_name:
        body_html += f"""
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #E2E8F0;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["field_submitted_by"]}</p>
        <p style="margin:0;font-size:14px;color:#334155;font-weight:500;">{submitted_by_name}</p>
      </td>
    </tr>"""

    body_html += f"""
    <tr>
      <td style="padding:14px 20px;">
        <p style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#94A3B8;">{s["field_pending_days"]}</p>
        <p style="margin:0;font-size:14px;color:{accent_color};font-weight:700;">{pending_days} {"ימים" if language == "he" else "days"}</p>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 24px;font-size:13px;color:#64748B;">{s["action_note"]}</p>"""

    if frontend_url:
        body_html += f"""
  <div style="text-align:center;">
    <a href="{frontend_url}" style="display:inline-block;background:linear-gradient(135deg,#0369A1,#0EA5E9);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:15px;font-weight:700;box-shadow:0 4px 12px rgba(3,105,161,0.3);">{s["cta"]}</a>
  </div>"""

    body_html += f"""
</td></tr>
<tr><td style="background-color:#F8FAFC;padding:24px 36px;text-align:center;border-top:1px solid #E2E8F0;">
  <p style="margin:0 0 8px;color:#94A3B8;font-size:12px;">{s["footer"]}</p>
  <p style="margin:0;color:#CBD5E1;font-size:11px;">{s["auto_message"]}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
    return email_subject, body_html
