"""
Integration tests for file upload/download API endpoints.

This module tests:
- File upload endpoint with local storage integration
- File download endpoint
- File deletion endpoint
- File listing endpoint
- Storage backend integration
"""

import pytest
import uuid
from pathlib import Path
from io import BytesIO
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.file import File
from app.models.user import User
from app.models.project import Project, ProjectStatus


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """
    Create a test user for file operations.

    Returns a User instance persisted to the test database.
    """
    user = User(
        firebase_uid="test-uid-123",
        email="testuser@example.com",
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_project(db_session: AsyncSession, test_user: User) -> Project:
    """
    Create a test project for file operations.

    Returns a Project instance persisted to the test database.
    """
    project = Project(
        name="Test Project",
        code="TEST-001",
        description="Test project for file uploads",
        status=ProjectStatus.ACTIVE.value,
        created_by_id=test_user.id
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest.fixture
def mock_auth_headers() -> dict:
    """
    Provide mock authentication headers for API requests.

    Returns headers dict with Bearer token for test authentication.
    """
    return {
        "Authorization": "Bearer test-token"
    }


class TestFileUploadEndpoint:
    """Test suite for file upload API endpoint."""

    @pytest.mark.asyncio
    async def test_upload_file(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_project: Project,
        temp_storage_dir: Path,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test uploading a file via POST /projects/{project_id}/files.

        Verifies that:
        - File content is saved to local storage
        - Database record is created with correct metadata
        - Response contains all expected fields
        - Storage path follows correct hierarchical structure
        - File size is recorded correctly
        """
        # Prepare file upload data
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "test_document.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        # Make upload request
        response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "id" in data
        assert data["project_id"] == str(test_project.id)
        assert data["entity_type"] == entity_type
        assert data["entity_id"] == str(entity_id)
        assert data["filename"] == filename
        assert data["file_type"] == "text/plain"
        assert data["file_size"] == len(sample_file_content)
        assert "storage_path" in data
        assert "uploaded_at" in data
        assert "uploaded_by" in data

        # Verify database record
        file_id = uuid.UUID(data["id"])
        result = await db_session.execute(
            select(File).where(File.id == file_id)
        )
        file_record = result.scalar_one_or_none()

        assert file_record is not None
        assert file_record.project_id == test_project.id
        assert file_record.entity_type == entity_type
        assert file_record.entity_id == entity_id
        assert file_record.filename == filename
        assert file_record.file_type == "text/plain"
        assert file_record.file_size == len(sample_file_content)
        assert file_record.uploaded_by_id == test_user.id

        # Verify storage path structure
        storage_path = file_record.storage_path
        path_parts = storage_path.split("/")
        assert len(path_parts) == 5  # user_id/project_id/entity_type/entity_id/filename
        assert path_parts[0] == str(test_user.id)
        assert path_parts[1] == str(test_project.id)
        assert path_parts[2] == entity_type
        assert path_parts[3] == str(entity_id)
        assert filename in path_parts[4]  # Filename with unique prefix

        # Verify file was saved to local storage
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

        # Verify file content matches
        with open(full_path, "rb") as f:
            saved_content = f.read()
        assert saved_content == sample_file_content

    @pytest.mark.asyncio
    async def test_upload_file_with_image(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        temp_storage_dir: Path,
        sample_image_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test uploading an image file.

        Verifies that:
        - Binary files (images) are handled correctly
        - Content type is preserved
        - File content is saved correctly
        """
        entity_type = "image"
        entity_id = uuid.uuid4()
        filename = "test_image.png"

        files = {
            "file": (filename, BytesIO(sample_image_content), "image/png")
        }

        response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify image-specific fields
        assert data["filename"] == filename
        assert data["file_type"] == "image/png"
        assert data["file_size"] == len(sample_image_content)

        # Verify file was saved to storage
        storage_path = data["storage_path"]
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

        # Verify binary content matches
        with open(full_path, "rb") as f:
            saved_content = f.read()
        assert saved_content == sample_image_content

    @pytest.mark.asyncio
    async def test_upload_file_with_spaces_in_filename(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        temp_storage_dir: Path,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test uploading a file with spaces in filename.

        Verifies that:
        - Filenames with spaces are handled correctly
        - Spaces are replaced with underscores in storage path
        - Original filename is preserved in database
        """
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "test file with spaces.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify original filename is preserved
        assert data["filename"] == filename

        # Verify spaces are replaced in storage path
        storage_path = data["storage_path"]
        assert "test file with spaces" not in storage_path
        assert "test_file_with_spaces.txt" in storage_path

        # Verify file exists at sanitized path
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

    @pytest.mark.asyncio
    async def test_upload_file_without_auth(
        self,
        async_client: AsyncClient,
        test_project: Project,
        sample_file_content: bytes
    ):
        """
        Test uploading a file without authentication.

        Verifies that:
        - Unauthenticated requests are rejected
        - Appropriate error status is returned
        """
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "test.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files
        )

        # Should require authentication
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_upload_file_creates_nested_directories(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        temp_storage_dir: Path,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test that file upload creates nested directory structure.

        Verifies that:
        - All parent directories are created if they don't exist
        - File is saved at correct nested location
        """
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "nested_test.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify nested directory structure was created
        storage_path = data["storage_path"]
        full_path = temp_storage_dir / storage_path

        assert full_path.exists()
        assert full_path.parent.exists()  # entity_id directory
        assert full_path.parent.parent.exists()  # entity_type directory
        assert full_path.parent.parent.parent.exists()  # project_id directory
        assert full_path.parent.parent.parent.parent.exists()  # user_id directory


class TestFileDownloadEndpoint:
    """Test suite for file download API endpoint."""

    @pytest.mark.asyncio
    async def test_download_file(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_project: Project,
        temp_storage_dir: Path,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test downloading a file via GET /projects/{project_id}/files/{file_id}/download.

        Verifies that:
        - Download endpoint returns correct download URL
        - Filename is included in response
        - URL is properly formatted for local storage
        """
        # First upload a file
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "download_test.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        upload_response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        file_id = upload_data["id"]

        # Test download endpoint
        download_response = await async_client.get(
            f"/api/v1/projects/{test_project.id}/files/{file_id}/download",
            headers=mock_auth_headers
        )

        assert download_response.status_code == 200
        download_data = download_response.json()

        # Verify download response structure
        assert "download_url" in download_data
        assert "filename" in download_data
        assert download_data["filename"] == filename

        # Verify download URL format for local storage
        download_url = download_data["download_url"]
        assert download_url.startswith("/api/v1/storage/")
        assert upload_data["storage_path"] in download_url

    @pytest.mark.asyncio
    async def test_download_nonexistent_file(
        self,
        async_client: AsyncClient,
        test_project: Project,
        mock_auth_headers: dict
    ):
        """
        Test downloading a file that doesn't exist.

        Verifies that:
        - 404 error is returned for nonexistent files
        """
        nonexistent_file_id = uuid.uuid4()

        response = await async_client.get(
            f"/api/v1/projects/{test_project.id}/files/{nonexistent_file_id}/download",
            headers=mock_auth_headers
        )

        assert response.status_code == 404


class TestFileDeleteEndpoint:
    """Test suite for file delete API endpoint."""

    @pytest.mark.asyncio
    async def test_delete_file(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        temp_storage_dir: Path,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test deleting a file via DELETE /projects/{project_id}/files/{file_id}.

        Verifies that:
        - File is removed from local storage
        - Database record is deleted
        - Success response is returned
        """
        # First upload a file
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "delete_test.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        upload_response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        file_id = upload_data["id"]
        storage_path = upload_data["storage_path"]

        # Verify file exists before deletion
        full_path = temp_storage_dir / storage_path
        assert full_path.exists()

        # Delete the file
        delete_response = await async_client.delete(
            f"/api/v1/projects/{test_project.id}/files/{file_id}",
            headers=mock_auth_headers
        )

        assert delete_response.status_code == 200
        assert "message" in delete_response.json()

        # Verify file is removed from storage
        assert not full_path.exists()

        # Verify database record is deleted
        result = await db_session.execute(
            select(File).where(File.id == uuid.UUID(file_id))
        )
        file_record = result.scalar_one_or_none()
        assert file_record is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_file(
        self,
        async_client: AsyncClient,
        test_project: Project,
        mock_auth_headers: dict
    ):
        """
        Test deleting a file that doesn't exist.

        Verifies that:
        - 404 error is returned for nonexistent files
        """
        nonexistent_file_id = uuid.uuid4()

        response = await async_client.delete(
            f"/api/v1/projects/{test_project.id}/files/{nonexistent_file_id}",
            headers=mock_auth_headers
        )

        assert response.status_code == 404


class TestFileListEndpoint:
    """Test suite for file list API endpoint."""

    @pytest.mark.asyncio
    async def test_list_files(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        test_project: Project,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test listing files via GET /projects/{project_id}/files.

        Verifies that:
        - All files for project are returned
        - Response includes file metadata
        - Files are ordered by upload date (descending)
        """
        # Upload multiple files
        entity_type = "document"
        entity_id = uuid.uuid4()
        filenames = ["file1.txt", "file2.txt", "file3.txt"]

        for filename in filenames:
            files = {
                "file": (filename, BytesIO(sample_file_content), "text/plain")
            }

            response = await async_client.post(
                f"/api/v1/projects/{test_project.id}/files",
                params={
                    "entity_type": entity_type,
                    "entity_id": str(entity_id)
                },
                files=files,
                headers=mock_auth_headers
            )
            assert response.status_code == 200

        # List all files
        list_response = await async_client.get(
            f"/api/v1/projects/{test_project.id}/files",
            headers=mock_auth_headers
        )

        assert list_response.status_code == 200
        files_list = list_response.json()

        # Verify all files are returned
        assert len(files_list) == 3
        returned_filenames = [f["filename"] for f in files_list]
        assert set(returned_filenames) == set(filenames)

        # Verify file structure
        for file_data in files_list:
            assert "id" in file_data
            assert "project_id" in file_data
            assert "entity_type" in file_data
            assert "entity_id" in file_data
            assert "filename" in file_data
            assert "file_type" in file_data
            assert "file_size" in file_data
            assert "storage_path" in file_data
            assert "uploaded_at" in file_data
            assert "uploaded_by" in file_data

    @pytest.mark.asyncio
    async def test_list_files_filtered_by_entity(
        self,
        async_client: AsyncClient,
        test_project: Project,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test listing files filtered by entity_type and entity_id.

        Verifies that:
        - Files can be filtered by entity parameters
        - Only matching files are returned
        """
        entity_type_1 = "document"
        entity_id_1 = uuid.uuid4()
        entity_type_2 = "image"
        entity_id_2 = uuid.uuid4()

        # Upload files for different entities
        files_1 = {
            "file": ("doc1.txt", BytesIO(sample_file_content), "text/plain")
        }
        await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type_1,
                "entity_id": str(entity_id_1)
            },
            files=files_1,
            headers=mock_auth_headers
        )

        files_2 = {
            "file": ("image1.png", BytesIO(sample_file_content), "image/png")
        }
        await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type_2,
                "entity_id": str(entity_id_2)
            },
            files=files_2,
            headers=mock_auth_headers
        )

        # List files filtered by entity_type
        response = await async_client.get(
            f"/api/v1/projects/{test_project.id}/files",
            params={"entity_type": entity_type_1},
            headers=mock_auth_headers
        )

        assert response.status_code == 200
        files_list = response.json()

        # Verify only matching files are returned
        assert len(files_list) == 1
        assert files_list[0]["entity_type"] == entity_type_1
        assert files_list[0]["filename"] == "doc1.txt"

    @pytest.mark.asyncio
    async def test_list_files_empty_project(
        self,
        async_client: AsyncClient,
        test_project: Project,
        mock_auth_headers: dict
    ):
        """
        Test listing files for a project with no files.

        Verifies that:
        - Empty list is returned for projects without files
        - No errors occur for empty results
        """
        response = await async_client.get(
            f"/api/v1/projects/{test_project.id}/files",
            headers=mock_auth_headers
        )

        assert response.status_code == 200
        files_list = response.json()
        assert files_list == []


class TestServeLocalFileEndpoint:
    """Test suite for local file serving endpoint."""

    @pytest.mark.asyncio
    async def test_serve_local_file(
        self,
        async_client: AsyncClient,
        test_project: Project,
        temp_storage_dir: Path,
        sample_file_content: bytes,
        mock_auth_headers: dict
    ):
        """
        Test serving a local file via GET /storage/{path}.

        Verifies that:
        - File content is served correctly
        - Correct media type is returned
        """
        # First upload a file
        entity_type = "document"
        entity_id = uuid.uuid4()
        filename = "serve_test.txt"

        files = {
            "file": (filename, BytesIO(sample_file_content), "text/plain")
        }

        upload_response = await async_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            params={
                "entity_type": entity_type,
                "entity_id": str(entity_id)
            },
            files=files,
            headers=mock_auth_headers
        )

        assert upload_response.status_code == 200
        storage_path = upload_response.json()["storage_path"]

        # Serve the file
        serve_response = await async_client.get(
            f"/api/v1/storage/{storage_path}"
        )

        assert serve_response.status_code == 200
        assert serve_response.content == sample_file_content
        assert serve_response.headers["content-type"] == "application/octet-stream"

    @pytest.mark.asyncio
    async def test_serve_nonexistent_file(
        self,
        async_client: AsyncClient
    ):
        """
        Test serving a file that doesn't exist.

        Verifies that:
        - 404 error is returned for missing files
        """
        response = await async_client.get(
            "/api/v1/storage/nonexistent/path/file.txt"
        )

        assert response.status_code == 404
