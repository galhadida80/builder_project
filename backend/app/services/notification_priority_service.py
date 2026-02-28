import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationCategory, UrgencyLevel
from app.models.notification_interaction import InteractionType, NotificationInteraction

logger = logging.getLogger(__name__)


async def calculate_notification_urgency(
    db: AsyncSession,
    category: str,
    entity_type: Optional[str] = None,
    user_id: Optional[UUID] = None,
    context: Optional[dict] = None,
) -> str:
    """
    Calculate notification urgency based on category, entity type, and user behavior.

    Args:
        db: Database session
        category: Notification category (approval, inspection, defect, update, general)
        entity_type: Type of related entity (approval, inspection, defect, etc.)
        user_id: User ID for behavior learning (optional)
        context: Additional context like overdue status, severity, etc.

    Returns:
        Urgency level string: critical, high, medium, or low
    """
    try:
        context = context or {}
        base_urgency = _get_base_urgency(category, entity_type, context)

        if user_id and entity_type:
            adjusted_urgency = await _adjust_urgency_by_behavior(
                db, user_id, category, entity_type, base_urgency
            )
            return adjusted_urgency

        return base_urgency
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)

        logger.error(
            "Failed to calculate notification urgency - "
            "Category: %s, Entity Type: %s, User ID: %s, "
            "Error Type: %s, Message: %s",
            category, entity_type or 'None', user_id or 'None',
            error_type, error_message,
            exc_info=True
        )
        return UrgencyLevel.MEDIUM.value


def _get_base_urgency(category: str, entity_type: Optional[str], context: dict) -> str:
    """Determine base urgency from category, entity type, and context."""
    is_overdue = context.get("is_overdue", False)
    is_safety_related = context.get("is_safety_related", False)
    severity = context.get("severity", "").lower()
    days_until_deadline = context.get("days_until_deadline")

    if is_safety_related or severity == "critical":
        return UrgencyLevel.CRITICAL.value

    if category == NotificationCategory.DEFECT.value:
        if severity in ["high", "critical"] or is_overdue:
            return UrgencyLevel.CRITICAL.value
        elif severity == "medium":
            return UrgencyLevel.HIGH.value
        else:
            return UrgencyLevel.MEDIUM.value

    if category == NotificationCategory.APPROVAL.value:
        if is_overdue:
            return UrgencyLevel.CRITICAL.value
        elif days_until_deadline is not None and days_until_deadline <= 1:
            return UrgencyLevel.HIGH.value
        else:
            return UrgencyLevel.MEDIUM.value

    if category == NotificationCategory.INSPECTION.value:
        if is_overdue or (days_until_deadline is not None and days_until_deadline <= 1):
            return UrgencyLevel.HIGH.value
        else:
            return UrgencyLevel.MEDIUM.value

    if category == NotificationCategory.UPDATE.value:
        return UrgencyLevel.MEDIUM.value

    if category == NotificationCategory.GENERAL.value:
        return UrgencyLevel.LOW.value

    return UrgencyLevel.MEDIUM.value


async def _adjust_urgency_by_behavior(
    db: AsyncSession,
    user_id: UUID,
    category: str,
    entity_type: str,
    base_urgency: str,
) -> str:
    """
    Adjust urgency based on user's historical interaction patterns.

    Users who frequently act on certain notification types get higher urgency for those types.
    Users who frequently dismiss certain types get lower urgency.
    """
    try:
        result = await db.execute(
            select(
                func.count(NotificationInteraction.id).label("total"),
                func.sum(
                    func.case(
                        (NotificationInteraction.interaction_type == InteractionType.ACTED_UPON.value, 1),
                        else_=0
                    )
                ).label("acted_upon"),
                func.sum(
                    func.case(
                        (NotificationInteraction.interaction_type == InteractionType.DISMISSED.value, 1),
                        else_=0
                    )
                ).label("dismissed"),
            )
            .select_from(NotificationInteraction)
            .join(
                NotificationInteraction.notification
            )
            .where(
                NotificationInteraction.user_id == user_id,
            )
        )
        row = result.one_or_none()

        if not row or row.total < 5:
            return base_urgency

        total = row.total
        acted_upon = row.acted_upon or 0
        dismissed = row.dismissed or 0

        action_rate = acted_upon / total if total > 0 else 0
        dismiss_rate = dismissed / total if total > 0 else 0

        urgency_levels = [
            UrgencyLevel.LOW.value,
            UrgencyLevel.MEDIUM.value,
            UrgencyLevel.HIGH.value,
            UrgencyLevel.CRITICAL.value,
        ]
        current_index = urgency_levels.index(base_urgency)

        if action_rate > 0.7 and current_index < len(urgency_levels) - 1:
            return urgency_levels[current_index + 1]

        if dismiss_rate > 0.7 and current_index > 0:
            return urgency_levels[current_index - 1]

        return base_urgency
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)

        logger.error(
            "Failed to adjust urgency by behavior - "
            "User ID: %s, Category: %s, Entity Type: %s, "
            "Error Type: %s, Message: %s",
            user_id, category, entity_type,
            error_type, error_message,
            exc_info=True
        )
        return base_urgency


async def should_send_notification(
    db: AsyncSession,
    user_id: UUID,
    category: str,
    urgency: str,
) -> bool:
    """
    Check if notification should be sent based on user preferences.

    Args:
        db: Database session
        user_id: User ID
        category: Notification category
        urgency: Calculated urgency level

    Returns:
        True if notification should be sent, False otherwise
    """
    try:
        from app.models.notification_preference import NotificationPreference

        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id,
                NotificationPreference.category == category,
            )
        )
        pref = result.scalar_one_or_none()

        if not pref:
            return True

        if not pref.enabled:
            return False

        urgency_levels = [
            UrgencyLevel.LOW.value,
            UrgencyLevel.MEDIUM.value,
            UrgencyLevel.HIGH.value,
            UrgencyLevel.CRITICAL.value,
        ]

        min_urgency_index = urgency_levels.index(pref.min_urgency_level)
        current_urgency_index = urgency_levels.index(urgency)

        return current_urgency_index >= min_urgency_index
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)

        logger.error(
            "Failed to check notification preferences - "
            "User ID: %s, Category: %s, Urgency: %s, "
            "Error Type: %s, Message: %s",
            user_id, category, urgency,
            error_type, error_message,
            exc_info=True
        )
        return True
