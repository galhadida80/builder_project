import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.user import User
from app.models.project import Project
from uuid import uuid4


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session():
    """Create test database session"""
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/test_builder_db")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def test_user(db_session):
    """Create test user"""
    user = User(id=uuid4(), email="test@example.com", full_name="Test User")
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.fixture
async def test_project(db_session, test_user):
    """Create test project"""
    project = Project(id=uuid4(), name="Test Project", created_by_id=test_user.id)
    db_session.add(project)
    await db_session.commit()
    return project
