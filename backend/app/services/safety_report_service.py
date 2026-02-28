import base64
import logging
from datetime import datetime
from uuid import UUID

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.models.file import File
from app.models.near_miss import NearMiss
from app.models.project import Project
from app.models.safety_incident import SafetyIncident
from app.models.safety_training import SafetyTraining
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
    "he": {
        "report_title": "דוח ציות בטיחות",
        "kpi_summary": "סיכום נתוני בטיחות",
        "total_incidents": "סה\"כ אירועי בטיחות",
        "total_near_misses": "סה\"כ כמעט תאונות",
        "critical_incidents": "אירועים קריטיים",
        "training_compliance": "ציות הדרכות",
        "incidents_section": "אירועי בטיחות",
        "near_misses_section": "כמעט תאונות",
        "trainings_section": "הדרכות בטיחות",
        "title": "כותרת",
        "description": "תיאור",
        "location": "מיקום",
        "occurred_at": "תאריך אירוע",
        "root_cause": "גורם שורש",
        "potential_consequence": "תוצאה פוטנציאלית",
        "anonymous": "אנונימי",
        "worker": "עובד",
        "training_type": "סוג הדרכה",
        "training_date": "תאריך הדרכה",
        "expiry_date": "תאריך תפוגה",
        "status": "סטטוס",
        "severities": {
            "low": "נמוך",
            "medium": "בינוני",
            "high": "גבוה",
            "critical": "קריטי",
        },
        "incident_statuses": {
            "open": "פתוח",
            "investigating": "בחקירה",
            "resolved": "נפתר",
            "closed": "סגור",
        },
        "training_statuses": {
            "valid": "תקף",
            "expired": "פג תוקף",
            "expiring_soon": "פג תוקף בקרוב",
        },
    },
    "en": {
        "report_title": "Safety Compliance Report",
        "kpi_summary": "Safety KPI Summary",
        "total_incidents": "Total Incidents",
        "total_near_misses": "Total Near Misses",
        "critical_incidents": "Critical Incidents",
        "training_compliance": "Training Compliance",
        "incidents_section": "Safety Incidents",
        "near_misses_section": "Near Misses",
        "trainings_section": "Safety Training Records",
        "title": "Title",
        "description": "Description",
        "location": "Location",
        "occurred_at": "Occurred At",
        "root_cause": "Root Cause",
        "potential_consequence": "Potential Consequence",
        "anonymous": "Anonymous",
        "worker": "Worker",
        "training_type": "Training Type",
        "training_date": "Training Date",
        "expiry_date": "Expiry Date",
        "status": "Status",
        "severities": {
            "low": "Low",
            "medium": "Medium",
            "high": "High",
            "critical": "Critical",
        },
        "incident_statuses": {
            "open": "Open",
            "investigating": "Investigating",
            "resolved": "Resolved",
            "closed": "Closed",
        },
        "training_statuses": {
            "valid": "Valid",
            "expired": "Expired",
            "expiring_soon": "Expiring Soon",
        },
    },
}

SEVERITY_COLORS = {
    "critical": "#B71C1C",
    "high": "#E53935",
    "medium": "#FB8C00",
    "low": "#43A047",
}

INCIDENT_STATUS_COLORS = {
    "open": "#E53935",
    "investigating": "#FB8C00",
    "resolved": "#43A047",
    "closed": "#757575",
}

TRAINING_STATUS_COLORS = {
    "valid": "#43A047",
    "expired": "#E53935",
    "expiring_soon": "#FB8C00",
}


async def load_incident_photos(
    db: AsyncSession, storage: StorageBackend, incident_ids: list[UUID], max_per_incident: int = 3
) -> dict[UUID, list[str]]:
    if not incident_ids:
        return {}

    result = await db.execute(
        select(File)
        .where(File.entity_type == "safety_incident", File.entity_id.in_(incident_ids))
        .order_by(File.uploaded_at)
    )
    files = result.scalars().all()

    photos_by_incident: dict[UUID, list[str]] = {}
    for f in files:
        if not f.file_type or not f.file_type.startswith("image/"):
            continue
        if f.entity_id not in photos_by_incident:
            photos_by_incident[f.entity_id] = []
        if len(photos_by_incident[f.entity_id]) >= max_per_incident:
            continue

        try:
            content = await storage.get_file(f.storage_path)
            base64_data = base64.b64encode(content).decode("utf-8")
            data_uri = f"data:{f.file_type};base64,{base64_data}"
            photos_by_incident[f.entity_id].append(data_uri)
        except Exception as e:
            logger.warning(f"Failed to load photo {f.id}: {e}")

    return photos_by_incident


