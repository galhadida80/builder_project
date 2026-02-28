import logging
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.utils import utcnow

logger = logging.getLogger(__name__)


async def collect_project_digest(
    db: AsyncSession, project_id: UUID, since: datetime
) -> dict:
    result = await db.execute(
        select(Notification)
        .join(User, Notification.user_id == User.id)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(
            ProjectMember.project_id == project_id,
            Notification.created_at >= since,
        )
        .order_by(Notification.created_at.desc())
    )
    notifications = result.scalars().all()

    if not notifications:
        return {
            "has_events": False,
            "total_count": 0,
            "categories": {},
            "urgency_levels": {},
            "recent_items": [],
        }

    categories = {}
    urgency_levels = {}
    for n in notifications:
        cat = n.category or "general"
        urg = n.urgency or "medium"

        if cat not in categories:
            categories[cat] = {"count": 0, "items": []}
        categories[cat]["count"] += 1
        if len(categories[cat]["items"]) < 5:
            categories[cat]["items"].append({
                "title": n.title,
                "message": n.message,
                "urgency": urg,
                "entity_type": n.related_entity_type,
                "created_at": n.created_at.strftime("%d/%m/%Y %H:%M") if n.created_at else "",
            })

        if urg not in urgency_levels:
            urgency_levels[urg] = {"count": 0, "items": []}
        urgency_levels[urg]["count"] += 1
        if len(urgency_levels[urg]["items"]) < 5:
            urgency_levels[urg]["items"].append({
                "title": n.title,
                "message": n.message,
                "category": cat,
                "entity_type": n.related_entity_type,
                "created_at": n.created_at.strftime("%d/%m/%Y %H:%M") if n.created_at else "",
            })

    recent_items = []
    for n in notifications[:10]:
        recent_items.append({
            "title": n.title,
            "message": n.message,
            "category": n.category or "general",
            "urgency": n.urgency or "medium",
            "entity_type": n.related_entity_type,
            "created_at": n.created_at.strftime("%d/%m/%Y %H:%M") if n.created_at else "",
        })

    return {
        "has_events": True,
        "total_count": len(notifications),
        "categories": categories,
        "urgency_levels": urgency_levels,
        "recent_items": recent_items,
        "period_start": since.strftime("%d/%m/%Y"),
        "period_end": utcnow().strftime("%d/%m/%Y"),
    }


async def should_send_digest(project: Project) -> bool:
    interval = project.notification_digest_interval_hours or 48
    if interval <= 0:
        return False
    now = utcnow()
    if project.last_digest_sent_at is None:
        return True
    next_send = project.last_digest_sent_at + timedelta(hours=interval)
    return now >= next_send
