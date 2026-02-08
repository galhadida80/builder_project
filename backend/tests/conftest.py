import os
import uuid
import asyncio
from typing import AsyncGenerator, Generator
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import JSON, String, event
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from fastapi import HTTPException
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.equipment_template import EquipmentTemplate
from app.models.equipment_submission import EquipmentSubmission
from app.models.approval_decision import ApprovalDecision

compiles(JSONB, "sqlite")(lambda element, compiler, **kw: compiler.visit_JSON(element, **kw))
compiles(PG_UUID, "sqlite")(lambda element, compiler, **kw: "VARCHAR(36)")

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
    from app.core.security import get_current_user, get_current_admin_user

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return admin_user

    async def override_get_current_admin_user():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user

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
    from app.core.security import get_current_user, get_current_admin_user

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return regular_user

    async def override_get_current_admin_user():
        raise HTTPException(status_code=403, detail="Admin access required")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_admin_user] = override_get_current_admin_user

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
    """Fixture that creates a test project with admin_user as member."""
    proj = Project(
        id=uuid.uuid4(),
        name="Test Project",
        code="TEST-001",
        description="Test project for equipment templates",
        status="active",
        created_by_id=admin_user.id
    )
    db.add(proj)
    await db.flush()
    admin_member = ProjectMember(
        project_id=proj.id,
        user_id=admin_user.id,
        role="project_admin",
    )
    db.add(admin_member)
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
        name_he="תבנית ציוד בדיקה",
        category="Heavy Machinery",
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


@pytest.fixture(scope="function")
async def async_session(db: AsyncSession) -> AsyncSession:
    """Alias for db fixture (used by some test files)."""
    return db


@pytest.fixture(scope="function")
async def db_session(db: AsyncSession) -> AsyncSession:
    """Alias for db fixture (used by some test files)."""
    return db


# ===== RFI Test Fixtures =====

@pytest.fixture(scope="function")
def sample_emails() -> dict:
    """Fixture that provides sample email payloads for RFI testing."""
    import base64

    # Plain text email
    plain_text_body = "This is a plain text response to the RFI."
    plain_text_encoded = base64.urlsafe_b64encode(plain_text_body.encode()).decode()

    # HTML email
    html_body = "<html><body><p>This is an <strong>HTML</strong> response to the RFI.</p></body></html>"
    html_encoded = base64.urlsafe_b64encode(html_body.encode()).decode()

    return {
        "plain_text": {
            "id": "msg-plain-123",
            "threadId": "thread-abc-123",
            "labelIds": ["INBOX"],
            "snippet": "This is a plain text response...",
            "payload": {
                "headers": [
                    {"name": "From", "value": "contractor@example.com"},
                    {"name": "To", "value": "rfi@test.com"},
                    {"name": "Subject", "value": "Re: RFI-TEST-001: Sample Question"},
                    {"name": "Message-ID", "value": "<msg-plain-123@mail.gmail.com>"},
                    {"name": "In-Reply-To", "value": "<original-msg-id@mail.gmail.com>"},
                    {"name": "Date", "value": "Mon, 1 Jan 2024 10:00:00 +0000"}
                ],
                "mimeType": "text/plain",
                "body": {
                    "data": plain_text_encoded,
                    "size": len(plain_text_body)
                }
            }
        },
        "html": {
            "id": "msg-html-456",
            "threadId": "thread-def-456",
            "labelIds": ["INBOX"],
            "snippet": "This is an HTML response...",
            "payload": {
                "headers": [
                    {"name": "From", "value": "engineer@example.com"},
                    {"name": "To", "value": "rfi@test.com"},
                    {"name": "Subject", "value": "Re: RFI-TEST-002: Technical Question"},
                    {"name": "Message-ID", "value": "<msg-html-456@mail.gmail.com>"},
                    {"name": "In-Reply-To", "value": "<original-msg-id-2@mail.gmail.com>"},
                    {"name": "Date", "value": "Mon, 1 Jan 2024 11:00:00 +0000"}
                ],
                "mimeType": "text/html",
                "body": {
                    "data": html_encoded,
                    "size": len(html_body)
                }
            }
        },
        "with_attachments": {
            "id": "msg-attach-789",
            "threadId": "thread-ghi-789",
            "labelIds": ["INBOX"],
            "snippet": "Please see attached drawings...",
            "payload": {
                "headers": [
                    {"name": "From", "value": "architect@example.com"},
                    {"name": "To", "value": "rfi@test.com"},
                    {"name": "Subject", "value": "Re: RFI-TEST-003: Drawing Clarification"},
                    {"name": "Message-ID", "value": "<msg-attach-789@mail.gmail.com>"},
                    {"name": "In-Reply-To", "value": "<original-msg-id-3@mail.gmail.com>"},
                    {"name": "Date", "value": "Mon, 1 Jan 2024 12:00:00 +0000"}
                ],
                "mimeType": "multipart/mixed",
                "parts": [
                    {
                        "mimeType": "text/plain",
                        "body": {
                            "data": base64.urlsafe_b64encode(b"Please see attached drawings.").decode(),
                            "size": 29
                        }
                    },
                    {
                        "mimeType": "application/pdf",
                        "filename": "drawing-revision-A.pdf",
                        "body": {
                            "attachmentId": "attach-001",
                            "size": 1024000
                        }
                    }
                ]
            }
        },
        "malformed": {
            "id": "msg-malformed-999",
            "threadId": "thread-malformed-999",
            "labelIds": ["INBOX"],
            "snippet": "Email with missing headers...",
            "payload": {
                "headers": [
                    {"name": "From", "value": "unknown@example.com"},
                    {"name": "To", "value": "rfi@test.com"},
                    {"name": "Date", "value": "Mon, 1 Jan 2024 13:00:00 +0000"}
                    # Missing Subject, Message-ID, In-Reply-To
                ],
                "mimeType": "text/plain",
                "body": {
                    "data": base64.urlsafe_b64encode(b"Response without proper headers.").decode(),
                    "size": 32
                }
            }
        }
    }


@pytest.fixture(scope="function")
def mock_gmail_service(mocker):
    """Fixture that provides a mocked Gmail API service."""
    mock_service = mocker.MagicMock()

    # Mock the users().messages().send() chain
    mock_send = mocker.MagicMock()
    mock_send.execute.return_value = {
        "id": "sent-msg-123",
        "threadId": "thread-new-123",
        "labelIds": ["SENT"]
    }

    mock_messages = mocker.MagicMock()
    mock_messages.send.return_value = mock_send

    # Mock the users().messages().get() chain
    mock_get = mocker.MagicMock()
    mock_get.execute.return_value = {
        "id": "msg-123",
        "threadId": "thread-123",
        "payload": {
            "headers": [
                {"name": "Subject", "value": "Test Subject"},
                {"name": "From", "value": "test@example.com"}
            ]
        }
    }
    mock_messages.get.return_value = mock_get

    mock_users = mocker.MagicMock()
    mock_users.messages.return_value = mock_messages

    mock_service.users.return_value = mock_users

    return mock_service


@pytest.fixture(scope="function")
def mock_pubsub(mocker):
    """Fixture that provides a mocked Google Cloud Pub/Sub client."""
    mock_publisher = mocker.MagicMock()
    mock_subscriber = mocker.MagicMock()

    # Mock publish method
    mock_future = mocker.MagicMock()
    mock_future.result.return_value = "msg-published-123"
    mock_publisher.publish.return_value = mock_future

    # Mock subscriber pull
    mock_response = mocker.MagicMock()
    mock_message = mocker.MagicMock()
    mock_message.message_id = "pubsub-msg-123"
    mock_message.data = b'{"emailAddress": "rfi@test.com", "historyId": "12345"}'
    mock_message.attributes = {"gmail_message_id": "msg-123"}
    mock_response.received_messages = [mock_message]
    mock_subscriber.pull.return_value = mock_response

    return {
        "publisher": mock_publisher,
        "subscriber": mock_subscriber
    }


@pytest.fixture(scope="function")
async def sample_project(db: AsyncSession, admin_user: User) -> Project:
    """Fixture that creates a sample project for RFI testing."""
    proj = Project(
        id=uuid.uuid4(),
        name="Test RFI Project",
        code="RFI-TEST",
        description="Project for RFI testing",
        status="active",
        created_by_id=admin_user.id
    )
    db.add(proj)
    await db.flush()
    member = ProjectMember(
        project_id=proj.id,
        user_id=admin_user.id,
        role="project_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(proj)
    return proj


# Uncomment when RFI models are implemented
# from app.models.rfi import RFI, RFIResponse, RFIEmailLog
#
# @pytest.fixture(scope="function")
# async def rfi_instance(
#     db: AsyncSession,
#     project: Project,
#     admin_user: User,
#     regular_user: User
# ) -> RFI:
#     """Fixture that creates a test RFI instance."""
#     rfi = RFI(
#         id=uuid.uuid4(),
#         project_id=project.id,
#         rfi_number=f"RFI-{project.code}-001",
#         subject="Test RFI Subject",
#         question="What is the specification for the concrete mix?",
#         status="draft",
#         priority="normal",
#         category="technical",
#         created_by_id=admin_user.id,
#         assigned_to_id=regular_user.id,
#         due_date=None,
#         email_thread_id=None,
#         email_message_id=None,
#         sent_at=None,
#         responded_at=None,
#         closed_at=None
#     )
#     db.add(rfi)
#     await db.commit()
#     await db.refresh(rfi)
#     return rfi
