import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.notification import Notification
from app.models.notification_interaction import InteractionType, NotificationInteraction
from app.models.project import ProjectMember, UserRole
from app.models.user import User
from app.services.email_renderer import render_notification_email
from app.services.email_service import EmailService
from app.services.notification_priority_service import calculate_notification_urgency
from app.services.websocket_manager import manager as ws_manager

logger = logging.getLogger(__name__)


async def broadcast_notification(project_id: UUID, notification: Notification) -> None:
    try:
        await ws_manager.broadcast_to_project(
            str(project_id),
            {
                "type": "notification",
                "unread_count_delta": 1,
                "notification": {
                    "id": str(notification.id),
                    "category": notification.category,
                    "title": notification.title,
                    "message": notification.message,
                },
            },
        )
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)

        logger.error(
            "Failed to broadcast notification via WebSocket - "
            "Project ID: %s, Notification ID: %s, Category: %s, Title: %s, "
            "Error Type: %s, Message: %s",
            project_id, notification.id, notification.category, notification.title,
            error_type, error_message,
            exc_info=True
        )


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    context: Optional[dict] = None,
) -> Notification:
    urgency = await calculate_notification_urgency(
        db=db,
        category=category,
        entity_type=entity_type,
        user_id=user_id,
        context=context,
    )
    notification = Notification(
        user_id=user_id,
        category=category,
        urgency=urgency,
        title=title,
        message=message,
        related_entity_type=entity_type,
        related_entity_id=entity_id,
    )
    db.add(notification)
    await db.flush()
    if project_id:
        await broadcast_notification(project_id, notification)
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
    project_id: Optional[UUID] = None,
    context: Optional[dict] = None,
) -> None:
    await create_notification(
        db, user_id, category, title, message, entity_type, entity_id,
        project_id=project_id, context=context,
    )

    if email:
        try:
            service = EmailService()
            if service.enabled:
                subject, html = render_notification_email(title, message, action_url, project_name, language)
                service.send_notification(to_email=email, subject=subject, body_html=html)
        except Exception as e:
            error_type = type(e).__name__
            http_status = getattr(e, 'status_code', 'N/A')
            error_message = str(e)

            logger.error(
                "Failed to send notification email - "
                "Recipient: %s, Category: %s, Title: %s, Entity: %s/%s, Project: %s, "
                "Error Type: %s, HTTP Status: %s, Message: %s",
                email, category, title, entity_type or 'None', entity_id or 'None',
                project_name or 'None', error_type, http_status, error_message,
                exc_info=True
            )


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
    project_id: Optional[UUID] = None,
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
                project_id=project_id,
            )
            return
    if contact.email:
        try:
            service = EmailService()
            if service.enabled:
                subject, html = render_notification_email(title, message, action_url, project_name)
                service.send_notification(to_email=contact.email, subject=subject, body_html=html)
        except Exception as e:
            error_type = type(e).__name__
            http_status = getattr(e, 'status_code', 'N/A')
            error_message = str(e)

            logger.error(
                "Failed to send notification email to contact - "
                "Recipient: %s, Contact ID: %s, Category: %s, Title: %s, Entity: %s/%s, Project: %s, "
                "Error Type: %s, HTTP Status: %s, Message: %s",
                contact.email, contact.id, category, title, entity_type or 'None', entity_id or 'None',
                project_name or 'None', error_type, http_status, error_message,
                exc_info=True
            )


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
            project_id=project_id,
        )


async def track_notification_interaction(
    db: AsyncSession,
    notification_id: UUID,
    user_id: UUID,
    interaction_type: str,
) -> NotificationInteraction:
    """
    Track user interaction with a notification.

    Args:
        db: Database session
        notification_id: Notification ID
        user_id: User ID
        interaction_type: Type of interaction (viewed, clicked, dismissed, acted_upon)

    Returns:
        Created NotificationInteraction instance
    """
    try:
        interaction = NotificationInteraction(
            notification_id=notification_id,
            user_id=user_id,
            interaction_type=interaction_type,
        )
        db.add(interaction)
        await db.flush()
        return interaction
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)

        logger.error(
            "Failed to track notification interaction - "
            "Notification ID: %s, User ID: %s, Interaction Type: %s, "
            "Error Type: %s, Message: %s",
            notification_id, user_id, interaction_type,
            error_type, error_message,
            exc_info=True
        )
        raise
