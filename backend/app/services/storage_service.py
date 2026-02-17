import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import Depends, UploadFile

from app.config import Settings, get_settings
from app.core.validation import validate_storage_path

try:
    import boto3
except ImportError:
    boto3 = None

try:
    from google.cloud import storage as gcs_storage
except ImportError:
    gcs_storage = None


class StorageBackend(ABC):
    @abstractmethod
    async def save_file(self, file: UploadFile, storage_path: str) -> int:
        pass

    @abstractmethod
    async def save_bytes(self, content: bytes, storage_path: str, content_type: str = "application/octet-stream") -> int:
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

    async def save_bytes(self, content: bytes, storage_path: str, content_type: str = "application/octet-stream") -> int:
        full_path = self.base_path / storage_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        return len(content)

    async def delete_file(self, storage_path: str) -> None:
        full_path = self.base_path / storage_path
        if full_path.exists():
            full_path.unlink()

    def get_file_url(self, storage_path: str) -> str:
        return f"/api/v1/storage/{storage_path}"

    async def get_file_content(self, storage_path: str) -> bytes:
        # Validate path to prevent directory traversal attacks
        validate_storage_path(storage_path, str(self.base_path))
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
            if boto3 is None:
                raise ImportError("boto3 is required for S3 storage backend")
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

    async def save_bytes(self, content: bytes, storage_path: str, content_type: str = "application/octet-stream") -> int:
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=storage_path,
            Body=content,
            ContentType=content_type,
        )
        return len(content)

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


class GCSStorageBackend(StorageBackend):
    def __init__(self, bucket_name: str, project_id: str = ""):
        if gcs_storage is None:
            raise ImportError("google-cloud-storage is required for GCS storage backend")
        self.bucket_name = bucket_name
        client_kwargs = {}
        if project_id:
            client_kwargs["project"] = project_id
        self.client = gcs_storage.Client(**client_kwargs)
        self.bucket = self.client.bucket(bucket_name)

    async def save_file(self, file: UploadFile, storage_path: str) -> int:
        content = await file.read()
        file_size = len(content)
        blob = self.bucket.blob(storage_path)
        blob.upload_from_string(content, content_type=file.content_type or "application/octet-stream")
        await file.seek(0)
        return file_size

    async def save_bytes(self, content: bytes, storage_path: str, content_type: str = "application/octet-stream") -> int:
        blob = self.bucket.blob(storage_path)
        blob.upload_from_string(content, content_type=content_type)
        return len(content)

    async def delete_file(self, storage_path: str) -> None:
        blob = self.bucket.blob(storage_path)
        blob.delete()

    def get_file_url(self, storage_path: str) -> str:
        blob = self.bucket.blob(storage_path)
        return blob.generate_signed_url(expiration=3600, version="v4")

    async def get_file_content(self, storage_path: str) -> bytes:
        blob = self.bucket.blob(storage_path)
        return blob.download_as_bytes()


def _create_storage_backend(settings: Settings) -> StorageBackend:
    """Core function to create storage backend from settings.

    This function is separated to allow easy testing while still
    supporting FastAPI's dependency injection.
    """
    if settings.storage_type == "s3":
        return S3StorageBackend(
            bucket_name=settings.s3_bucket_name,
            region=settings.s3_region,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key
        )
    if settings.storage_type == "gcs":
        return GCSStorageBackend(
            bucket_name=settings.gcs_bucket_name,
            project_id=settings.gcs_project_id
        )
    return LocalStorageBackend(settings.local_storage_path)


def get_storage_backend(settings: Settings = Depends(get_settings)) -> StorageBackend:
    """FastAPI dependency that provides the configured storage backend.

    This function uses Depends() to integrate with FastAPI's dependency
    injection system while delegating to _create_storage_backend for the
    core logic.
    """
    return _create_storage_backend(settings)


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
