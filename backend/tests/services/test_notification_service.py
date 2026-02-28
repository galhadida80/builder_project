import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationCategory, UrgencyLevel
from app.models.notification_interaction import InteractionType
from app.services.notification_service import (
    create_notification,
    track_notification_interaction,
)


@pytest.mark.asyncio
async def test_create_notification_with_urgency():
    """Test that create_notification calculates and sets urgency."""
    db = AsyncMock(spec=AsyncSession)
    user_id = uuid.uuid4()

    with patch("app.services.notification_service.calculate_notification_urgency") as mock_calc:
        mock_calc.return_value = UrgencyLevel.HIGH.value

        notification = await create_notification(
            db=db,
            user_id=user_id,
            category=NotificationCategory.APPROVAL.value,
            title="Test Approval",
            message="Test message",
            entity_type="approval",
            entity_id=uuid.uuid4(),
            context={"is_overdue": True},
        )

        mock_calc.assert_called_once()
        assert notification.urgency == UrgencyLevel.HIGH.value
        assert notification.category == NotificationCategory.APPROVAL.value
        assert notification.title == "Test Approval"
        db.add.assert_called_once()
        db.flush.assert_called_once()


@pytest.mark.asyncio
async def test_create_notification_without_context():
    """Test that create_notification works without context."""
    db = AsyncMock(spec=AsyncSession)
    user_id = uuid.uuid4()

    with patch("app.services.notification_service.calculate_notification_urgency") as mock_calc:
        mock_calc.return_value = UrgencyLevel.MEDIUM.value

        notification = await create_notification(
            db=db,
            user_id=user_id,
            category=NotificationCategory.UPDATE.value,
            title="Test Update",
            message="Test message",
        )

        mock_calc.assert_called_once_with(
            db=db,
            category=NotificationCategory.UPDATE.value,
            entity_type=None,
            user_id=user_id,
            context=None,
        )
        assert notification.urgency == UrgencyLevel.MEDIUM.value


@pytest.mark.asyncio
async def test_track_notification_interaction():
    """Test that track_notification_interaction creates interaction record."""
    db = AsyncMock(spec=AsyncSession)
    notification_id = uuid.uuid4()
    user_id = uuid.uuid4()

    interaction = await track_notification_interaction(
        db=db,
        notification_id=notification_id,
        user_id=user_id,
        interaction_type=InteractionType.CLICKED.value,
    )

    assert interaction.notification_id == notification_id
    assert interaction.user_id == user_id
    assert interaction.interaction_type == InteractionType.CLICKED.value
    db.add.assert_called_once()
    db.flush.assert_called_once()


@pytest.mark.asyncio
async def test_track_notification_interaction_error_handling():
    """Test that track_notification_interaction handles errors properly."""
    db = AsyncMock(spec=AsyncSession)
    db.add.side_effect = Exception("Database error")

    notification_id = uuid.uuid4()
    user_id = uuid.uuid4()

    with pytest.raises(Exception) as exc_info:
        await track_notification_interaction(
            db=db,
            notification_id=notification_id,
            user_id=user_id,
            interaction_type=InteractionType.VIEWED.value,
        )

    assert "Database error" in str(exc_info.value)
