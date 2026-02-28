import logging
import time
from typing import Optional

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Attachment,
    Cc,
    Content,
    CustomArg,
    Disposition,
    Email,
    FileContent,
    FileName,
    FileType,
    Header,
    Mail,
    To,
)

from app.config import get_settings

logger = logging.getLogger(__name__)

SENDGRID_MAX_RETRIES = 3
SENDGRID_RETRY_DELAYS = [1, 2, 4]


def execute_with_retry(client, message):
    for attempt in range(SENDGRID_MAX_RETRIES):
        try:
            return client.send(message)
        except Exception as e:
            is_retriable = (
                hasattr(e, 'status_code')
                and e.status_code in (503, 429)
            )
            if not is_retriable or attempt == SENDGRID_MAX_RETRIES - 1:
                raise
            delay = SENDGRID_RETRY_DELAYS[attempt]
            logger.warning(
                "SendGrid API returned %s, retrying in %ds (attempt %d/%d): %s",
                e.status_code, delay, attempt + 1, SENDGRID_MAX_RETRIES, e,
            )
            time.sleep(delay)
    raise RuntimeError("Unreachable")


class SendGridService:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.sendgrid_api_key
        self.from_email = self.settings.sendgrid_from_email or self.settings.rfi_email_address
        self.from_name = self.settings.sendgrid_from_name

        # Validate required configuration and provide specific warnings
        missing_configs = []
        if not self.api_key:
            missing_configs.append("SENDGRID_API_KEY")
        if not self.from_email:
            missing_configs.append("SENDGRID_FROM_EMAIL or RFI_EMAIL_ADDRESS")

        self.enabled = bool(self.api_key and self.from_email)

        if self.enabled:
            self.client = SendGridAPIClient(self.api_key)
            logger.info(
                "SendGrid service initialized successfully",
                extra={"provider": "sendgrid", "from_email": self.from_email}
            )
        else:
            self.client = None
            logger.warning(
                "SendGrid not configured - email sending disabled. Missing configuration: %s",
                ", ".join(missing_configs),
                extra={
                    "provider": "sendgrid",
                    "missing_configs": missing_configs,
                    "status": "disabled"
                }
            )

    def send_rfi_email(
        self,
        rfi_number: str,
        to_email: str,
        subject: str,
        body_html: str,
        cc_emails: Optional[list[str]] = None,
        attachments: Optional[list[dict]] = None,
        in_reply_to: Optional[str] = None,
        references: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> dict:
        if not self.enabled:
            raise RuntimeError("SendGrid is not configured")

        start_time = time.time()

        message = Mail()
        message.from_email = Email(self.from_email, self.from_name)
        message.to = [To(to_email)]
        message.subject = f"[{rfi_number}] {subject}"
        message.add_content(Content("text/html", body_html))

        if reply_to:
            message.reply_to = Email(reply_to)

        if cc_emails:
            for cc in cc_emails:
                message.add_cc(Cc(cc))

        message.add_header(Header("X-RFI-Number", rfi_number))
        message.add_custom_arg(CustomArg("rfi_number", rfi_number))

        if in_reply_to:
            message.add_header(Header("In-Reply-To", in_reply_to))
        if references:
            message.add_header(Header("References", references))

        if attachments:
            for att in attachments:
                attachment = Attachment()
                attachment.file_content = FileContent(att.get('content_base64', ''))
                attachment.file_name = FileName(att.get('filename', 'attachment'))
                attachment.file_type = FileType(att.get('mime_type', 'application/octet-stream'))
                attachment.disposition = Disposition('attachment')
                message.add_attachment(attachment)

        try:
            response = execute_with_retry(self.client, message)
            duration_ms = int((time.time() - start_time) * 1000)

            message_id = response.headers.get('X-Message-Id', '')

            logger.info(
                f"RFI email sent successfully: {rfi_number} to {to_email}",
                extra={
                    "recipient": to_email,
                    "provider": "sendgrid",
                    "status": "success",
                    "duration_ms": duration_ms,
                    "rfi_number": rfi_number,
                    "message_id": message_id
                }
            )

            return {
                'success': True,
                'status_code': response.status_code,
                'email_message_id': message_id,
                'thread_id': message_id
            }

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_type = type(e).__name__
            http_status = getattr(e, 'status_code', 'N/A')
            error_message = str(e)

            # Log auth errors (401/403) as critical - indicates invalid API key
            if http_status in (401, 403):
                logger.critical(
                    "SendGrid authentication failed - CRITICAL CONFIG ERROR - "
                    "Recipient: %s, RFI: %s, HTTP Status: %s, Message: %s. "
                    "Check SENDGRID_API_KEY configuration.",
                    to_email, rfi_number, http_status, error_message,
                    extra={
                        "recipient": to_email,
                        "provider": "sendgrid",
                        "status": "auth_failure",
                        "duration_ms": duration_ms,
                        "rfi_number": rfi_number,
                        "error_type": error_type,
                        "http_status": http_status
                    },
                    exc_info=True
                )
            else:
                logger.error(
                    "Failed to send RFI email via SendGrid - "
                    "Recipient: %s, RFI: %s, Error Type: %s, HTTP Status: %s, Message: %s",
                    to_email, rfi_number, error_type, http_status, error_message,
                    extra={
                        "recipient": to_email,
                        "provider": "sendgrid",
                        "status": "failure",
                        "duration_ms": duration_ms,
                        "rfi_number": rfi_number,
                        "error_type": error_type,
                        "http_status": http_status
                    },
                    exc_info=True
                )
            raise

    def send_notification_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> dict:
        if not self.enabled:
            raise RuntimeError("SendGrid is not configured")

        start_time = time.time()

        message = Mail()
        message.from_email = Email(self.from_email, self.from_name)
        message.to = [To(to_email)]
        message.subject = subject
        message.add_content(Content("text/html", body_html))

        if body_text:
            message.add_content(Content("text/plain", body_text))

        try:
            response = execute_with_retry(self.client, message)
            duration_ms = int((time.time() - start_time) * 1000)

            message_id = response.headers.get('X-Message-Id', '')

            logger.info(
                f"Notification email sent to {to_email}",
                extra={
                    "recipient": to_email,
                    "provider": "sendgrid",
                    "status": "success",
                    "duration_ms": duration_ms,
                    "message_id": message_id
                }
            )

            return {
                'success': True,
                'status_code': response.status_code,
                'message_id': message_id
            }

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_type = type(e).__name__
            http_status = getattr(e, 'status_code', 'N/A')
            error_message = str(e)

            # Log auth errors (401/403) as critical - indicates invalid API key
            if http_status in (401, 403):
                logger.critical(
                    "SendGrid authentication failed - CRITICAL CONFIG ERROR - "
                    "Recipient: %s, HTTP Status: %s, Message: %s. "
                    "Check SENDGRID_API_KEY configuration.",
                    to_email, http_status, error_message,
                    extra={
                        "recipient": to_email,
                        "provider": "sendgrid",
                        "status": "auth_failure",
                        "duration_ms": duration_ms,
                        "error_type": error_type,
                        "http_status": http_status
                    },
                    exc_info=True
                )
            else:
                logger.error(
                    "Failed to send notification email via SendGrid - "
                    "Recipient: %s, Error Type: %s, HTTP Status: %s, Message: %s",
                    to_email, error_type, http_status, error_message,
                    extra={
                        "recipient": to_email,
                        "provider": "sendgrid",
                        "status": "failure",
                        "duration_ms": duration_ms,
                        "error_type": error_type,
                        "http_status": http_status
                    },
                    exc_info=True
                )
            raise

    def send_bulk_notification(
        self,
        recipients: list[dict],
        subject: str,
        body_html: str
    ) -> list[dict]:
        results = []

        for recipient in recipients:
            try:
                result = self.send_notification_email(
                    to_email=recipient['email'],
                    subject=subject,
                    body_html=body_html.replace('{{name}}', recipient.get('name', ''))
                )
                results.append({
                    'email': recipient['email'],
                    'success': True,
                    'message_id': result.get('message_id')
                })
            except Exception as e:
                error_type = type(e).__name__
                http_status = getattr(e, 'status_code', 'N/A')
                error_message = str(e)

                # Log auth errors (401/403) as critical - indicates invalid API key
                if http_status in (401, 403):
                    logger.critical(
                        "SendGrid authentication failed - CRITICAL CONFIG ERROR - "
                        "Recipient: %s, HTTP Status: %s, Message: %s. "
                        "Check SENDGRID_API_KEY configuration.",
                        recipient['email'], http_status, error_message,
                        extra={
                            "recipient": recipient['email'],
                            "provider": "sendgrid",
                            "status": "auth_failure",
                            "error_type": error_type,
                            "http_status": http_status
                        },
                        exc_info=True
                    )
                else:
                    logger.error(
                        "Failed to send bulk notification email via SendGrid - "
                        "Recipient: %s, Error Type: %s, HTTP Status: %s, Message: %s",
                        recipient['email'], error_type, http_status, error_message,
                        extra={
                            "recipient": recipient['email'],
                            "provider": "sendgrid",
                            "status": "failure",
                            "error_type": error_type,
                            "http_status": http_status
                        },
                        exc_info=True
                    )

                results.append({
                    'email': recipient['email'],
                    'success': False,
                    'error': error_message
                })

        return results
