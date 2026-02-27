"""
Unit tests for the gmail_service module, focusing on retry logic and error handling.
"""
import logging
from unittest.mock import MagicMock, patch

import pytest

from app.services.gmail_service import (
    GMAIL_SEND_MAX_RETRIES,
    GMAIL_SEND_RETRY_DELAYS,
    GoogleRefreshError,
    GoogleTransportError,
    HttpError,
    execute_with_retry,
)


class TestExecuteWithRetry:
    def test_success_on_first_attempt(self):
        """execute_with_retry returns immediately on success."""
        request = MagicMock()
        request.execute.return_value = {"id": "msg1"}
        result = execute_with_retry(request)
        assert result == {"id": "msg1"}
        assert request.execute.call_count == 1

    def test_raises_non_retriable_exception_immediately(self):
        """Non-retriable exceptions are re-raised without retrying."""
        request = MagicMock()
        request.execute.side_effect = ValueError("bad input")
        with pytest.raises(ValueError, match="bad input"):
            execute_with_retry(request)
        assert request.execute.call_count == 1

    @pytest.mark.skipif(
        GoogleTransportError is None,
        reason="google-auth not installed",
    )
    def test_transport_error_is_retried(self):
        """TransportError (transient network failure) triggers retry logic."""
        request = MagicMock()
        transport_err = GoogleTransportError("network blip")
        request.execute.side_effect = [
            transport_err,
            {"id": "msg_after_retry"},
        ]
        with patch("app.services.gmail_service.time.sleep") as mock_sleep:
            result = execute_with_retry(request)
        assert result == {"id": "msg_after_retry"}
        assert request.execute.call_count == 2
        mock_sleep.assert_called_once_with(GMAIL_SEND_RETRY_DELAYS[0])

    @pytest.mark.skipif(
        GoogleTransportError is None,
        reason="google-auth not installed",
    )
    def test_transport_error_exhausts_retries_and_raises(self):
        """TransportError that persists through all retries is eventually raised."""
        request = MagicMock()
        transport_err = GoogleTransportError("persistent network failure")
        request.execute.side_effect = [transport_err] * GMAIL_SEND_MAX_RETRIES
        with patch("app.services.gmail_service.time.sleep"):
            with pytest.raises(GoogleTransportError):
                execute_with_retry(request)
        assert request.execute.call_count == GMAIL_SEND_MAX_RETRIES

    @pytest.mark.skipif(
        GoogleRefreshError is None,
        reason="google-auth not installed",
    )
    def test_refresh_error_is_not_retried(self):
        """RefreshError (credential failure) is raised immediately without retrying."""
        request = MagicMock()
        refresh_err = GoogleRefreshError("token expired")
        request.execute.side_effect = refresh_err
        with pytest.raises(GoogleRefreshError):
            execute_with_retry(request)
        assert request.execute.call_count == 1

    @pytest.mark.skipif(
        HttpError is None,
        reason="google-api-python-client not installed",
    )
    def test_http_503_is_retried(self):
        """HTTP 503 errors are retried."""
        request = MagicMock()
        resp = MagicMock()
        resp.status = 503
        http_err = HttpError(resp=resp, content=b"Service Unavailable")
        request.execute.side_effect = [http_err, {"id": "recovered"}]
        with patch("app.services.gmail_service.time.sleep"):
            result = execute_with_retry(request)
        assert result == {"id": "recovered"}
        assert request.execute.call_count == 2

    @pytest.mark.skipif(
        HttpError is None,
        reason="google-api-python-client not installed",
    )
    def test_http_400_is_not_retried(self):
        """HTTP 400 (bad request) is not retriable and raised immediately."""
        request = MagicMock()
        resp = MagicMock()
        resp.status = 400
        http_err = HttpError(resp=resp, content=b"Bad Request")
        request.execute.side_effect = http_err
        with pytest.raises(HttpError):
            execute_with_retry(request)
        assert request.execute.call_count == 1


class TestGmailServiceRefreshErrorLogging:
    @pytest.mark.skipif(
        GoogleRefreshError is None,
        reason="google-auth not installed",
    )
    def test_send_notification_email_logs_refresh_error(self, caplog):
        """RefreshError during send_notification_email is logged with credential renewal message."""
        from app.services.gmail_service import GmailService

        service = GmailService()
        service._enabled = True
        service._service = MagicMock()
        refresh_err = GoogleRefreshError("invalid_grant")
        service._service.users.return_value.messages.return_value.send.return_value.execute.side_effect = refresh_err

        with caplog.at_level(logging.ERROR, logger="app.services.gmail_service"):
            with pytest.raises(GoogleRefreshError):
                service.send_notification_email(
                    to_email="test@example.com",
                    subject="Test",
                    body_html="<p>Hello</p>",
                )

        credential_log = any(
            "credentials may need to be renewed" in r.message
            for r in caplog.records
        )
        assert credential_log, "Expected a log about credential renewal"
