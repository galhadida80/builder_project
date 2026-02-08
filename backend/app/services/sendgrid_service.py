import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail, Email, To, Cc, Content, Attachment,
    FileContent, FileName, FileType, Disposition,
    Header, CustomArg
)
import base64
from app.config import get_settings

logger = logging.getLogger(__name__)


class SendGridService:
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.sendgrid_api_key
        self.from_email = self.settings.sendgrid_from_email or self.settings.rfi_email_address
        self.from_name = self.settings.sendgrid_from_name
        self.enabled = bool(self.api_key and self.from_email)

        if self.enabled:
            self.client = SendGridAPIClient(self.api_key)
        else:
            self.client = None
            logger.warning("SendGrid not configured - email sending disabled")

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
        from_email: Optional[str] = None
    ) -> dict:
        if not self.enabled:
            raise RuntimeError("SendGrid is not configured")

        sender = from_email or self.from_email
        message = Mail()
        message.from_email = Email(sender, self.from_name)
        message.to = [To(to_email)]
        message.subject = f"[{rfi_number}] {subject}"
        message.add_content(Content("text/html", body_html))

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
            response = self.client.send(message)

            message_id = response.headers.get('X-Message-Id', '')

            logger.info(f"RFI email sent successfully: {rfi_number} to {to_email}")

            return {
                'success': True,
                'status_code': response.status_code,
                'email_message_id': message_id,
                'thread_id': message_id
            }

        except Exception as e:
            logger.error(f"Failed to send RFI email via SendGrid: {e}")
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

        message = Mail()
        message.from_email = Email(self.from_email, self.from_name)
        message.to = [To(to_email)]
        message.subject = subject
        message.add_content(Content("text/html", body_html))

        if body_text:
            message.add_content(Content("text/plain", body_text))

        try:
            response = self.client.send(message)

            logger.info(f"Notification email sent to {to_email}")

            return {
                'success': True,
                'status_code': response.status_code,
                'message_id': response.headers.get('X-Message-Id', '')
            }

        except Exception as e:
            logger.error(f"Failed to send notification email: {e}")
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
                results.append({
                    'email': recipient['email'],
                    'success': False,
                    'error': str(e)
                })

        return results