async def generate_safety_compliance_report(
    db: AsyncSession,
    storage: StorageBackend,
    project_id: UUID,
    language: str = "he",
) -> bytes:
    s = STRINGS.get(language, STRINGS["he"])
    direction = "rtl" if language == "he" else "ltr"

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one()

    incidents_result = await db.execute(
        select(SafetyIncident)
        .where(SafetyIncident.project_id == project_id)
        .order_by(SafetyIncident.occurred_at.desc())
    )
    incidents = incidents_result.scalars().all()

    near_misses_result = await db.execute(
        select(NearMiss)
        .where(NearMiss.project_id == project_id)
        .order_by(NearMiss.occurred_at.desc())
    )
    near_misses = near_misses_result.scalars().all()

    trainings_result = await db.execute(
        select(SafetyTraining)
        .where(SafetyTraining.project_id == project_id)
        .order_by(SafetyTraining.training_date.desc())
    )
    trainings = trainings_result.scalars().all()

    incident_ids = [i.id for i in incidents]
    photos_map = await load_incident_photos(db, storage, incident_ids, max_per_incident=3)

    incidents_data = [
        {
            "number": inc.incident_number,
            "title": inc.title,
            "description": inc.description,
            "location": inc.location or "-",
            "occurred_at": inc.occurred_at.strftime("%Y-%m-%d %H:%M") if inc.occurred_at else "-",
            "root_cause": inc.root_cause or "-",
            "severity": s["severities"].get(inc.severity, inc.severity),
            "severity_color": SEVERITY_COLORS.get(inc.severity, "#94A3B8"),
            "status": s["incident_statuses"].get(inc.status, inc.status),
            "status_color": INCIDENT_STATUS_COLORS.get(inc.status, "#94A3B8"),
            "photos": photos_map.get(inc.id, []),
        }
        for inc in incidents
    ]

    near_misses_data = [
        {
            "number": nm.near_miss_number,
            "title": nm.title,
            "description": nm.description,
            "potential_consequence": nm.potential_consequence or "-",
            "severity": s["severities"].get(nm.severity, nm.severity),
            "severity_color": SEVERITY_COLORS.get(nm.severity, "#94A3B8"),
            "is_anonymous": nm.is_anonymous,
        }
        for nm in near_misses
    ]

    trainings_data = [
        {
            "worker": t.worker.contact_name if t.worker else "-",
            "training_type": t.training_type,
            "training_date": t.training_date.strftime("%Y-%m-%d") if t.training_date else "-",
            "expiry_date": t.expiry_date.strftime("%Y-%m-%d") if t.expiry_date else "-",
            "status": s["training_statuses"].get(t.status, t.status),
            "status_color": TRAINING_STATUS_COLORS.get(t.status, "#94A3B8"),
        }
        for t in trainings
    ]

    critical_incidents = sum(1 for i in incidents if i.severity == "critical")
    valid_trainings = sum(1 for t in trainings if t.status == "valid")
    training_compliance = round((valid_trainings / len(trainings) * 100) if trainings else 0)

    kpi = {
        "total_incidents": len(incidents),
        "total_near_misses": len(near_misses),
        "critical_incidents": critical_incidents,
        "training_compliance": training_compliance,
    }

    template = env.get_template("safety_compliance_report.html")
    html_content = template.render(
        s=s,
        direction=direction,
        report_date=utcnow().strftime("%Y-%m-%d"),
        project_name=project.name,
        project_code=project.project_code or "",
        kpi=kpi,
        incidents=incidents_data,
        near_misses=near_misses_data,
        trainings=trainings_data,
    )

    pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
    return pdf_bytes
