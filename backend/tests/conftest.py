import os
import uuid
import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User
from app.models.project import Project
from app.models.equipment_template import EquipmentTemplate
from app.models.equipment_submission import EquipmentSubmission
from app.models.approval_decision import ApprovalDecision

# Test database URL (using SQLite in-memory for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine with special settings for SQLite
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Fixture that provides an async database session for tests."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create a new session for the test
    async with TestAsyncSessionLocal() as session:
        yield session
        await session.rollback()

    # Drop all tables after the test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Fixture that provides an async HTTP client for testing FastAPI endpoints."""
    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def admin_client(db: AsyncSession, admin_user: User) -> AsyncGenerator[AsyncClient, None]:
    """Fixture that provides an async HTTP client authenticated as an admin user."""
    from app.core.security import get_current_user

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer admin-test-token"}
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def user_client(db: AsyncSession, regular_user: User) -> AsyncGenerator[AsyncClient, None]:
    """Fixture that provides an async HTTP client authenticated as a regular user."""
    from app.core.security import get_current_user

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return regular_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer user-test-token"}
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def admin_user(db: AsyncSession) -> User:
    """Fixture that creates an admin user for testing."""
    user = User(
        id=uuid.uuid4(),
        firebase_uid="admin-test-uid",
        email="admin@test.com",
        full_name="Admin Test User",
        role="admin",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture(scope="function")
async def regular_user(db: AsyncSession) -> User:
    """Fixture that creates a regular (non-admin) user for testing."""
    user = User(
        id=uuid.uuid4(),
        firebase_uid="user-test-uid",
        email="user@test.com",
        full_name="Regular Test User",
        role="user",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture(scope="function")
async def project(db: AsyncSession, admin_user: User) -> Project:
    """Fixture that creates a test project."""
    proj = Project(
        id=uuid.uuid4(),
        name="Test Project",
        code="TEST-001",
        description="Test project for equipment templates",
        status="active",
        created_by_id=admin_user.id
    )
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj


@pytest.fixture(scope="function")
def admin_token() -> str:
    """Fixture that provides an admin authentication token."""
    # In a real application, this would be a valid JWT token
    # For testing with the simplified security.py, we just need any token
    return "admin-test-token"


@pytest.fixture(scope="function")
def user_token() -> str:
    """Fixture that provides a regular user authentication token."""
    # In a real application, this would be a valid JWT token
    # For testing with the simplified security.py, we just need any token
    return "user-test-token"


@pytest.fixture(scope="function")
async def equipment_template(db: AsyncSession, admin_user: User) -> EquipmentTemplate:
    """Fixture that creates a test equipment template."""
    template = EquipmentTemplate(
        id=uuid.uuid4(),
        name="Test Equipment Template",
        category="Heavy Machinery",
        description="Test template for equipment",
        specifications={"capacity": "10 tons", "model": "CAT-320"},
        created_by_id=admin_user.id
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@pytest.fixture(scope="function")
async def equipment_submission(
    db: AsyncSession,
    project: Project,
    equipment_template: EquipmentTemplate,
    regular_user: User
) -> EquipmentSubmission:
    """Fixture that creates a test equipment submission."""
    submission = EquipmentSubmission(
        id=uuid.uuid4(),
        project_id=project.id,
        template_id=equipment_template.id,
        name="Test Equipment Submission",
        description="Test submission from template",
        status="draft",
        specifications={"custom_field": "custom_value"},
        created_by_id=regular_user.id
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission
