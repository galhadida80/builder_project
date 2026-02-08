import logging
from typing import Optional, Protocol
from app.config import get_settings

logger = logging.getLogger(__name__)


class EmailProvider(Protocol):
    enabled: bool

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
        ...


class EmailService:
    def __init__(self):
        self.settings = get_settings()
        self.provider: Optional[EmailProvider] = None
        self._initialize_provider()

    def _initialize_provider(self):
        provider_type = self.settings.email_provider.lower()

        if provider_type == "fake":
            from app.services.fake_email_service import FakeEmailService
            self.provider = FakeEmailService()
            logger.info("Using fake email service")
        elif provider_type == "sendgrid":
            from app.services.sendgrid_service import SendGridService
            self.provider = SendGridService()
        elif provider_type == "gmail":
            from app.services.gmail_service import GmailService
            self.provider = GmailService()
        else:
            from app.services.fake_email_service import FakeEmailService
            self.provider = FakeEmailService()
            logger.warning(f"Unknown email provider '{provider_type}', using fake service")

    @property
    def enabled(self) -> bool:
        return self.provider is not None and self.provider.enabled

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
            raise RuntimeError("Email service is not configured")

        return self.provider.send_rfi_email(
            rfi_number=rfi_number,
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            cc_emails=cc_emails,
            attachments=attachments,
            in_reply_to=in_reply_to,
            references=references,
            from_email=from_email
        )

    def send_notification(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> dict:
        if not self.enabled:
            raise RuntimeError("Email service is not configured")

        if hasattr(self.provider, 'send_notification_email'):
            return self.provider.send_notification_email(
                to_email=to_email,
                subject=subject,
                body_html=body_html,
                body_text=body_text
            )

        return self.provider.send_rfi_email(
            rfi_number="NOTIFY",
            to_email=to_email,
            subject=subject,
            body_html=body_html
        )
