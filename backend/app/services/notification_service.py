import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.notification import Notification
from app.models.project import ProjectMember, UserRole
from app.models.user import User
from app.services.email_renderer import render_notification_email
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        related_entity_type=entity_type,
        related_entity_id=entity_id,
    )
    db.add(notification)
    await db.flush()
    return notification


async def notify_user(
    db: AsyncSession,
    user_id: UUID,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    email: Optional[str] = None,
    action_url: str = "",
    project_name: str = "",
    language: str = "en",
) -> None:
    await create_notification(db, user_id, category, title, message, entity_type, entity_id)

    if email:
        try:
            service = EmailService()
            if service.enabled:
                subject, html = render_notification_email(title, message, action_url, project_name, language)
                service.send_notification(to_email=email, subject=subject, body_html=html)
        except Exception:
            logger.exception("Failed to send notification email to %s", email)


async def notify_contact(
    db: AsyncSession,
    contact: Contact,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    action_url: str = "",
    project_name: str = "",
) -> None:
    if contact.user_id:
        result = await db.execute(select(User).where(User.id == contact.user_id))
        user = result.scalar_one_or_none()
        if user:
            await notify_user(
                db, user.id, category, title, message,
                entity_type, entity_id,
                email=user.email, action_url=action_url,
                project_name=project_name, language=user.language or "en",
            )
            return
    if contact.email:
        try:
            service = EmailService()
            if service.enabled:
                subject, html = render_notification_email(title, message, action_url, project_name)
                service.send_notification(to_email=contact.email, subject=subject, body_html=html)
        except Exception:
            logger.exception("Failed to send notification email to contact %s", contact.email)


async def notify_project_admins(
    db: AsyncSession,
    project_id: UUID,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    action_url: str = "",
    project_name: str = "",
) -> None:
    result = await db.execute(
        select(User)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.role == UserRole.PROJECT_ADMIN.value,
            User.is_active == True,
        )
    )
    admins = result.scalars().all()
    for admin in admins:
        await notify_user(
            db, admin.id, category, title, message,
            entity_type, entity_id,
            email=admin.email, action_url=action_url,
            project_name=project_name, language=admin.language or "en",
        )
