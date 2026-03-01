import os
from datetime import date, timedelta
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from weasyprint import HTML

from app.models.permit import Permit, PermitStatus, PermitType
from app.utils import utcnow

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

STRINGS = {
    "he": {
        "report_title": "דוח תאימות היתרים",
        "total_permits": "היתרים",
        "no_permits": "לא נמצאו היתרים",
        "compliance_status": "סטטוס תאימות",
        "compliance_good": "תקין",
        "compliance_warning": "דורש תשומת לב",
        "compliance_critical": "קריטי",
        "expiring_soon": "פג תוקף בקרוב",
        "expired_permits": "היתרים שפג תוקפם",
        "missing_permits": "היתרים חסרים",
        "permit_type": "סוג היתר",
        "permit_number": "מספר היתר",
        "status": "סטטוס",
        "issuing_authority": "גוף מנפיק",
        "application_date": "תאריך הגשה",
        "approval_date": "תאריך אישור",
        "expiration_date": "תאריך תפוגה",
        "days_until_expiry": "ימים לתפוגה",
        "conditions": "תנאים",
        "notes": "הערות",
        "permit_types": {
            "building_permit": "היתר בנייה",
            "occupancy_certificate": "טופס 4",
            "completion_certificate": "טופס 5",
            "environmental_permit": "היתר סביבתי",
            "fire_safety_approval": "אישור כיבוי אש",
        },
        "statuses": {
            "not_applied": "לא הוגש",
            "applied": "הוגש",
            "under_review": "בבדיקה",
            "approved": "אושר",
            "conditional": "מותנה",
            "rejected": "נדחה",
            "expired": "פג תוקף",
        },
    },
    "en": {
        "report_title": "Permit Compliance Report",
        "total_permits": "Permits",
        "no_permits": "No permits found",
        "compliance_status": "Compliance Status",
        "compliance_good": "Good",
        "compliance_warning": "Needs Attention",
        "compliance_critical": "Critical",
        "expiring_soon": "Expiring Soon",
        "expired_permits": "Expired Permits",
        "missing_permits": "Missing Permits",
        "permit_type": "Permit Type",
        "permit_number": "Permit Number",
        "status": "Status",
        "issuing_authority": "Issuing Authority",
        "application_date": "Application Date",
        "approval_date": "Approval Date",
        "expiration_date": "Expiration Date",
        "days_until_expiry": "Days Until Expiry",
        "conditions": "Conditions",
        "notes": "Notes",
        "permit_types": {
            "building_permit": "Building Permit",
            "occupancy_certificate": "Occupancy Certificate (Tofes 4)",
            "completion_certificate": "Completion Certificate (Tofes 5)",
            "environmental_permit": "Environmental Permit",
            "fire_safety_approval": "Fire Safety Approval",
        },
        "statuses": {
            "not_applied": "Not Applied",
            "applied": "Applied",
            "under_review": "Under Review",
            "approved": "Approved",
            "conditional": "Conditional",
            "rejected": "Rejected",
            "expired": "Expired",
        },
    },
}

STATUS_COLORS = {
    "not_applied": "#94A3B8",
    "applied": "#3B82F6",
    "under_review": "#F59E0B",
    "approved": "#10B981",
    "conditional": "#F97316",
    "rejected": "#EF4444",
    "expired": "#DC2626",
}


def calculate_compliance_status(permits: list[Permit]) -> dict:
    expired_count = 0
    expiring_soon_count = 0
    missing_count = 0
    today = date.today()
    warning_threshold = today + timedelta(days=30)

    all_permit_types = set(pt.value for pt in PermitType)
    existing_types = set(p.permit_type for p in permits if p.status == PermitStatus.APPROVED.value)
    missing_types = all_permit_types - existing_types

    for permit in permits:
        if permit.status == PermitStatus.EXPIRED.value:
            expired_count += 1
        elif permit.expiration_date and permit.status == PermitStatus.APPROVED.value:
            if permit.expiration_date < today:
                expired_count += 1
            elif permit.expiration_date <= warning_threshold:
                expiring_soon_count += 1

    missing_count = len(missing_types)

    if expired_count > 0 or missing_count > 0:
        status = "critical"
        color = "#DC2626"
    elif expiring_soon_count > 0:
        status = "warning"
        color = "#F97316"
    else:
        status = "good"
        color = "#10B981"

    return {
        "status": status,
        "color": color,
        "expired_count": expired_count,
        "expiring_soon_count": expiring_soon_count,
        "missing_count": missing_count,
        "missing_types": list(missing_types),
    }


def build_permit_context(permit: Permit, strings: dict) -> dict:
    s = strings
    today = date.today()

    days_until_expiry = None
    if permit.expiration_date:
        delta = (permit.expiration_date - today).days
        days_until_expiry = delta if delta >= 0 else f"{abs(delta)}-"

    return {
        "permit_type_label": s["permit_types"].get(permit.permit_type, permit.permit_type),
        "permit_number": permit.permit_number or "-",
        "status_label": s["statuses"].get(permit.status, permit.status),
        "status_color": STATUS_COLORS.get(permit.status, "#94A3B8"),
        "issuing_authority": permit.issuing_authority or "-",
        "application_date": permit.application_date.strftime("%d/%m/%Y") if permit.application_date else "-",
        "approval_date": permit.approval_date.strftime("%d/%m/%Y") if permit.approval_date else "-",
        "expiration_date": permit.expiration_date.strftime("%d/%m/%Y") if permit.expiration_date else "-",
        "days_until_expiry": days_until_expiry,
        "conditions": permit.conditions,
        "notes": permit.notes,
    }


async def generate_permit_compliance_pdf(
    db: AsyncSession,
    project_id: UUID,
    project,
    language: str = "he",
) -> bytes:
    s = STRINGS.get(language, STRINGS["he"])
    direction = "rtl" if language == "he" else "ltr"
    align = "right" if language == "he" else "left"
    today = utcnow().strftime("%d/%m/%Y")

    result = await db.execute(
        select(Permit)
        .where(Permit.project_id == project_id)
        .options(selectinload(Permit.created_by))
        .order_by(Permit.expiration_date.asc().nullslast())
    )
    permits = result.scalars().all()

    permit_items = [build_permit_context(permit, s) for permit in permits]
    compliance = calculate_compliance_status(permits)

    compliance_status_label = s[f"compliance_{compliance['status']}"]

    missing_permits_labels = [
        s["permit_types"].get(pt, pt) for pt in compliance["missing_types"]
    ]

    template = env.get_template("permit_compliance_report.html")
    html_content = template.render(
        s=s,
        direction=direction,
        align=align,
        project_name=project.name,
        project_code="",
        report_date=today,
        total_count=len(permits),
        permits=permit_items,
        compliance_status=compliance_status_label,
        compliance_color=compliance["color"],
        expired_count=compliance["expired_count"],
        expiring_soon_count=compliance["expiring_soon_count"],
        missing_count=compliance["missing_count"],
        missing_permits=missing_permits_labels,
    )

    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes
