from functools import lru_cache

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

    redis_url: str = "redis://localhost:6379/0"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    api_v1_prefix: str = "/api/v1"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    chat_max_history: int = 20

    frontend_base_url: str = "http://localhost:5173"

    email_provider: str = "fake"
    rfi_email_domain: str = "builderops.co.il"
    rfi_email_address: str = "rfis@example.com"
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""
    sendgrid_from_name: str = "Construction Platform"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
