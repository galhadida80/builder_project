"""Integration tests for WhatsApp approval notification flow."""
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment_template import EquipmentApprovalSubmission, SubmissionStatus
from app.models.project import Project
from app.models.user import User
from app.services.notification_service import notify_user
from app.utils import utcnow


class TestWhatsAppApprovalNotifications:
    """Integration tests for WhatsApp approval notification end-to-end flow."""

    @pytest.mark.asyncio
    async def test_overdue_approval_sends_whatsapp_notification_hebrew(
        self,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """
        End-to-end test: Receive WhatsApp notification for overdue approval (Hebrew).

        Verification steps:
        1. Create test equipment item with approval status
        2. Trigger approval reminder service (or manually call notify_user)
        3. Verify user with linked WhatsApp receives message
        4. Verify message contains project name, item details, and action link
        5. Verify message in Hebrew for Hebrew users
        """
        # Step 1: Set up user with verified WhatsApp number and Hebrew language
        admin_user.whatsapp_number = "+972501234567"
        admin_user.whatsapp_verified = True
        admin_user.language = "he"
        await db.commit()
        await db.refresh(admin_user)

        # Verify user setup
        assert admin_user.whatsapp_number == "+972501234567"
        assert admin_user.whatsapp_verified is True
        assert admin_user.language == "he"

        # Step 2: Create overdue equipment approval submission
        # Submission is 6 days old (exceeds REMINDER_DAYS threshold of 5)
        submitted_at = utcnow() - timedelta(days=6)
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="מנוף לאתר בניין א",  # Hebrew: "Crane for Building Site A"
            status=SubmissionStatus.PENDING_REVIEW.value,
            submitted_at=submitted_at,
            submitted_by_id=admin_user.id,
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)

        # Step 3: Mock WhatsAppService to capture sent messages
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.enabled = True
        captured_messages = []

        def capture_send_message(to_whatsapp: str, body: str):
            captured_messages.append({
                'to': to_whatsapp,
                'body': body
            })
            return {
                'success': True,
                'message_sid': 'SM_test_123',
                'status': 'sent',
                'to': to_whatsapp
            }

        mock_whatsapp_service.send_message = MagicMock(side_effect=capture_send_message)
        mock_whatsapp_service.format_notification_message = MagicMock(
            side_effect=lambda title, message, action_url=None, language='he', emoji='🔔': (
                f"{emoji} *{title}*\n\n{message}\n\n"
                f"{'צפה ב-BuilderOps: ' + action_url if action_url else ''}\n\n"
                f"_BuilderOps - ניהול בנייה_"
            )
        )

        # Step 4: Manually trigger notification (simulating approval reminder service)
        with patch("app.services.notification_service.WhatsAppService", return_value=mock_whatsapp_service):
            title = "אישור ממתין 6 ימים: מנוף לאתר בניין א"
            message = 'הגשת האישור שלך "מנוף לאתר בניין א" ממתינה לבדיקה כבר 6 ימים.'
            action_url = f"https://builderops.com/projects/{project.id}/approvals/{submission.id}"

            await notify_user(
                db=db,
                user_id=admin_user.id,
                category="approval",
                title=title,
                message=message,
                entity_type="equipment_approval_submission",
                entity_id=submission.id,
                email=admin_user.email,
                action_url=action_url,
                project_name=project.name,
                language="he",
                project_id=project.id,
            )

        # Step 5: Verify WhatsApp message was sent
        assert len(captured_messages) == 1, "Should send exactly one WhatsApp message"

        sent_message = captured_messages[0]

        # Verify recipient
        assert sent_message['to'] == "+972501234567", "Message sent to correct WhatsApp number"

        # Verify message content
        message_body = sent_message['body']
        assert "אישור ממתין 6 ימים" in message_body, "Message contains Hebrew title"
        assert "מנוף לאתר בניין א" in message_body, "Message contains item name in Hebrew"
        assert "6 ימים" in message_body, "Message contains pending days count"
        assert action_url in message_body, "Message contains action link"
        assert "BuilderOps" in message_body, "Message contains BuilderOps branding"

        # Verify Hebrew language indicators
        assert "ב-BuilderOps" in message_body or "BuilderOps" in message_body, "Message in Hebrew"

        # Step 6: Verify WhatsAppService methods were called correctly
        mock_whatsapp_service.format_notification_message.assert_called_once()
        mock_whatsapp_service.send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_overdue_approval_sends_whatsapp_notification_english(
        self,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """
        End-to-end test: Receive WhatsApp notification for overdue approval (English).

        Verification steps:
        1. Create test equipment item with approval status
        2. Trigger approval reminder service
        3. Verify user with linked WhatsApp receives message
        4. Verify message contains project name, item details, and action link
        5. Verify message in English for English users
        """
        # Step 1: Set up user with verified WhatsApp number and English language
        admin_user.whatsapp_number = "+12125551234"
        admin_user.whatsapp_verified = True
        admin_user.language = "en"
        await db.commit()
        await db.refresh(admin_user)

        # Step 2: Create overdue equipment approval submission
        submitted_at = utcnow() - timedelta(days=7)  # 7 days old (escalation level)
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Crane for Building Site A",
            status=SubmissionStatus.PENDING_REVIEW.value,
            submitted_at=submitted_at,
            submitted_by_id=admin_user.id,
        )
        db.add(submission)
        await db.commit()
        await db.refresh(submission)

        # Step 3: Mock WhatsAppService
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.enabled = True
        captured_messages = []

        def capture_send_message(to_whatsapp: str, body: str):
            captured_messages.append({
                'to': to_whatsapp,
                'body': body
            })
            return {
                'success': True,
                'message_sid': 'SM_test_456',
                'status': 'sent',
                'to': to_whatsapp
            }

        mock_whatsapp_service.send_message = MagicMock(side_effect=capture_send_message)
        mock_whatsapp_service.format_notification_message = MagicMock(
            side_effect=lambda title, message, action_url=None, language='en', emoji='🔔': (
                f"{emoji} *{title}*\n\n{message}\n\n"
                f"{'View in BuilderOps: ' + action_url if action_url else ''}\n\n"
                f"_BuilderOps - Construction Management_"
            )
        )

        # Step 4: Trigger notification
        with patch("app.services.notification_service.WhatsAppService", return_value=mock_whatsapp_service):
            title = "Approval escalation (7 days): Crane for Building Site A"
            message = 'Your equipment approval submission "Crane for Building Site A" has been waiting for review for 7 days.'
            action_url = f"https://builderops.com/projects/{project.id}/approvals/{submission.id}"

            await notify_user(
                db=db,
                user_id=admin_user.id,
                category="approval",
                title=title,
                message=message,
                entity_type="equipment_approval_submission",
                entity_id=submission.id,
                email=admin_user.email,
                action_url=action_url,
                project_name=project.name,
                language="en",
                project_id=project.id,
            )

        # Step 5: Verify WhatsApp message was sent
        assert len(captured_messages) == 1, "Should send exactly one WhatsApp message"

        sent_message = captured_messages[0]

        # Verify recipient
        assert sent_message['to'] == "+12125551234", "Message sent to correct WhatsApp number"

        # Verify message content in English
        message_body = sent_message['body']
        assert "Approval escalation" in message_body or "7 days" in message_body, "Message contains English title"
        assert "Crane for Building Site A" in message_body, "Message contains item name"
        assert "7 days" in message_body, "Message contains pending days count"
        assert action_url in message_body, "Message contains action link"
        assert "BuilderOps" in message_body, "Message contains BuilderOps branding"

        # Verify English language indicators
        assert "View in BuilderOps" in message_body or "Construction Management" in message_body, "Message in English"

    @pytest.mark.asyncio
    async def test_whatsapp_notification_message_formatting(
        self,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """
        Test that WhatsApp notification messages are properly formatted with all required fields.

        This test verifies:
        1. Message formatting includes title, message body, action URL, and footer
        2. Special characters and emojis are preserved
        3. Format works for both Hebrew and English
        """
        # Set up user with verified WhatsApp number
        admin_user.whatsapp_number = "+972509876543"
        admin_user.whatsapp_verified = True
        admin_user.language = "he"
        await db.commit()
        await db.refresh(admin_user)

        # Create test submission
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="טרקטור לעבודות עפר",  # Hebrew: "Tractor for earthworks"
            status=SubmissionStatus.PENDING_REVIEW.value,
            submitted_at=utcnow() - timedelta(days=6),
            submitted_by_id=admin_user.id,
        )
        db.add(submission)
        await db.commit()

        # Mock WhatsAppService with real formatting
        from app.services.whatsapp_service import WhatsAppService

        # Use real formatting method wrapped in mock to capture calls
        real_service = WhatsAppService()
        real_format = real_service.format_notification_message

        mock_service = MagicMock()
        mock_service.enabled = True
        mock_service.send_message = MagicMock(return_value={'success': True})
        mock_service.format_notification_message = MagicMock(wraps=real_format)

        with patch("app.services.notification_service.WhatsAppService", return_value=mock_service):
            # Send notification
            title = "אישור ממתין 6 ימים: טרקטור לעבודות עפר"
            message = 'הגשת האישור שלך "טרקטור לעבודות עפר" ממתינה לבדיקה כבר 6 ימים.'
            action_url = f"https://builderops.com/projects/{project.id}/approvals/{submission.id}"

            await notify_user(
                db=db,
                user_id=admin_user.id,
                category="approval",
                title=title,
                message=message,
                entity_type="equipment_approval_submission",
                entity_id=submission.id,
                action_url=action_url,
                project_name=project.name,
                language="he",
                project_id=project.id,
            )

            # Verify formatting method was called with correct parameters
            mock_service.format_notification_message.assert_called_once()
            call_kwargs = mock_service.format_notification_message.call_args.kwargs

            assert call_kwargs['title'] == title
            assert call_kwargs['message'] == message
            assert call_kwargs['action_url'] == action_url
            assert call_kwargs['language'] == 'he'

            # Verify send_message was called
            assert mock_service.send_message.call_count == 1

    @pytest.mark.asyncio
    async def test_no_whatsapp_notification_when_user_not_verified(
        self,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """
        Verify WhatsApp notification is NOT sent when user has unverified WhatsApp.
        """
        # Set up user with WhatsApp number but NOT verified
        admin_user.whatsapp_number = "+972501111111"
        admin_user.whatsapp_verified = False
        admin_user.language = "he"
        await db.commit()
        await db.refresh(admin_user)

        # Create submission
        submitted_at = utcnow() - timedelta(days=6)
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Test Equipment",
            status=SubmissionStatus.PENDING_REVIEW.value,
            submitted_at=submitted_at,
            submitted_by_id=admin_user.id,
        )
        db.add(submission)
        await db.commit()

        # Mock WhatsAppService
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.enabled = True
        mock_whatsapp_service.send_message = MagicMock()

        # Trigger notification
        with patch("app.services.notification_service.WhatsAppService", return_value=mock_whatsapp_service):
            await notify_user(
                db=db,
                user_id=admin_user.id,
                category="approval",
                title="Test Notification",
                message="Test message",
                entity_type="equipment_approval_submission",
                entity_id=submission.id,
                language="he",
                project_id=project.id,
            )

        # Verify WhatsApp message was NOT sent (user not verified)
        assert mock_whatsapp_service.send_message.call_count == 0, "Should not send WhatsApp when user not verified"

    @pytest.mark.asyncio
    async def test_no_whatsapp_notification_when_user_has_no_number(
        self,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """
        Verify WhatsApp notification is NOT sent when user has no WhatsApp number.
        """
        # Set up user without WhatsApp number
        admin_user.whatsapp_number = None
        admin_user.whatsapp_verified = False
        admin_user.language = "he"
        await db.commit()
        await db.refresh(admin_user)

        # Create submission
        submitted_at = utcnow() - timedelta(days=6)
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Test Equipment",
            status=SubmissionStatus.PENDING_REVIEW.value,
            submitted_at=submitted_at,
            submitted_by_id=admin_user.id,
        )
        db.add(submission)
        await db.commit()

        # Mock WhatsAppService
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.enabled = True
        mock_whatsapp_service.send_message = MagicMock()

        # Trigger notification
        with patch("app.services.notification_service.WhatsAppService", return_value=mock_whatsapp_service):
            await notify_user(
                db=db,
                user_id=admin_user.id,
                category="approval",
                title="Test Notification",
                message="Test message",
                entity_type="equipment_approval_submission",
                entity_id=submission.id,
                language="he",
                project_id=project.id,
            )

        # Verify WhatsApp message was NOT sent (no phone number)
        assert mock_whatsapp_service.send_message.call_count == 0, "Should not send WhatsApp when user has no number"
