from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


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

    email_provider: str = "fake"
    rfi_email_domain: str = "builderops.co.il"
    rfi_email_address: str = "rfis@example.com"
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""
    sendgrid_from_name: str = "Construction Platform"

    scheduler_secret: str = "dev-scheduler-secret-change-in-production"

    aps_client_id: str = ""
    aps_client_secret: str = ""
    aps_callback_url: str = "http://localhost:8000/api/v1/bim/callback"

    webauthn_rp_id: str = "localhost"
    webauthn_rp_name: str = "BuilderOps"

    @model_validator(mode='after')
    def validate_production_secrets(self) -> 'Settings':
        if self.environment == 'production':
            generation_cmd = "python -c \"import secrets; print(secrets.token_urlsafe(32))\""

            # Validate secret_key
            if self.secret_key == "dev-secret-key-change-in-production-use-strong-random-key":
                raise ValueError(
                    f'SECRET_KEY must be changed from default value in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )
            if len(self.secret_key) < 32:
                raise ValueError(
                    f'SECRET_KEY must be at least 32 characters in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )
            if not any(c.isalnum() for c in self.secret_key):
                raise ValueError(
                    f'SECRET_KEY must contain alphanumeric characters. '
                    f'Generate a strong secret using: {generation_cmd}'
                )

            # Validate scheduler_secret
            if self.scheduler_secret == "dev-scheduler-secret-change-in-production":
                raise ValueError(
                    f'SCHEDULER_SECRET must be changed from default value in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )
            if len(self.scheduler_secret) < 32:
                raise ValueError(
                    f'SCHEDULER_SECRET must be at least 32 characters in production. '
                    f'Generate a strong secret using: {generation_cmd}'
                )
            if not any(c.isalnum() for c in self.scheduler_secret):
                raise ValueError(
                    f'SCHEDULER_SECRET must contain alphanumeric characters. '
                    f'Generate a strong secret using: {generation_cmd}'
                )

        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
