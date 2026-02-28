"""Integration tests for WhatsApp webhook and AI chat flow."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatConversation, ChatMessage
from app.models.project import Project, ProjectMember
from app.models.user import User


class TestWhatsAppWebhookFlow:
    """Integration tests for WhatsApp webhook end-to-end flow."""

    @pytest.mark.asyncio
    async def test_whatsapp_message_to_ai_response_flow(
        self,
        client: AsyncClient,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """
        End-to-end test: Send WhatsApp message and receive AI response.

        Verification steps:
        1. Send WhatsApp message to Twilio number: 'What equipment is in the project?'
        2. Verify webhook receives message
        3. Verify user identified by phone number
        4. Verify chat_service.send_message() called
        5. Verify AI response sent back via WhatsApp
        6. Verify conversation visible in BuilderOps chat history
        """
        # Step 1: Set up user with verified WhatsApp number
        admin_user.whatsapp_number = "+972501234567"
        admin_user.whatsapp_verified = True
        admin_user.language = "he"  # Hebrew language for response
        await db.commit()
        await db.refresh(admin_user)

        # Verify user has WhatsApp number and is a project member
        assert admin_user.whatsapp_number == "+972501234567"
        assert admin_user.whatsapp_verified is True

        # Verify project membership exists
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.user_id == admin_user.id,
                ProjectMember.project_id == project.id
            )
        )
        project_member = result.scalar_one_or_none()
        assert project_member is not None, "Admin user should be a project member"

        # Step 2: Mock WhatsAppService to avoid real Twilio calls
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.send_message = MagicMock(return_value=True)
        mock_whatsapp_service.verify_webhook_signature = MagicMock(return_value=True)

        # Step 3: Mock chat_service.send_message to return a predictable AI response
        # Create mock message objects with .content attribute
        from types import SimpleNamespace

        mock_user_message = SimpleNamespace(
            id=str(uuid.uuid4()),
            role="user",
            content="What equipment is in the project?",
            created_at="2026-02-28T10:00:00Z"
        )

        mock_assistant_message = SimpleNamespace(
            id=str(uuid.uuid4()),
            role="assistant",
            content="אין ציוד רשום בפרויקט כרגע. האם תרצה להוסיף פריט ציוד חדש?",
            created_at="2026-02-28T10:00:01Z"
        )

        mock_chat_response = {
            "user_message": mock_user_message,
            "assistant_message": mock_assistant_message,
            "conversation_id": str(uuid.uuid4()),
            "pending_actions": []
        }

        # Step 4: Prepare Twilio webhook payload
        # This is what Twilio sends when a WhatsApp message is received
        webhook_payload = {
            "MessageSid": "SM1234567890abcdef1234567890abcdef",
            "AccountSid": "ACTEST_FAKE_SID_FOR_UNIT_TESTING_00",
            "MessagingServiceSid": "MG1234567890abcdef1234567890abcdef",
            "From": "whatsapp:+972501234567",  # User's WhatsApp number
            "To": "whatsapp:+14155238886",  # Twilio sandbox number
            "Body": "What equipment is in the project?",  # User's message
            "NumMedia": "0",
            "ProfileName": "Admin Test User",
            "SmsStatus": "received",
        }

        # Step 5: Send webhook request with mocked services
        with patch("app.api.v1.whatsapp.WhatsAppService", return_value=mock_whatsapp_service):
            with patch("app.api.v1.whatsapp.send_message", new_callable=AsyncMock) as mock_send_message:
                mock_send_message.return_value = mock_chat_response

                response = await client.post(
                    "/api/v1/whatsapp/webhook",
                    data=webhook_payload,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "X-Twilio-Signature": "fake-signature-for-testing"
                    }
                )

                # Step 6: Verify webhook accepted the message
                assert response.status_code == 200
                response_data = response.json()
                assert response_data["status"] == "ok"
                assert response_data["message"] == "Message processed"

                # Step 7: Verify webhook signature was checked
                mock_whatsapp_service.verify_webhook_signature.assert_called_once()

                # Step 8: Verify chat_service.send_message() was called with correct parameters
                mock_send_message.assert_called_once()
                call_args = mock_send_message.call_args
                assert call_args.kwargs["db"] is not None
                assert call_args.kwargs["project_id"] == project.id
                assert call_args.kwargs["user_id"] == admin_user.id
                assert call_args.kwargs["message"] == "What equipment is in the project?"
                assert call_args.kwargs["conversation_id"] is None  # New conversation for WhatsApp

                # Step 9: Verify AI response was sent back via WhatsApp
                # The WhatsApp service should have been called to send the AI response
                assert mock_whatsapp_service.send_message.call_count == 1
                send_call = mock_whatsapp_service.send_message.call_args
                assert send_call.kwargs["to_whatsapp"] == "+972501234567"
                assert send_call.kwargs["body"] == "אין ציוד רשום בפרויקט כרגע. האם תרצה להוסיף פריט ציוד חדש?"

    @pytest.mark.asyncio
    async def test_whatsapp_message_from_unverified_number(
        self,
        client: AsyncClient,
        db: AsyncSession,
    ):
        """Test webhook rejects messages from unverified WhatsApp numbers."""
        # Prepare webhook payload from unknown number
        webhook_payload = {
            "MessageSid": "SM1234567890abcdef1234567890abcdef",
            "AccountSid": "ACTEST_FAKE_SID_FOR_UNIT_TESTING_00",
            "From": "whatsapp:+972509999999",  # Unknown number
            "To": "whatsapp:+14155238886",
            "Body": "Hello, what is my project status?",
            "NumMedia": "0",
        }

        # Mock WhatsAppService
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.send_message = MagicMock(return_value=True)
        mock_whatsapp_service.verify_webhook_signature = MagicMock(return_value=True)

        with patch("app.api.v1.whatsapp.WhatsAppService", return_value=mock_whatsapp_service):
            response = await client.post(
                "/api/v1/whatsapp/webhook",
                data=webhook_payload,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Twilio-Signature": "fake-signature"
                }
            )

            # Should return 200 but with "Number not linked" message
            assert response.status_code == 200
            response_data = response.json()
            assert response_data["status"] == "ok"
            assert response_data["message"] == "Number not linked"

            # Should send helpful message to user
            mock_whatsapp_service.send_message.assert_called_once()
            send_call = mock_whatsapp_service.send_message.call_args
            assert send_call.kwargs["to_whatsapp"] == "+972509999999"
            assert "לא מקושר לחשבון BuilderOps" in send_call.kwargs["body"]
            assert "not linked to a BuilderOps account" in send_call.kwargs["body"]

    @pytest.mark.asyncio
    async def test_whatsapp_message_from_user_with_no_projects(
        self,
        client: AsyncClient,
        db: AsyncSession,
    ):
        """Test webhook handles users with verified WhatsApp but no projects."""
        # Create user with WhatsApp but no project membership
        user = User(
            id=uuid.uuid4(),
            firebase_uid="whatsapp-user-uid",
            email="whatsapp@test.com",
            full_name="WhatsApp User",
            role="user",
            is_active=True,
            whatsapp_number="+972508888888",
            whatsapp_verified=True,
            language="he"
        )
        db.add(user)
        await db.commit()

        webhook_payload = {
            "MessageSid": "SM1234567890abcdef1234567890abcdef",
            "AccountSid": "ACTEST_FAKE_SID_FOR_UNIT_TESTING_00",
            "From": "whatsapp:+972508888888",
            "To": "whatsapp:+14155238886",
            "Body": "What is my project status?",
            "NumMedia": "0",
        }

        # Mock WhatsAppService
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.send_message = MagicMock(return_value=True)
        mock_whatsapp_service.verify_webhook_signature = MagicMock(return_value=True)

        with patch("app.api.v1.whatsapp.WhatsAppService", return_value=mock_whatsapp_service):
            response = await client.post(
                "/api/v1/whatsapp/webhook",
                data=webhook_payload,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Twilio-Signature": "fake-signature"
                }
            )

            # Should return 200 but with "No projects" message
            assert response.status_code == 200
            response_data = response.json()
            assert response_data["status"] == "ok"
            assert response_data["message"] == "No projects"

            # Should send helpful message to user
            mock_whatsapp_service.send_message.assert_called_once()
            send_call = mock_whatsapp_service.send_message.call_args
            assert send_call.kwargs["to_whatsapp"] == "+972508888888"
            assert "לא נמצאו פרויקטים" in send_call.kwargs["body"]
            assert "No projects found" in send_call.kwargs["body"]

    @pytest.mark.asyncio
    async def test_whatsapp_webhook_invalid_signature(
        self,
        client: AsyncClient,
    ):
        """Test webhook rejects requests with invalid Twilio signature."""
        webhook_payload = {
            "MessageSid": "SM1234567890abcdef1234567890abcdef",
            "From": "whatsapp:+972501234567",
            "To": "whatsapp:+14155238886",
            "Body": "Test message",
        }

        # Mock WhatsAppService with signature verification returning False
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.verify_webhook_signature = MagicMock(return_value=False)

        with patch("app.api.v1.whatsapp.WhatsAppService", return_value=mock_whatsapp_service):
            response = await client.post(
                "/api/v1/whatsapp/webhook",
                data=webhook_payload,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Twilio-Signature": "invalid-signature"
                }
            )

            # Should reject with 403 Forbidden
            assert response.status_code == 403
            response_data = response.json()
            assert response_data["detail"] == "Invalid signature"

    @pytest.mark.asyncio
    async def test_whatsapp_message_with_pending_actions(
        self,
        client: AsyncClient,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """Test webhook sends additional message when AI has pending actions."""
        # Set up user with verified WhatsApp number
        admin_user.whatsapp_number = "+972501234567"
        admin_user.whatsapp_verified = True
        admin_user.language = "he"
        await db.commit()

        # Mock chat response with pending actions
        from types import SimpleNamespace

        mock_user_msg = SimpleNamespace(
            role="user",
            content="Add new crane to the project",
        )

        mock_assistant_msg = SimpleNamespace(
            role="assistant",
            content="הבנתי. יצרתי הצעה להוספת מנוף לפרויקט.",
        )

        mock_chat_response = {
            "user_message": mock_user_msg,
            "assistant_message": mock_assistant_msg,
            "conversation_id": str(uuid.uuid4()),
            "pending_actions": [
                {
                    "action_id": str(uuid.uuid4()),
                    "action_type": "create_equipment",
                    "description": "Create crane equipment"
                }
            ]
        }

        webhook_payload = {
            "MessageSid": "SM1234567890abcdef1234567890abcdef",
            "From": "whatsapp:+972501234567",
            "To": "whatsapp:+14155238886",
            "Body": "Add new crane to the project",
            "NumMedia": "0",
        }

        # Mock services
        mock_whatsapp_service = MagicMock()
        mock_whatsapp_service.send_message = MagicMock(return_value=True)
        mock_whatsapp_service.verify_webhook_signature = MagicMock(return_value=True)

        with patch("app.api.v1.whatsapp.WhatsAppService", return_value=mock_whatsapp_service):
            with patch("app.api.v1.whatsapp.send_message", new_callable=AsyncMock) as mock_send_message:
                mock_send_message.return_value = mock_chat_response

                response = await client.post(
                    "/api/v1/whatsapp/webhook",
                    data=webhook_payload,
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "X-Twilio-Signature": "fake-signature"
                    }
                )

                assert response.status_code == 200

                # Should send TWO messages:
                # 1. AI response
                # 2. Pending actions notification
                assert mock_whatsapp_service.send_message.call_count == 2

                # First call: AI response
                first_call = mock_whatsapp_service.send_message.call_args_list[0]
                assert "הבנתי" in first_call.kwargs["body"]

                # Second call: Pending actions notification
                second_call = mock_whatsapp_service.send_message.call_args_list[1]
                assert "📋 יש 1 פעולות מוצעות" in second_call.kwargs["body"]
                assert "proposed actions" in second_call.kwargs["body"]

    @pytest.mark.asyncio
    async def test_whatsapp_conversation_visible_in_chat_history(
        self,
        client: AsyncClient,
        project: Project,
        db: AsyncSession,
        admin_user: User,
    ):
        """Verify WhatsApp conversation is stored in BuilderOps chat history."""
        # Set up user with verified WhatsApp number
        admin_user.whatsapp_number = "+972501234567"
        admin_user.whatsapp_verified = True
        await db.commit()

        # Create a real conversation in the database
        conversation = ChatConversation(
            id=uuid.uuid4(),
            project_id=project.id,
            user_id=admin_user.id,
            title="WhatsApp: What equipment is in the project?"
        )
        db.add(conversation)
        await db.flush()

        # Add user message
        user_message = ChatMessage(
            id=uuid.uuid4(),
            conversation_id=conversation.id,
            role="user",
            content="What equipment is in the project?"
        )
        db.add(user_message)

        # Add assistant response
        assistant_message = ChatMessage(
            id=uuid.uuid4(),
            conversation_id=conversation.id,
            role="assistant",
            content="אין ציוד רשום בפרויקט כרגע."
        )
        db.add(assistant_message)

        await db.commit()

        # Verify conversation exists in database
        result = await db.execute(
            select(ChatConversation).where(
                ChatConversation.id == conversation.id
            )
        )
        stored_conversation = result.scalar_one_or_none()
        assert stored_conversation is not None
        assert stored_conversation.project_id == project.id
        assert stored_conversation.user_id == admin_user.id

        # Verify messages exist
        result = await db.execute(
            select(ChatMessage).where(
                ChatMessage.conversation_id == conversation.id
            ).order_by(ChatMessage.created_at)
        )
        messages = result.scalars().all()
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[0].content == "What equipment is in the project?"
        assert messages[1].role == "assistant"
        assert "ציוד" in messages[1].content  # Hebrew word for "equipment"
