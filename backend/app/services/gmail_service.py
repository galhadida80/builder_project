import base64
import logging
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GOOGLE_APIS_AVAILABLE = True
except ImportError:
    GOOGLE_APIS_AVAILABLE = False
    logger.warning("Google API libraries not installed. Gmail integration will be disabled.")


class GmailService:
    SCOPES = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
    ]

    def __init__(self):
        self.settings = get_settings()
        self._service = None
        self._enabled = bool(
            GOOGLE_APIS_AVAILABLE and
            self.settings.rfi_email_address and
            self.settings.google_service_account_file
        )

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def service(self):
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        if self._service is None:
            credentials = service_account.Credentials.from_service_account_file(
                self.settings.google_service_account_file,
                scopes=self.SCOPES
            )
            delegated_credentials = credentials.with_subject(self.settings.rfi_email_address)
            self._service = build('gmail', 'v1', credentials=delegated_credentials)
        return self._service

    def send_rfi_email(
        self,
        rfi_number: str,
        to_email: str,
        subject: str,
        body_html: str,
        cc_emails: Optional[list[str]] = None,
        attachments: Optional[list[dict]] = None,
        in_reply_to: Optional[str] = None,
        references: Optional[str] = None
    ) -> dict:
        if not self._enabled:
            logger.warning("Gmail service not enabled, simulating email send")
            return {
                'message_id': f'simulated-{rfi_number}',
                'thread_id': f'simulated-thread-{rfi_number}',
                'email_message_id': f'<simulated-{rfi_number}@localhost>'
            }

        message = MIMEMultipart('mixed')
        message['To'] = to_email
        message['From'] = f"RFI System <{self.settings.rfi_email_address}>"
        message['Subject'] = f"[{rfi_number}] {subject}"

        if cc_emails:
            message['Cc'] = ', '.join(cc_emails)

        if in_reply_to:
            message['In-Reply-To'] = in_reply_to
            message['References'] = references or in_reply_to

        message['X-RFI-Number'] = rfi_number

        html_part = MIMEText(body_html, 'html')
        message.attach(html_part)

        if attachments:
            for attachment in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment['content'])
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f"attachment; filename={attachment['filename']}"
                )
                message.attach(part)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

        try:
            result = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()

            return {
                'message_id': result['id'],
                'thread_id': result['threadId'],
                'email_message_id': message['Message-ID']
            }
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise

    def setup_watch(self, topic_name: str) -> dict:
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        request = {
            'labelIds': ['INBOX'],
            'topicName': topic_name
        }
        return self.service.users().watch(userId='me', body=request).execute()

    def get_message(self, message_id: str) -> dict:
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        return self.service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()

    def get_thread(self, thread_id: str) -> dict:
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        return self.service.users().threads().get(
            userId='me',
            id=thread_id
        ).execute()

    def get_attachment(self, message_id: str, attachment_id: str) -> bytes:
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        attachment = self.service.users().messages().attachments().get(
            userId='me',
            messageId=message_id,
            id=attachment_id
        ).execute()
        return base64.urlsafe_b64decode(attachment['data'])

    def get_history(self, start_history_id: str) -> dict:
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        return self.service.users().history().list(
            userId='me',
            startHistoryId=start_history_id,
            historyTypes=['messageAdded']
        ).execute()


def get_gmail_service() -> GmailService:
    return GmailService()
