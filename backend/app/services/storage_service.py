import os
import uuid
from pathlib import Path
from abc import ABC, abstractmethod
from fastapi import UploadFile
from app.config import get_settings


class StorageBackend(ABC):
    @abstractmethod
    async def save_file(self, file: UploadFile, storage_path: str) -> int:
        pass

    @abstractmethod
    async def delete_file(self, storage_path: str) -> None:
        pass

    @abstractmethod
    def get_file_url(self, storage_path: str) -> str:
        pass

    @abstractmethod
    async def get_file_content(self, storage_path: str) -> bytes:
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file: UploadFile, storage_path: str) -> int:
        full_path = self.base_path / storage_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        content = await file.read()
        file_size = len(content)
        with open(full_path, "wb") as f:
            f.write(content)
        await file.seek(0)
        return file_size

    async def delete_file(self, storage_path: str) -> None:
        full_path = self.base_path / storage_path
        if full_path.exists():
            full_path.unlink()

    def get_file_url(self, storage_path: str) -> str:
        return f"/api/v1/storage/{storage_path}"

    async def get_file_content(self, storage_path: str) -> bytes:
        full_path = self.base_path / storage_path
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {storage_path}")
        with open(full_path, "rb") as f:
            return f.read()


class S3StorageBackend(StorageBackend):
    def __init__(self, bucket_name: str, region: str, access_key_id: str, secret_access_key: str):
        self.bucket_name = bucket_name
        self.region = region
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client(
                's3',
                region_name=self.region,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key
            )
        return self._client

    async def save_file(self, file: UploadFile, storage_path: str) -> int:
        content = await file.read()
        file_size = len(content)
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=storage_path,
            Body=content,
            ContentType=file.content_type or "application/octet-stream"
        )
        await file.seek(0)
        return file_size

    async def delete_file(self, storage_path: str) -> None:
        self.client.delete_object(Bucket=self.bucket_name, Key=storage_path)

    def get_file_url(self, storage_path: str) -> str:
        url = self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': storage_path},
            ExpiresIn=3600
        )
        return url

    async def get_file_content(self, storage_path: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket_name, Key=storage_path)
        return response['Body'].read()


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.storage_type == "s3":
        return S3StorageBackend(
            bucket_name=settings.s3_bucket_name,
            region=settings.s3_region,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key
        )
    return LocalStorageBackend(settings.local_storage_path)


def generate_storage_path(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    filename: str
) -> str:
    safe_filename = filename.replace(" ", "_")
    unique_prefix = uuid.uuid4().hex[:8]
    return f"{user_id}/{project_id}/{entity_type}/{entity_id}/{unique_prefix}_{safe_filename}"
