"""
Pytest configuration and shared fixtures for backend tests.

This module provides:
- Async test support via pytest-asyncio
- Test database session fixtures
- Test client fixture for FastAPI app
- Temporary storage directory fixtures
- Mock file upload fixtures
"""

import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import AsyncGenerator, Generator
from io import BytesIO

from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.db.session import Base, get_db
from app.config import Settings, get_settings
from app.core.security import get_current_user
from app.models.user import User


# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """
    Test-specific settings override.

    Returns settings configured for test environment with:
    - Test database URL
    - Local storage backend
    - Test storage path
    """
    return Settings(
        environment="test",
        debug=True,
        database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db_test",
        database_url_sync="postgresql://postgres:postgres@localhost:5432/builder_db_test",
        storage_type="local",
        local_storage_path="./test_uploads",
    )


@pytest.fixture
async def test_engine(test_settings: Settings):
    """
    Create async database engine for tests.

    Uses NullPool to avoid connection pooling issues in tests.
    Creates all tables before tests and drops them after.
    """
    engine = create_async_engine(
        test_settings.database_url,
        echo=test_settings.debug,
        poolclass=NullPool,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a transactional database session for each test.

    Each test gets a clean database session that is rolled back
    after the test completes to ensure test isolation.
    """
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        async with session.begin():
            yield session
            await session.rollback()


@pytest.fixture
def override_get_settings(test_settings: Settings):
    """
    Override the get_settings dependency for tests.

    This ensures all parts of the app use test settings
    instead of production settings.
    """
    # Clear the lru_cache so test settings are used
    get_settings.cache_clear()
    app.dependency_overrides[get_settings] = lambda: test_settings
    yield
    app.dependency_overrides.clear()
    # Clear cache again after test
    get_settings.cache_clear()


@pytest.fixture
def client(override_get_settings) -> Generator[TestClient, None, None]:
    """
    Provide a synchronous FastAPI test client.

    Use this for testing endpoints that don't require async operations.
    The client automatically uses test database and settings.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def test_db_user(test_engine) -> User:
    """
    Create a test user in the database for authentication.

    Returns a User instance that persists across the test.
    """
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        user = User(
            firebase_uid="test-auth-uid",
            email="testauth@example.com",
            full_name="Test Auth User",
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        yield user
        # Cleanup happens automatically when test database is dropped


@pytest.fixture
async def async_client(override_get_settings, test_engine, test_db_user) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async FastAPI test client.

    Use this for testing async endpoints and operations.
    The client automatically uses test database and settings.
    """
    # Override get_db to use test database
    async def _get_test_db():
        async_session = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with async_session() as session:
            yield session

    # Override get_current_user to return test user
    async def _get_current_test_user():
        return test_db_user

    app.dependency_overrides[get_db] = _get_test_db
    app.dependency_overrides[get_current_user] = _get_current_test_user

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def async_client_no_auth(override_get_settings, test_engine) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async FastAPI test client without authentication override.

    Use this for testing endpoints that require authentication checks.
    The client uses test database but does NOT override get_current_user.
    """
    # Override get_db to use test database
    async def _get_test_db():
        async_session = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def temp_storage_dir(test_settings: Settings) -> Generator[Path, None, None]:
    """
    Provide a temporary storage directory for file upload tests.

    Creates a temp directory before each test and cleans it up after.
    This ensures file storage tests don't interfere with each other.
    """
    storage_path = Path(test_settings.local_storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)

    yield storage_path

    # Clean up after test
    if storage_path.exists():
        shutil.rmtree(storage_path)


@pytest.fixture
def mock_upload_file():
    """
    Create a mock UploadFile object for testing file uploads.

    Returns a factory function that creates mock files with custom
    content, filename, and content type.

    Usage:
        file = mock_upload_file(
            content=b"test content",
            filename="test.txt",
            content_type="text/plain"
        )
    """
    def _create_mock_file(
        content: bytes = b"test file content",
        filename: str = "test.txt",
        content_type: str = "text/plain"
    ):
        from fastapi import UploadFile

        file_obj = BytesIO(content)
        return UploadFile(
            file=file_obj,
            filename=filename,
            headers={"content-type": content_type}
        )

    return _create_mock_file


@pytest.fixture
def sample_file_content() -> bytes:
    """
    Provide sample file content for testing.

    Returns a bytes object with sample text content.
    """
    return b"This is a test file with some sample content for testing file storage."


@pytest.fixture
def sample_image_content() -> bytes:
    """
    Provide sample image content for testing.

    Returns a minimal valid PNG file as bytes.
    This is a 1x1 transparent PNG.
    """
    return (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01'
        b'\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    )
