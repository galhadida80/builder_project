import logging
import warnings
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

WEAK_SECRET_PATTERNS = [
    "dev-secret", "change-in-production", "secret", "password",
    "123456", "default", "test", "example",
]


class Settings(BaseSettings):
    app_name: str = "Construction Operations Platform"
    debug: bool = False
    environment: str = "development"

    secret_key: str = "dev-secret-key-change-in-production-use-strong-random-key"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/builder_db"

    firebase_credentials_path: str = "firebase-credentials.json"

    storage_type: str = "local"
    local_storage_path: str = "./uploads"

    s3_bucket_name: str = ""
    s3_region: str = "us-east-1"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""

    gcs_bucket_name: str = ""
    gcs_project_id: str = ""

    redis_url: str = "redis://localhost:6379/0"

    rate_limit_enabled: bool = True
    rate_limit_auth_window: int = 300
    rate_limit_auth_max_requests: int = 5
    rate_limit_default_window: int = 60
    rate_limit_default_max_requests: int = 100

    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:8000"

    api_v1_prefix: str = "/api/v1"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    chat_max_history: int = 50

    frontend_base_url: str = "http://localhost:5173"
    backend_base_url: str = "http://localhost:8000"

    # Email Configuration
    # ==================
    # Email provider to use: "fake" (development/testing), "sendgrid" (production), or "gmail"
    # - fake: Logs emails to console without sending (safe for development)
    # - sendgrid: Uses SendGrid API (requires SENDGRID_API_KEY)
    # - gmail: Uses Gmail OAuth (requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)
    email_provider: str = "fake"

    # RFI (Request for Information) Email Configuration
    # Domain for RFI email addresses (e.g., "gmail.com", "company.com")
    rfi_email_domain: str = "gmail.com"
    # Default email address for RFI notifications
    rfi_email_address: str = "kodkod800@gmail.com"

    # SendGrid Email Provider Configuration
    # API key for SendGrid service (required when email_provider="sendgrid")
    # Generate at: https://app.sendgrid.com/settings/api_keys
    # CRITICAL: Never commit this value - use environment variables or secrets
    # In Cloud Run: Set as environment variable or use Secret Manager
    sendgrid_api_key: str = ""
    # "From" email address for SendGrid emails (must be verified in SendGrid)
    # Verify at: https://app.sendgrid.com/settings/sender_auth/senders
    sendgrid_from_email: str = "kodkod800@gmail.com"
    # "From" name displayed in email client (shown in recipient's inbox)
    sendgrid_from_name: str = "BuilderOps"

    scheduler_secret: str = "dev-scheduler-secret-change-in-production"

    aps_client_id: str = ""
    aps_client_secret: str = ""
    aps_callback_url: str = "http://localhost:8000/api/v1/bim/callback"

    # Gmail Email Provider Configuration (OAuth 2.0)
    # Required when email_provider="gmail"
    # OAuth 2.0 Client ID from Google Cloud Console
    # Generate at: https://console.cloud.google.com/apis/credentials
    # Enable Gmail API at: https://console.cloud.google.com/apis/library/gmail.googleapis.com
    gmail_client_id: str = ""
    # OAuth 2.0 Client Secret from Google Cloud Console
    gmail_client_secret: str = ""
    # OAuth 2.0 Refresh Token (obtained via OAuth flow)
    # Used to obtain access tokens for Gmail API access
    # Obtain via: https://developers.google.com/oauthplayground/ with Gmail API scope
    gmail_refresh_token: str = ""

    ical_feed_secret: str = "dev-ical-feed-secret-change-in-production"

    google_auth_client_id: str = ""

    google_calendar_client_id: str = ""
    google_calendar_client_secret: str = ""
    google_calendar_redirect_uri: str = "http://localhost:8000/api/v1/calendar/callback"

    google_pubsub_topic: str = ""
    google_pubsub_audience: str = ""
    google_pubsub_verify: bool = True

    webhook_secret: str = ""

    rasterscan_url: str = ""

    docai_processor_id: str = ""
    docai_location: str = "eu"
    docai_project_id: str = ""

    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "BuilderOps"

    @model_validator(mode='after')
    def validate_production_secrets(self) -> 'Settings':
        generation_cmd = "python -c \"import secrets; print(secrets.token_urlsafe(32))\""

        if self.environment == 'production':
            if self.secret_key == "dev-secret-key-change-in-production-use-strong-random-key":
                logger.warning(
                    f'SECRET_KEY is using the default value in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )
            elif len(self.secret_key) < 32:
                logger.warning(
                    f'SECRET_KEY should be at least 32 characters in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )

            if self.scheduler_secret == "dev-scheduler-secret-change-in-production":
                logger.warning(
                    f'SCHEDULER_SECRET is using the default value in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )
            elif len(self.scheduler_secret) < 32:
                logger.warning(
                    f'SCHEDULER_SECRET should be at least 32 characters in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )

            if self.webhook_secret and len(self.webhook_secret) < 32:
                logger.warning(
                    f'WEBHOOK_SECRET should be at least 32 characters in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )

        else:
            default_key = "dev-secret-key-change-in-production-use-strong-random-key"
            if self.secret_key == default_key:
                warnings.warn(
                    "SECRET_KEY is using the default development value. "
                    f"Generate a strong secret using: {generation_cmd}",
                    stacklevel=2,
                )
            elif any(pattern in self.secret_key.lower() for pattern in WEAK_SECRET_PATTERNS):
                warnings.warn(
                    "SECRET_KEY appears weak. Consider using a stronger secret "
                    f"even in development: {generation_cmd}",
                    stacklevel=2,
                )

        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
