import base64
import logging
import time
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

try:
    from google.auth.exceptions import RefreshError as GoogleRefreshError
    from google.auth.exceptions import TransportError as GoogleTransportError
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_APIS_AVAILABLE = True
except ImportError:
    GOOGLE_APIS_AVAILABLE = False
    HttpError = None
    GoogleTransportError = None
    GoogleRefreshError = None
    logger.warning("Google API libraries not installed. Gmail integration will be disabled.")

GMAIL_SEND_MAX_RETRIES = 3
GMAIL_SEND_RETRY_DELAYS = [1, 2, 4]

TOKEN_URI = "https://oauth2.googleapis.com/token"


def execute_with_retry(request):
    for attempt in range(GMAIL_SEND_MAX_RETRIES):
        try:
            return request.execute()
        except Exception as e:
            is_http_retriable = (
                HttpError is not None
                and isinstance(e, HttpError)
                and e.resp.status in (503, 429)
            )
            is_transport_error = (
                GoogleTransportError is not None
                and isinstance(e, GoogleTransportError)
            )
            is_retriable = is_http_retriable or is_transport_error
            if not is_retriable or attempt == GMAIL_SEND_MAX_RETRIES - 1:
                raise
            delay = GMAIL_SEND_RETRY_DELAYS[attempt]
            if is_http_retriable:
                logger.warning(
                    "Gmail API returned %s, retrying in %ds (attempt %d/%d): %s",
                    e.resp.status, delay, attempt + 1, GMAIL_SEND_MAX_RETRIES, e,
                )
            else:
                logger.warning(
                    "Transient network error communicating with Gmail API, retrying in %ds (attempt %d/%d): %s",
                    delay, attempt + 1, GMAIL_SEND_MAX_RETRIES, e,
                )
            time.sleep(delay)
    raise RuntimeError("Unreachable")


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
            GOOGLE_APIS_AVAILABLE
            and self.settings.gmail_client_id
            and self.settings.gmail_client_secret
            and self.settings.gmail_refresh_token
        )

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def service(self):
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        if self._service is None:
            credentials = Credentials(
                token=None,
                refresh_token=self.settings.gmail_refresh_token,
                token_uri=TOKEN_URI,
                client_id=self.settings.gmail_client_id,
                client_secret=self.settings.gmail_client_secret,
                scopes=self.SCOPES,
            )
            self._service = build('gmail', 'v1', credentials=credentials)
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
        references: Optional[str] = None,
        reply_to: Optional[str] = None
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
        message['From'] = f"BuilderOps <{self.settings.rfi_email_address}>"
        message['Subject'] = f"[{rfi_number}] {subject}"

        if reply_to:
            message['Reply-To'] = reply_to

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
            result = execute_with_retry(
                self.service.users().messages().send(
                    userId='me',
                    body={'raw': raw_message}
                )
            )

            return {
                'message_id': result['id'],
                'thread_id': result['threadId'],
                'email_message_id': message['Message-ID']
            }
        except Exception as e:
            if GoogleRefreshError is not None and isinstance(e, GoogleRefreshError):
                logger.error(
                    "Gmail OAuth2 token refresh failed - credentials may need to be renewed: %s", e
                )
            logger.error(f"Failed to send email: {e}")
            raise

    def send_notification_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> dict:
        if not self._enabled:
            logger.warning("Gmail service not enabled, simulating notification send")
            return {
                'message_id': 'simulated-notification',
                'thread_id': 'simulated-thread-notification',
                'email_message_id': '<simulated-notification@localhost>'
            }

        message = MIMEMultipart('alternative')
        message['To'] = to_email
        message['From'] = f"BuilderOps <{self.settings.rfi_email_address}>"
        message['Subject'] = subject

        if body_text:
            message.attach(MIMEText(body_text, 'plain'))
        message.attach(MIMEText(body_html, 'html'))

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

        try:
            result = execute_with_retry(
                self.service.users().messages().send(
                    userId='me',
                    body={'raw': raw_message}
                )
            )
            return {
                'message_id': result['id'],
                'thread_id': result['threadId'],
                'email_message_id': message['Message-ID']
            }
        except Exception as e:
            if GoogleRefreshError is not None and isinstance(e, GoogleRefreshError):
                logger.error(
                    "Gmail OAuth2 token refresh failed - credentials may need to be renewed: %s", e
                )
            logger.error(f"Failed to send notification email: {e}")
            raise

    def setup_watch(self, topic_name: str) -> dict:
        if not self._enabled:
            raise RuntimeError("Gmail service is not configured")

        request = {
            'labelIds': ['INBOX'],
            'topicName': topic_name
        }
        return self.service.users().watch(userId='me', body=request).execute()

    def renew_watch(self) -> dict:
        if not self._enabled:
            logger.info("Gmail service not enabled, skipping watch renewal")
            return {"status": "skipped"}

        topic = self.settings.google_pubsub_topic
        if not topic:
            logger.warning("No Pub/Sub topic configured, skipping watch renewal")
            return {"status": "no_topic"}

        try:
            result = self.setup_watch(topic)
            logger.info(f"Gmail watch renewed, expiration: {result.get('expiration')}")
            return {"status": "renewed", "expiration": result.get("expiration")}
        except Exception as e:
            logger.error(f"Failed to renew Gmail watch: {e}")
            return {"status": "error", "error": str(e)}

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
