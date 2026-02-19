import base64
import logging
from datetime import datetime, timezone
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.models.defect import Defect
from app.models.file import File
from app.models.project import Project
from app.services.storage_service import StorageBackend
from app.utils import utcnow

logger = logging.getLogger(__name__)

TEMPLATES_DIR = __import__("os").path.join(
    __import__("os").path.dirname(__import__("os").path.dirname(__file__)), "templates"
)

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

STRINGS = {
    "report_title": "רשימת משימות",
    "total_tasks": "משימות",
    "defect_number": "ליקוי",
    "location": "מיקום",
    "building": "בניין",
    "floor": "קומה",
    "apartment": "דירה",
    "description": "תיאור",
    "reporter": "שם המדווח",
    "assignees": "אחראיים",
    "followup": "אחראי למעקב",
    "updated_at": "תאריך עדכון",
    "due_date": "תאריך יעד",
    "repeated_task": "משימה חוזרת",
    "photos": "תמונות",
    "no_defects": "לא נמצאו ליקויים",
    "page": "עמוד",
    "of": "מתוך",
    "defect_types": {
        "non_conformance": "אי התאמה",
        "safety": "בטיחות",
        "quality": "איכות",
        "other": "אחר",
    },
    "checklist": "צ'קליסט",
    "task_id": "מזהה משימה",
    "statuses": {
        "open": "לטיפול",
        "in_progress": "בטיפול",
        "resolved": "נפתר",
        "closed": "סגור",
    },
    "severities": {
        "low": "נמוך",
        "medium": "בינוני",
        "high": "גבוה",
        "critical": "קריטי",
    },
    "categories": {
        "concrete_structure": "שלד בטון",
        "wet_room_waterproofing": "איטום חדרים רטובים",
        "plaster": "טיח",
        "roof": "גג",
        "painting": "צביעה",
        "plumbing": "אינסטלציה",
        "flooring": "ריצוף",
        "fire_passage_sealing": "איטום מעברי אש",
        "roof_waterproofing": "איטום גגות",
        "building_general": "בניין",
        "moisture": "רטיבות",
        "waterproofing": "איטום",
        "hvac": "מיזוג אוויר",
        "lighting": "תאורה",
        "solar_system": "מערכת סולרית",
        "other": "אחר",
    },
}

STATUS_COLORS = {
    "open": "#E53935",
    "in_progress": "#FB8C00",
    "resolved": "#43A047",
    "closed": "#757575",
}

SEVERITY_COLORS = {
    "critical": "#B71C1C",
    "high": "#E53935",
    "medium": "#FB8C00",
    "low": "#43A047",
}


async def load_defect_photos(
    db: AsyncSession, storage: StorageBackend, defect_ids: list[UUID], max_per_defect: int = 3
) -> dict[UUID, list[str]]:
    if not defect_ids:
        return {}

    result = await db.execute(
        select(File)
        .where(File.entity_type == "defect", File.entity_id.in_(defect_ids))
        .order_by(File.uploaded_at)
    )
    files = result.scalars().all()

    photos_by_defect: dict[UUID, list[str]] = {}
    for f in files:
        if not f.file_type or not f.file_type.startswith("image/"):
            continue
        defect_photos = photos_by_defect.setdefault(f.entity_id, [])
        if len(defect_photos) >= max_per_defect:
            continue
        try:
            content = await storage.get_file_content(f.storage_path)
            mime = f.file_type or "image/jpeg"
            b64 = base64.b64encode(content).decode()
            defect_photos.append(f"data:{mime};base64,{b64}")
        except Exception:
            logger.warning("Failed to load photo %s for defect %s", f.id, f.entity_id)

    return photos_by_defect


def format_contact(contact) -> str:
    name = contact.contact_name
    if contact.company_name:
        return f"{name} • {contact.company_name}"
    return name


def build_defect_context(defect: Defect, strings: dict, photos: list[str]) -> dict:
    s = strings
    area = defect.area
    location_parts = []
    if area:
        location_parts.append(area.name or "")
        if area.floor_number is not None:
            location_parts.append(f"{s['floor']} {area.floor_number}")
        if hasattr(area, "area_code") and area.area_code:
            location_parts.append(f"{s['apartment']} {area.area_code}")

    assignee_labels = []
    if defect.assigned_contact:
        assignee_labels.append(format_contact(defect.assigned_contact))
    for da in defect.assignees:
        if da.contact:
            label = format_contact(da.contact)
            if label not in assignee_labels:
                assignee_labels.append(label)

    checklist_name = "-"
    if defect.checklist_instance and defect.checklist_instance.template:
        checklist_name = defect.checklist_instance.template.name

    return {
        "number": defect.defect_number,
        "status": s["statuses"].get(defect.status, defect.status),
        "status_color": STATUS_COLORS.get(defect.status, "#757575"),
        "defect_type": s["defect_types"].get(defect.defect_type, defect.defect_type),
        "category": s["categories"].get(defect.category, defect.category),
        "is_repeated": defect.is_repeated,
        "location": " • ".join(location_parts) if location_parts else "-",
        "description": defect.description or "-",
        "checklist": checklist_name,
        "reporter": format_contact(defect.reporter) if defect.reporter else "-",
        "assignees": ", ".join(assignee_labels) if assignee_labels else "-",
        "followup": format_contact(defect.followup_contact) if defect.followup_contact else "-",
        "updated_at": defect.updated_at.strftime("%H:%M %d/%m/%Y") if defect.updated_at else "-",
        "photos": photos,
    }


async def generate_defects_report_pdf(
    db: AsyncSession,
    defects: list[Defect],
    project: Project,
    storage: StorageBackend,
) -> bytes:
    s = STRINGS
    today = utcnow().strftime("%d/%m/%Y")

    defect_ids = [d.id for d in defects]
    photos_map = await load_defect_photos(db, storage, defect_ids)

    defect_items = [
        build_defect_context(d, s, photos_map.get(d.id, []))
        for d in defects
    ]

    template = env.get_template("defects_report.html")
    html_content = template.render(
        s=s,
        direction="rtl",
        align="right",
        project_name=project.name,
        project_code=getattr(project, "code", ""),
        report_date=today,
        total_count=len(defects),
        defects=defect_items,
    )

    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes
