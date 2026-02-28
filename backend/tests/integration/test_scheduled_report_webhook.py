"""Integration test for scheduled report webhook endpoint."""
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.project import Project
from app.models.scheduled_report import ScheduledReport
from app.models.user import User


settings = get_settings()


class TestScheduledReportWebhook:
    """Integration tests for scheduled report webhook endpoint."""

    @pytest.mark.asyncio
    async def test_webhook_secret_required(self, client: AsyncClient):
        """Webhook should reject requests without scheduler_secret."""
        response = await client.post(
            "/api/v1/webhooks/webhooks/scheduled-reports",
            json={"report_id": str(uuid.uuid4())}
        )
        assert response.status_code == 401
        assert "scheduler_secret" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_webhook_invalid_secret(self, client: AsyncClient):
        """Webhook should reject requests with invalid scheduler_secret."""
        response = await client.post(
            "/api/v1/webhooks/webhooks/scheduled-reports",
            json={
                "report_id": str(uuid.uuid4()),
                "scheduler_secret": "wrong-secret"
            }
        )
        assert response.status_code == 403
        assert "Invalid scheduler_secret" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_webhook_missing_report_id(self, client: AsyncClient):
        """Webhook should reject requests without report_id."""
        response = await client.post(
            "/api/v1/webhooks/webhooks/scheduled-reports",
            json={"scheduler_secret": settings.scheduler_secret}
        )
        assert response.status_code == 400
        assert "report_id" in response.json()["detail"]

    @pytest.mark.asyncio
    @patch("app.api.v1.webhooks.execute_scheduled_report", new_callable=AsyncMock)
    async def test_webhook_valid_request_queues_task(
        self, mock_execute, client: AsyncClient
    ):
        """Webhook should accept valid requests and queue background task."""
        report_id = str(uuid.uuid4())
        response = await client.post(
            "/api/v1/webhooks/webhooks/scheduled-reports",
            json={
                "report_id": report_id,
                "scheduler_secret": settings.scheduler_secret
            }
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["report_id"] == report_id

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_weekly_ai(
        self, db: AsyncSession, project: Project, admin_user: User
    ):
        """Execute scheduled report for weekly-ai type with email sending."""
        # Create scheduled report
        scheduled_report = ScheduledReport(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Weekly AI Report",
            report_type="weekly-ai",
            schedule_cron="0 9 * * 1",
            recipients=["test1@example.com", "test2@example.com"],
            config={"language": "he", "date_from": "2024-01-01", "date_to": "2024-01-07"},
            is_active=True,
            last_run_at=None,
            run_count=0,
            created_by_id=admin_user.id
        )
        db.add(scheduled_report)
        await db.commit()
        await db.refresh(scheduled_report)

        # Mock PDF generation and email sending
        mock_pdf = b"PDF content here"
        mock_email_result = {"sent_count": 2, "failed_count": 0, "errors": [], "invalid_emails": []}

        with patch(
            "app.services.inspection_report_service.generate_ai_weekly_report_pdf",
            new_callable=AsyncMock,
            return_value=mock_pdf
        ) as mock_pdf_gen, patch(
            "app.services.ai_report_generator.send_report_email",
            return_value=mock_email_result
        ) as mock_email:
            # Import and execute the background task
            from app.api.v1.webhooks import execute_scheduled_report

            await execute_scheduled_report(str(scheduled_report.id))

            # Verify PDF generation was called
            mock_pdf_gen.assert_called_once()
            call_kwargs = mock_pdf_gen.call_args.kwargs
            assert call_kwargs["project_id"] == project.id
            assert call_kwargs["language"] == "he"
            assert call_kwargs["config"]["date_from"] == "2024-01-01"

            # Verify email was sent
            mock_email.assert_called_once()
            email_kwargs = mock_email.call_args.kwargs
            assert email_kwargs["recipients"] == ["test1@example.com", "test2@example.com"]
            assert email_kwargs["project_name"] == project.name
            assert email_kwargs["report_type"] == "weekly-ai"
            assert email_kwargs["pdf_bytes"] == mock_pdf
            assert email_kwargs["language"] == "he"
            assert email_kwargs["report_date"] == "2024-01-01 to 2024-01-07"

        # Refresh scheduled report from database
        await db.refresh(scheduled_report)

        # Verify last_run_at was updated
        assert scheduled_report.last_run_at is not None
        assert isinstance(scheduled_report.last_run_at, datetime)

        # Verify run_count was incremented
        assert scheduled_report.run_count == 1

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_inspection_summary_ai(
        self, db: AsyncSession, project: Project, admin_user: User
    ):
        """Execute scheduled report for inspection-summary-ai type with email."""
        # Create scheduled report
        scheduled_report = ScheduledReport(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Inspection Summary AI Report",
            report_type="inspection-summary-ai",
            schedule_cron="0 17 * * 5",
            recipients=["inspector@example.com"],
            config={"language": "en", "date_from": "2024-01-01", "date_to": "2024-01-31"},
            is_active=True,
            last_run_at=None,
            run_count=0,
            created_by_id=admin_user.id
        )
        db.add(scheduled_report)
        await db.commit()
        await db.refresh(scheduled_report)

        # Mock PDF generation and email sending
        mock_pdf = b"Inspection PDF"
        mock_email_result = {"sent_count": 1, "failed_count": 0, "errors": [], "invalid_emails": []}

        with patch(
            "app.services.inspection_report_service.generate_ai_inspection_summary_pdf",
            new_callable=AsyncMock,
            return_value=mock_pdf
        ) as mock_pdf_gen, patch(
            "app.services.ai_report_generator.send_report_email",
            return_value=mock_email_result
        ) as mock_email:
            # Import and execute the background task
            from app.api.v1.webhooks import execute_scheduled_report

            await execute_scheduled_report(str(scheduled_report.id))

            # Verify PDF generation was called
            mock_pdf_gen.assert_called_once()
            call_kwargs = mock_pdf_gen.call_args.kwargs
            assert call_kwargs["project_id"] == project.id
            assert call_kwargs["language"] == "en"

            # Verify email was sent
            mock_email.assert_called_once()
            email_kwargs = mock_email.call_args.kwargs
            assert email_kwargs["recipients"] == ["inspector@example.com"]
            assert email_kwargs["project_name"] == project.name
            assert email_kwargs["report_type"] == "inspection-summary-ai"
            assert email_kwargs["pdf_bytes"] == mock_pdf
            assert email_kwargs["language"] == "en"

        # Refresh scheduled report from database
        await db.refresh(scheduled_report)

        # Verify last_run_at was updated
        assert scheduled_report.last_run_at is not None

        # Verify run_count was incremented
        assert scheduled_report.run_count == 1

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_inactive(
        self, db: AsyncSession, project: Project, admin_user: User
    ):
        """Inactive scheduled reports should not execute."""
        # Create inactive scheduled report
        scheduled_report = ScheduledReport(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Inactive Report",
            report_type="weekly-ai",
            schedule_cron="0 9 * * 1",
            recipients=["test@example.com"],
            config={"language": "he"},
            is_active=False,
            last_run_at=None,
            run_count=0,
            created_by_id=admin_user.id
        )
        db.add(scheduled_report)
        await db.commit()
        await db.refresh(scheduled_report)

        # Mock PDF generation (should not be called)
        with patch(
            "app.services.inspection_report_service.generate_ai_weekly_report_pdf",
            new_callable=AsyncMock
        ) as mock_pdf_gen:
            # Import and execute the background task
            from app.api.v1.webhooks import execute_scheduled_report

            await execute_scheduled_report(str(scheduled_report.id))

            # Verify PDF generation was NOT called
            mock_pdf_gen.assert_not_called()

        # Refresh scheduled report from database
        await db.refresh(scheduled_report)

        # Verify last_run_at was NOT updated
        assert scheduled_report.last_run_at is None

        # Verify run_count was NOT incremented
        assert scheduled_report.run_count == 0

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_not_found(self, db: AsyncSession):
        """Non-existent report ID should be handled gracefully."""
        non_existent_id = str(uuid.uuid4())

        # Import and execute the background task
        from app.api.v1.webhooks import execute_scheduled_report

        # Should not raise, just log error and return
        await execute_scheduled_report(non_existent_id)

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_invalid_uuid(self, db: AsyncSession):
        """Invalid UUID format should be handled gracefully."""
        invalid_id = "not-a-valid-uuid"

        # Import and execute the background task
        from app.api.v1.webhooks import execute_scheduled_report

        # Should not raise, just log error and return
        await execute_scheduled_report(invalid_id)

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_no_recipients(
        self, db: AsyncSession, project: Project, admin_user: User
    ):
        """Report generation without recipients should skip email sending."""
        # Create scheduled report with no recipients
        scheduled_report = ScheduledReport(
            id=uuid.uuid4(),
            project_id=project.id,
            name="No Recipients Report",
            report_type="weekly-ai",
            schedule_cron="0 9 * * 1",
            recipients=[],
            config={"language": "he"},
            is_active=True,
            last_run_at=None,
            run_count=0,
            created_by_id=admin_user.id
        )
        db.add(scheduled_report)
        await db.commit()
        await db.refresh(scheduled_report)

        # Mock PDF generation and email sending
        mock_pdf = b"PDF content"
        with patch(
            "app.services.inspection_report_service.generate_ai_weekly_report_pdf",
            new_callable=AsyncMock,
            return_value=mock_pdf
        ) as mock_pdf_gen, patch(
            "app.services.ai_report_generator.send_report_email"
        ) as mock_email:
            # Import and execute the background task
            from app.api.v1.webhooks import execute_scheduled_report

            await execute_scheduled_report(str(scheduled_report.id))

            # Verify PDF was generated
            mock_pdf_gen.assert_called_once()

            # Verify email was NOT sent (no recipients)
            mock_email.assert_not_called()

        # Refresh scheduled report from database
        await db.refresh(scheduled_report)

        # Verify last_run_at was updated even without email
        assert scheduled_report.last_run_at is not None
        assert scheduled_report.run_count == 1

    @pytest.mark.asyncio
    async def test_execute_scheduled_report_multiple_runs(
        self, db: AsyncSession, project: Project, admin_user: User
    ):
        """Multiple executions should increment run_count correctly."""
        # Create scheduled report
        scheduled_report = ScheduledReport(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Multi-Run Report",
            report_type="weekly-ai",
            schedule_cron="0 9 * * 1",
            recipients=["test@example.com"],
            config={"language": "he"},
            is_active=True,
            last_run_at=None,
            run_count=0,
            created_by_id=admin_user.id
        )
        db.add(scheduled_report)
        await db.commit()
        await db.refresh(scheduled_report)

        # Mock PDF generation and email sending
        mock_pdf = b"PDF content"
        mock_email_result = {"sent_count": 1, "failed_count": 0, "errors": [], "invalid_emails": []}

        with patch(
            "app.services.inspection_report_service.generate_ai_weekly_report_pdf",
            new_callable=AsyncMock,
            return_value=mock_pdf
        ), patch(
            "app.services.ai_report_generator.send_report_email",
            return_value=mock_email_result
        ):
            # Import and execute the background task
            from app.api.v1.webhooks import execute_scheduled_report

            # First execution
            await execute_scheduled_report(str(scheduled_report.id))
            await db.refresh(scheduled_report)
            first_run_at = scheduled_report.last_run_at
            assert scheduled_report.run_count == 1

            # Second execution
            await execute_scheduled_report(str(scheduled_report.id))
            await db.refresh(scheduled_report)
            second_run_at = scheduled_report.last_run_at
            assert scheduled_report.run_count == 2
            assert second_run_at > first_run_at

            # Third execution
            await execute_scheduled_report(str(scheduled_report.id))
            await db.refresh(scheduled_report)
            third_run_at = scheduled_report.last_run_at
            assert scheduled_report.run_count == 3
            assert third_run_at > second_run_at
