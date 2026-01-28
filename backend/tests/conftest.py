"""
Pytest configuration and shared fixtures for backend tests
"""
import pytest
import pytest_asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.session import Base
from app.models.project import Project
from app.models.user import User


# Test database URL - uses a separate test database
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db_test"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create a test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop all tables after test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Provide a database session for tests"""
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def sample_project(db_session):
    """Create a sample project for testing"""
    project = Project(
        name="Test Project",
        code="TEST-001",
        description="Test project for inspection tests"
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest_asyncio.fixture
async def sample_user(db_session):
    """Create a sample user for testing"""
    user = User(
        email="inspector@test.com",
        first_name="Test",
        last_name="Inspector"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user
