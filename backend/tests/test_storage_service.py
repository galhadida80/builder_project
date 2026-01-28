"""
Unit tests for storage service backends.

This module tests:
- LocalStorageBackend: save_file, delete_file, get_file_url, get_file_content
- Storage path generation utilities
"""

import pytest
import uuid
from pathlib import Path
from fastapi import UploadFile

from app.services.storage_service import (
    LocalStorageBackend,
    generate_storage_path,
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
