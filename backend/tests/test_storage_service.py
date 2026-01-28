"""
Unit tests for storage service backends.

This module tests:
- LocalStorageBackend: save_file, delete_file, get_file_url, get_file_content
- S3StorageBackend: save_file, delete_file, get_file_url, get_file_content (with mocked boto3)
- Storage path generation utilities
"""

import pytest
import uuid
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from io import BytesIO
from fastapi import UploadFile

from app.services.storage_service import (
    LocalStorageBackend,
    S3StorageBackend,
    generate_storage_path,
    get_storage_backend,
)


class TestLocalStorageBackend:
    """Test suite for LocalStorageBackend operations."""

    @pytest.mark.asyncio
    async def test_local_storage_save_file(
        self,
        temp_storage_dir: Path,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test saving a file to local storage.

        Verifies that:
        - File is saved to correct location
        - File content matches original
        - File size is returned correctly
        - Parent directories are created if needed
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test.txt",
            content_type="text/plain"
        )

        storage_path = "user123/project456/test.txt"
        file_size = await backend.save_file(mock_file, storage_path)

        # Verify file was saved
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

        # Verify file content
        with open(full_path, "rb") as f:
            saved_content = f.read()
        assert saved_content == sample_file_content

        # Verify file size
        assert file_size == len(sample_file_content)

    @pytest.mark.asyncio
    async def test_local_storage_save_file_creates_directories(
        self,
        temp_storage_dir: Path,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test that save_file creates parent directories if they don't exist.

        Verifies that nested directory structures are created automatically.
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test.txt",
            content_type="text/plain"
        )

        # Use deeply nested path that doesn't exist
        storage_path = "user/project/entity/subdir/test.txt"
        await backend.save_file(mock_file, storage_path)

        # Verify all directories were created
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()
        assert full_path.parent.exists()

    @pytest.mark.asyncio
    async def test_local_storage_delete_file(
        self,
        temp_storage_dir: Path,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test deleting a file from local storage.

        Verifies that:
        - File is removed from filesystem
        - delete_file handles existing files correctly
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        storage_path = "user123/test_delete.txt"

        # First save a file
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test_delete.txt",
            content_type="text/plain"
        )
        await backend.save_file(mock_file, storage_path)

        # Verify file exists
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

        # Delete the file
        await backend.delete_file(storage_path)

        # Verify file is deleted
        assert not full_path.exists()

    @pytest.mark.asyncio
    async def test_local_storage_delete_nonexistent_file(
        self,
        temp_storage_dir: Path
    ):
        """
        Test deleting a file that doesn't exist.

        Verifies that delete_file handles missing files gracefully
        without raising an exception.
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        storage_path = "user123/nonexistent.txt"

        # Should not raise an exception
        await backend.delete_file(storage_path)

        # Verify file still doesn't exist
        full_path = temp_storage_dir / storage_path
        assert not full_path.exists()

    def test_local_storage_get_file_url(self, temp_storage_dir: Path):
        """
        Test getting file URL for local storage.

        Verifies that:
        - URL is correctly formatted
        - URL includes the storage path
        - URL uses the API endpoint format
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        storage_path = "user123/project456/test.txt"

        url = backend.get_file_url(storage_path)

        # Verify URL format
        assert url == f"/api/v1/storage/{storage_path}"
        assert storage_path in url

    @pytest.mark.asyncio
    async def test_local_storage_get_file_content(
        self,
        temp_storage_dir: Path,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test retrieving file content from local storage.

        Verifies that:
        - File content is retrieved correctly
        - Content matches original saved content
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        storage_path = "user123/test_content.txt"

        # First save a file
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test_content.txt",
            content_type="text/plain"
        )
        await backend.save_file(mock_file, storage_path)

        # Get file content
        content = await backend.get_file_content(storage_path)

        # Verify content matches
        assert content == sample_file_content

    @pytest.mark.asyncio
    async def test_local_storage_get_file_content_not_found(
        self,
        temp_storage_dir: Path
    ):
        """
        Test getting content of a file that doesn't exist.

        Verifies that get_file_content raises FileNotFoundError
        for missing files.
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        storage_path = "user123/nonexistent.txt"

        # Should raise FileNotFoundError
        with pytest.raises(FileNotFoundError) as exc_info:
            await backend.get_file_content(storage_path)

        # Verify error message
        assert storage_path in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_local_storage_save_file_with_image(
        self,
        temp_storage_dir: Path,
        mock_upload_file,
        sample_image_content: bytes
    ):
        """
        Test saving an image file to local storage.

        Verifies that binary files (images) are handled correctly.
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        mock_file = mock_upload_file(
            content=sample_image_content,
            filename="test.png",
            content_type="image/png"
        )

        storage_path = "user123/images/test.png"
        file_size = await backend.save_file(mock_file, storage_path)

        # Verify file was saved
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

        # Verify content is binary and matches
        with open(full_path, "rb") as f:
            saved_content = f.read()
        assert saved_content == sample_image_content
        assert file_size == len(sample_image_content)

    @pytest.mark.asyncio
    async def test_local_storage_file_pointer_reset(
        self,
        temp_storage_dir: Path,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test that save_file resets file pointer after reading.

        Verifies that the file can be read again after saving,
        which is important for operations that may need to re-read the file.
        """
        backend = LocalStorageBackend(str(temp_storage_dir))
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test.txt",
            content_type="text/plain"
        )

        storage_path = "user123/test.txt"
        await backend.save_file(mock_file, storage_path)

        # Verify file pointer was reset
        content = await mock_file.read()
        assert content == sample_file_content


class TestS3StorageBackend:
    """Test suite for S3StorageBackend operations with mocked boto3."""

    @pytest.fixture
    def mock_s3_client(self):
        """
        Create a mock S3 client for testing.

        Returns a MagicMock that simulates boto3 S3 client behavior
        without making actual AWS API calls.
        """
        mock_client = MagicMock()

        # Mock put_object to simulate successful upload
        mock_client.put_object.return_value = {
            'ResponseMetadata': {'HTTPStatusCode': 200}
        }

        # Mock delete_object to simulate successful deletion
        mock_client.delete_object.return_value = {
            'ResponseMetadata': {'HTTPStatusCode': 204}
        }

        # Mock generate_presigned_url to return a fake URL
        mock_client.generate_presigned_url.return_value = (
            "https://test-bucket.s3.amazonaws.com/test-path?signature=abc123"
        )

        # Mock get_object to return file content
        mock_response = {
            'Body': MagicMock(),
            'ContentLength': 100,
            'ContentType': 'text/plain'
        }
        mock_client.get_object.return_value = mock_response

        return mock_client

    @pytest.fixture
    def s3_backend(self, mock_s3_client):
        """
        Create an S3StorageBackend instance with mocked boto3 client.

        Returns a backend configured with test credentials
        and the mocked S3 client injected.
        """
        with patch('app.services.storage_service.boto3') as mock_boto3:
            mock_boto3.client.return_value = mock_s3_client
            backend = S3StorageBackend(
                bucket_name="test-bucket",
                region="us-east-1",
                access_key_id="test-access-key",
                secret_access_key="test-secret-key"
            )
            # Force client initialization
            _ = backend.client
            yield backend

    @pytest.mark.asyncio
    async def test_s3_storage_save_file(
        self,
        s3_backend,
        mock_s3_client,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test saving a file to S3 storage.

        Verifies that:
        - File content is uploaded to S3
        - Correct bucket and key are used
        - Content type is set correctly
        - File size is returned correctly
        - File pointer is reset after reading
        """
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test.txt",
            content_type="text/plain"
        )

        storage_path = "user123/project456/test.txt"
        file_size = await s3_backend.save_file(mock_file, storage_path)

        # Verify put_object was called with correct parameters
        mock_s3_client.put_object.assert_called_once()
        call_kwargs = mock_s3_client.put_object.call_args[1]

        assert call_kwargs['Bucket'] == "test-bucket"
        assert call_kwargs['Key'] == storage_path
        assert call_kwargs['Body'] == sample_file_content
        assert call_kwargs['ContentType'] == "text/plain"

        # Verify file size
        assert file_size == len(sample_file_content)

    @pytest.mark.asyncio
    async def test_s3_storage_save_file_without_content_type(
        self,
        s3_backend,
        mock_s3_client,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test saving a file to S3 without explicit content type.

        Verifies that a default content type is used when
        the uploaded file doesn't specify one.
        """
        # Create mock file without content_type
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test.bin",
            content_type=None
        )
        # Manually set content_type to None to simulate missing content type
        mock_file.content_type = None

        storage_path = "user123/test.bin"
        await s3_backend.save_file(mock_file, storage_path)

        # Verify default content type is used
        call_kwargs = mock_s3_client.put_object.call_args[1]
        assert call_kwargs['ContentType'] == "application/octet-stream"

    @pytest.mark.asyncio
    async def test_s3_storage_save_file_with_image(
        self,
        s3_backend,
        mock_s3_client,
        mock_upload_file,
        sample_image_content: bytes
    ):
        """
        Test saving an image file to S3 storage.

        Verifies that binary files (images) are handled correctly
        with appropriate content type.
        """
        mock_file = mock_upload_file(
            content=sample_image_content,
            filename="test.png",
            content_type="image/png"
        )

        storage_path = "user123/images/test.png"
        file_size = await s3_backend.save_file(mock_file, storage_path)

        # Verify put_object was called with image content type
        call_kwargs = mock_s3_client.put_object.call_args[1]
        assert call_kwargs['ContentType'] == "image/png"
        assert call_kwargs['Body'] == sample_image_content
        assert file_size == len(sample_image_content)

    @pytest.mark.asyncio
    async def test_s3_storage_delete_file(
        self,
        s3_backend,
        mock_s3_client
    ):
        """
        Test deleting a file from S3 storage.

        Verifies that:
        - delete_object is called with correct bucket and key
        - File deletion is handled correctly
        """
        storage_path = "user123/test_delete.txt"

        await s3_backend.delete_file(storage_path)

        # Verify delete_object was called with correct parameters
        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=storage_path
        )

    def test_s3_storage_get_file_url(
        self,
        s3_backend,
        mock_s3_client
    ):
        """
        Test getting presigned URL for S3 file.

        Verifies that:
        - generate_presigned_url is called correctly
        - URL is returned with proper format
        - Correct expiration time is set
        """
        storage_path = "user123/project456/test.txt"

        url = s3_backend.get_file_url(storage_path)

        # Verify generate_presigned_url was called
        mock_s3_client.generate_presigned_url.assert_called_once_with(
            'get_object',
            Params={'Bucket': 'test-bucket', 'Key': storage_path},
            ExpiresIn=3600
        )

        # Verify URL is returned
        assert url == "https://test-bucket.s3.amazonaws.com/test-path?signature=abc123"
        assert "test-bucket" in url

    @pytest.mark.asyncio
    async def test_s3_storage_get_file_content(
        self,
        s3_backend,
        mock_s3_client,
        sample_file_content: bytes
    ):
        """
        Test retrieving file content from S3 storage.

        Verifies that:
        - get_object is called with correct parameters
        - File content is retrieved correctly
        """
        storage_path = "user123/test_content.txt"

        # Mock the Body.read() method to return sample content
        mock_body = MagicMock()
        mock_body.read.return_value = sample_file_content
        mock_s3_client.get_object.return_value = {
            'Body': mock_body,
            'ContentLength': len(sample_file_content)
        }

        content = await s3_backend.get_file_content(storage_path)

        # Verify get_object was called
        mock_s3_client.get_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=storage_path
        )

        # Verify content matches
        assert content == sample_file_content

    @pytest.mark.asyncio
    async def test_s3_storage_file_pointer_reset(
        self,
        s3_backend,
        mock_s3_client,
        mock_upload_file,
        sample_file_content: bytes
    ):
        """
        Test that save_file resets file pointer after reading.

        Verifies that the file can be read again after saving,
        which is important for operations that may need to re-read the file.
        """
        mock_file = mock_upload_file(
            content=sample_file_content,
            filename="test.txt",
            content_type="text/plain"
        )

        storage_path = "user123/test.txt"
        await s3_backend.save_file(mock_file, storage_path)

        # Verify file pointer was reset
        content = await mock_file.read()
        assert content == sample_file_content

    def test_s3_storage_client_lazy_initialization(self):
        """
        Test that S3 client is lazily initialized.

        Verifies that boto3 client is not created until first access,
        which is important for dependency injection and testing.
        """
        with patch('app.services.storage_service.boto3') as mock_boto3:
            backend = S3StorageBackend(
                bucket_name="test-bucket",
                region="us-east-1",
                access_key_id="test-key",
                secret_access_key="test-secret"
            )

            # Client should not be created yet
            mock_boto3.client.assert_not_called()

            # Access the client property
            _ = backend.client

            # Now client should be created
            mock_boto3.client.assert_called_once_with(
                's3',
                region_name="us-east-1",
                aws_access_key_id="test-key",
                aws_secret_access_key="test-secret"
            )

    def test_s3_storage_client_cached(self):
        """
        Test that S3 client is cached after first access.

        Verifies that boto3.client is only called once even
        when the client property is accessed multiple times.
        """
        with patch('app.services.storage_service.boto3') as mock_boto3:
            mock_client = MagicMock()
            mock_boto3.client.return_value = mock_client

            backend = S3StorageBackend(
                bucket_name="test-bucket",
                region="us-east-1",
                access_key_id="test-key",
                secret_access_key="test-secret"
            )

            # Access client multiple times
            client1 = backend.client
            client2 = backend.client
            client3 = backend.client

            # boto3.client should only be called once
            mock_boto3.client.assert_called_once()

            # All references should be to the same client instance
            assert client1 is client2
            assert client2 is client3


class TestGenerateStoragePath:
    """Test suite for storage path generation utility."""

    def test_generate_storage_path_format(self):
        """
        Test that generate_storage_path creates correctly formatted paths.

        Verifies that:
        - Path includes user_id, project_id, entity_type, entity_id
        - Filename is included with unique prefix
        - Path uses forward slashes as separators
        """
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        entity_id = uuid.uuid4()
        entity_type = "document"
        filename = "test_file.txt"

        path = generate_storage_path(
            user_id=user_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            filename=filename
        )

        # Verify path structure
        path_parts = path.split("/")
        assert len(path_parts) == 5
        assert path_parts[0] == str(user_id)
        assert path_parts[1] == str(project_id)
        assert path_parts[2] == entity_type
        assert path_parts[3] == str(entity_id)
        assert filename in path_parts[4]

    def test_generate_storage_path_unique(self):
        """
        Test that generate_storage_path creates unique paths.

        Verifies that multiple calls with the same parameters
        generate different paths due to unique prefix.
        """
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        entity_id = uuid.uuid4()
        entity_type = "document"
        filename = "test_file.txt"

        path1 = generate_storage_path(
            user_id=user_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            filename=filename
        )

        path2 = generate_storage_path(
            user_id=user_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            filename=filename
        )

        # Paths should be different due to unique prefix
        assert path1 != path2

    def test_generate_storage_path_spaces_in_filename(self):
        """
        Test that generate_storage_path handles filenames with spaces.

        Verifies that spaces are replaced with underscores
        to create filesystem-safe paths.
        """
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        entity_id = uuid.uuid4()
        entity_type = "document"
        filename = "test file with spaces.txt"

        path = generate_storage_path(
            user_id=user_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            filename=filename
        )

        # Verify spaces are replaced
        assert "test file with spaces" not in path
        assert "test_file_with_spaces.txt" in path

    def test_generate_storage_path_special_characters_filename(self):
        """
        Test that generate_storage_path handles various filenames.

        Verifies that the path generation works with different
        filename patterns and extensions.
        """
        user_id = uuid.uuid4()
        project_id = uuid.uuid4()
        entity_id = uuid.uuid4()
        entity_type = "image"
        filename = "my-image_file.png"

        path = generate_storage_path(
            user_id=user_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            filename=filename
        )

        # Verify filename is preserved (except spaces)
        assert "my-image_file.png" in path
        assert str(user_id) in path
        assert str(project_id) in path
        assert entity_type in path
        assert str(entity_id) in path


class TestGetStorageBackend:
    """Test suite for get_storage_backend factory function."""

    def test_get_storage_backend_returns_local(self):
        """
        Test that get_storage_backend returns LocalStorageBackend for local storage.

        Verifies that:
        - LocalStorageBackend is returned when storage_type is "local"
        - Backend is configured with correct local_storage_path
        """
        from app.config import Settings

        with patch('app.services.storage_service.get_settings') as mock_get_settings:
            mock_settings = Settings(
                environment="test",
                debug=True,
                database_url="postgresql+asyncpg://localhost/test",
                database_url_sync="postgresql://localhost/test",
                storage_type="local",
                local_storage_path="/tmp/test_storage",
            )
            mock_get_settings.return_value = mock_settings

            backend = get_storage_backend()

            # Verify correct backend type is returned
            assert isinstance(backend, LocalStorageBackend)
            assert backend.base_path == Path("/tmp/test_storage")

    def test_get_storage_backend_returns_s3(self):
        """
        Test that get_storage_backend returns S3StorageBackend for S3 storage.

        Verifies that:
        - S3StorageBackend is returned when storage_type is "s3"
        - Backend is configured with correct S3 settings
        """
        from app.config import Settings

        with patch('app.services.storage_service.get_settings') as mock_get_settings:
            mock_settings = Settings(
                environment="test",
                debug=True,
                database_url="postgresql+asyncpg://localhost/test",
                database_url_sync="postgresql://localhost/test",
                storage_type="s3",
                s3_bucket_name="test-bucket",
                s3_region="us-west-2",
                s3_access_key_id="test-access-key",
                s3_secret_access_key="test-secret-key",
            )
            mock_get_settings.return_value = mock_settings

            backend = get_storage_backend()

            # Verify correct backend type is returned
            assert isinstance(backend, S3StorageBackend)
            assert backend.bucket_name == "test-bucket"
            assert backend.region == "us-west-2"
            assert backend.access_key_id == "test-access-key"
            assert backend.secret_access_key == "test-secret-key"

    def test_get_storage_backend_default_to_local(self):
        """
        Test that get_storage_backend defaults to LocalStorageBackend.

        Verifies that when storage_type is not "s3",
        the factory returns LocalStorageBackend.
        """
        from app.config import Settings

        with patch('app.services.storage_service.get_settings') as mock_get_settings:
            mock_settings = Settings(
                environment="test",
                debug=True,
                database_url="postgresql+asyncpg://localhost/test",
                database_url_sync="postgresql://localhost/test",
                storage_type="unknown",  # Any value other than "s3"
                local_storage_path="/tmp/fallback_storage",
            )
            mock_get_settings.return_value = mock_settings

            backend = get_storage_backend()

            # Verify LocalStorageBackend is returned as default
            assert isinstance(backend, LocalStorageBackend)
            assert backend.base_path == Path("/tmp/fallback_storage")
