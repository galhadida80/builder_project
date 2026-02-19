import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import get_settings
from app.utils import utcnow

logger = logging.getLogger(__name__)


class FakeEmailService:
    def __init__(self):
        self.settings = get_settings()
        self.enabled = True
        self.sent_emails: list[dict] = []
        self.email_log_dir = Path(self.settings.local_storage_path) / "email_logs"
        self.email_log_dir.mkdir(parents=True, exist_ok=True)

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
        message_id = f"fake-{uuid.uuid4().hex[:12]}@dev.local"

        email_data = {
            'message_id': message_id,
            'rfi_number': rfi_number,
            'from_email': self.settings.rfi_email_address or 'builderops26@gmail.com',
            'reply_to': reply_to,
            'to_email': to_email,
            'cc_emails': cc_emails or [],
            'subject': f"[{rfi_number}] {subject}",
            'body_html': body_html,
            'attachments_count': len(attachments) if attachments else 0,
            'in_reply_to': in_reply_to,
            'references': references,
            'sent_at': utcnow().isoformat(),
            'status': 'sent'
        }

        self.sent_emails.append(email_data)
        self._save_email_to_file(email_data)

        logger.info(
            f"[FAKE EMAIL] RFI email sent:\n"
            f"  To: {to_email}\n"
            f"  CC: {cc_emails or 'none'}\n"
            f"  Subject: [{rfi_number}] {subject}\n"
            f"  Message ID: {message_id}"
        )

        return {
            'success': True,
            'status_code': 202,
            'email_message_id': message_id,
            'thread_id': message_id
        }

    def send_notification_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> dict:
        message_id = f"fake-notif-{uuid.uuid4().hex[:12]}@dev.local"

        email_data = {
            'message_id': message_id,
            'type': 'notification',
            'from_email': self.settings.rfi_email_address or 'builderops26@gmail.com',
            'to_email': to_email,
            'subject': subject,
            'body_html': body_html,
            'body_text': body_text,
            'sent_at': utcnow().isoformat(),
            'status': 'sent'
        }

        self.sent_emails.append(email_data)
        self._save_email_to_file(email_data)

        logger.info(
            f"[FAKE EMAIL] Notification sent:\n"
            f"  To: {to_email}\n"
            f"  Subject: {subject}\n"
            f"  Message ID: {message_id}"
        )

        return {
            'success': True,
            'status_code': 202,
            'message_id': message_id
        }

    def _save_email_to_file(self, email_data: dict):
        timestamp = utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{email_data['message_id'].split('@')[0]}.json"
        filepath = self.email_log_dir / filename

        email_for_file = email_data.copy()

        with open(filepath, 'w') as f:
            json.dump(email_for_file, f, indent=2, default=str)

        html_filename = f"{timestamp}_{email_data['message_id'].split('@')[0]}.html"
        html_filepath = self.email_log_dir / html_filename

        html_preview = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Email Preview - {email_data.get('subject', 'No Subject')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .envelope {{ background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .header {{ border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }}
        .label {{ font-weight: bold; color: #666; }}
        .content {{ background: #fafafa; padding: 20px; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="envelope">
        <div class="header">
            <h2>Email Preview (Development Mode)</h2>
            <p style="color: #666;">This email was not actually sent</p>
        </div>
        <p><span class="label">Message ID:</span> {email_data['message_id']}</p>
        <p><span class="label">From:</span> {email_data['from_email']}</p>
        <p><span class="label">To:</span> {email_data['to_email']}</p>
        <p><span class="label">CC:</span> {', '.join(email_data.get('cc_emails', [])) or 'None'}</p>
        <p><span class="label">Subject:</span> {email_data.get('subject', 'No Subject')}</p>
        <p><span class="label">Sent At:</span> {email_data['sent_at']}</p>
    </div>
    <div class="content">
        <h3>Email Body:</h3>
        {email_data.get('body_html', '')}
    </div>
</body>
</html>
"""
        with open(html_filepath, 'w') as f:
            f.write(html_preview)

    def get_sent_emails(self, limit: int = 50) -> list[dict]:
        return self.sent_emails[-limit:]

    def clear_sent_emails(self):
        self.sent_emails = []
