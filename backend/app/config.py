from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Construction Operations Platform"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/builder_db"

    firebase_credentials_path: str = "firebase-credentials.json"

    gcs_bucket_name: str = "builder-documents"
    gcs_credentials_path: str = "gcs-credentials.json"

    redis_url: str = "redis://localhost:6379/0"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    api_v1_prefix: str = "/api/v1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
