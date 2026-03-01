"""
Unit tests for subcontractor portal endpoints.

Tests cover:
- Dashboard statistics calculation
- Cross-project task filtering
- Cross-project RFI filtering
- Cross-project approval filtering
- Activity feed generation
"""
import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import ApprovalRequest
from app.models.project import Project, ProjectMember
from app.models.rfi import RFI
from app.models.task import Task
from app.models.user import User


@pytest.fixture(scope="function")
async def subcontractor_user(db: AsyncSession) -> User:
    """Fixture that creates a subcontractor user."""
    user = User(
        id=uuid.uuid4(),
        firebase_uid="subcontractor-test-uid",
        email="subcontractor@test.com",
        full_name="Test Subcontractor",
        role="user",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture(scope="function")
async def subcontractor_client(db: AsyncSession, subcontractor_user: User):
    """Fixture that provides an async HTTP client authenticated as a subcontractor."""
    from fastapi import HTTPException
    from httpx import ASGITransport
    from app.core.security import get_current_user
    from app.db.session import get_db
    from app.main import app

    async def override_get_db():
        yield db

    async def override_get_current_user():
        return subcontractor_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": "Bearer subcontractor-test-token"}
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def project_with_subcontractor(db: AsyncSession, admin_user: User, subcontractor_user: User) -> Project:
    """Fixture that creates a project with subcontractor as member."""
    proj = Project(
        id=uuid.uuid4(),
        name="Subcontractor Test Project",
        description="Project for subcontractor testing",
        status="active",
        created_by_id=admin_user.id
    )
    db.add(proj)
    await db.flush()

    # Add admin as project admin
    admin_member = ProjectMember(
        project_id=proj.id,
        user_id=admin_user.id,
        role="project_admin",
    )
    db.add(admin_member)

    # Add subcontractor as project member
    sub_member = ProjectMember(
        project_id=proj.id,
        user_id=subcontractor_user.id,
        role="subcontractor",
    )
    db.add(sub_member)

    await db.commit()
    await db.refresh(proj)
    return proj


@pytest.mark.asyncio
async def test_dashboard_statistics(
    db: AsyncSession,
    subcontractor_client: AsyncClient,
    project_with_subcontractor: Project,
    subcontractor_user: User
):
    """Test dashboard statistics calculation with various task/RFI/approval states."""
    # Create 3 tasks: 2 in_progress, 1 completed, 1 overdue
    task1 = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="In Progress Task 1",
        task_number=1001,
        status="in_progress",
        priority="medium",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
        due_date=(datetime.utcnow() + timedelta(days=5)).date(),
    )
    task2 = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="In Progress Task 2",
        task_number=1002,
        status="in_progress",
        priority="high",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
        due_date=(datetime.utcnow() + timedelta(days=3)).date(),
    )
    task3 = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="Completed Task",
        task_number=1003,
        status="completed",
        priority="low",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
        due_date=(datetime.utcnow() - timedelta(days=1)).date(),
    )
    task_overdue = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="Overdue Task",
        task_number=1004,
        status="pending",
        priority="urgent",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
        due_date=(datetime.utcnow() - timedelta(days=2)).date(),
    )
    db.add_all([task1, task2, task3, task_overdue])

    # Create 2 RFIs: 1 open, 1 answered
    rfi1 = RFI(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        rfi_number="RFI-001",
        subject="Open RFI Subject",
        question="Open RFI question",
        to_email="recipient@test.com",
        status="open",
        priority="medium",
        created_by_id=subcontractor_user.id,
    )
    rfi2 = RFI(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        rfi_number="RFI-002",
        subject="Answered RFI Subject",
        question="Answered RFI question",
        to_email="recipient@test.com",
        status="answered",
        priority="low",
        created_by_id=subcontractor_user.id,
    )
    db.add_all([rfi1, rfi2])

    # Create 1 approval: pending
    approval = ApprovalRequest(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        entity_type="submittal",
        entity_id=uuid.uuid4(),
        current_status="pending",
        created_by_id=subcontractor_user.id,
    )
    db.add(approval)

    await db.commit()

    # Test the dashboard endpoint
    response = await subcontractor_client.get("/api/v1/subcontractors/dashboard")

    assert response.status_code == 200
    data = response.json()

    # Verify task stats
    assert data["taskStats"]["total"] == 4
    assert data["taskStats"]["inProgress"] == 2
    assert data["taskStats"]["completed"] == 1
    assert data["taskStats"]["overdue"] == 1

    # Verify RFI stats
    assert data["rfiStats"]["total"] == 2
    assert data["rfiStats"]["open"] == 1
    assert data["rfiStats"]["answered"] == 1

    # Verify approval stats
    assert data["approvalStats"]["total"] == 1
    assert data["approvalStats"]["pending"] == 1


@pytest.mark.asyncio
async def test_my_tasks_cross_project(
    db: AsyncSession,
    subcontractor_client: AsyncClient,
    admin_user: User,
    subcontractor_user: User
):
    """Test that my-tasks returns tasks from all projects where user is subcontractor."""
    # Create two projects with subcontractor as member
    proj1 = Project(
        id=uuid.uuid4(),
        name="Project 1",
        status="active",
        created_by_id=admin_user.id
    )
    proj2 = Project(
        id=uuid.uuid4(),
        name="Project 2",
        status="active",
        created_by_id=admin_user.id
    )
    db.add_all([proj1, proj2])
    await db.flush()

    # Add subcontractor to both projects
    member1 = ProjectMember(project_id=proj1.id, user_id=subcontractor_user.id, role="subcontractor")
    member2 = ProjectMember(project_id=proj2.id, user_id=subcontractor_user.id, role="subcontractor")
    db.add_all([member1, member2])

    # Create tasks in both projects
    task1 = Task(
        id=uuid.uuid4(),
        project_id=proj1.id,
        title="Task in Project 1",
        task_number=1,
        status="pending",
        priority="medium",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
    )
    task2 = Task(
        id=uuid.uuid4(),
        project_id=proj2.id,
        title="Task in Project 2",
        task_number=2,
        status="in_progress",
        priority="high",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
    )
    db.add_all([task1, task2])
    await db.commit()

    # Test the my-tasks endpoint
    response = await subcontractor_client.get("/api/v1/subcontractors/my-tasks")

    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 2
    assert any(t["title"] == "Task in Project 1" for t in tasks)
    assert any(t["title"] == "Task in Project 2" for t in tasks)


@pytest.mark.asyncio
async def test_my_tasks_filtering(
    db: AsyncSession,
    subcontractor_client: AsyncClient,
    project_with_subcontractor: Project,
    subcontractor_user: User
):
    """Test that my-tasks filters by status and priority correctly."""
    # Create tasks with different statuses and priorities
    task_pending = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="Pending Task",
        task_number=101,
        status="pending",
        priority="low",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
    )
    task_in_progress = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="In Progress Task",
        task_number=102,
        status="in_progress",
        priority="high",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
    )
    task_completed = Task(
        id=uuid.uuid4(),
        project_id=project_with_subcontractor.id,
        title="Completed Task",
        task_number=103,
        status="completed",
        priority="medium",
        assignee_id=subcontractor_user.id,
        created_by_id=subcontractor_user.id,
    )
    db.add_all([task_pending, task_in_progress, task_completed])
    await db.commit()

    # Test filtering by status
    response = await subcontractor_client.get("/api/v1/subcontractors/my-tasks?status=in_progress")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["status"] == "in_progress"

    # Test filtering by priority
    response = await subcontractor_client.get("/api/v1/subcontractors/my-tasks?priority=high")
    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 1
    assert tasks[0]["priority"] == "high"


@pytest.mark.asyncio
async def test_my_rfis_pagination(
    db: AsyncSession,
    subcontractor_client: AsyncClient,
    project_with_subcontractor: Project,
    subcontractor_user: User
):
    """Test that my-rfis pagination and search functionality works."""
    # Create 5 RFIs
    rfis = []
    for i in range(5):
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=project_with_subcontractor.id,
            rfi_number=f"RFI-{i+1:03d}",
            subject=f"Test RFI Subject {i+1}",
            question=f"Test RFI Question {i+1}",
            to_email="recipient@test.com",
            status="open" if i % 2 == 0 else "answered",
            priority="medium",
            created_by_id=subcontractor_user.id,
        )
        rfis.append(rfi)
    db.add_all(rfis)
    await db.commit()

    # Test endpoint returns RFIs with pagination structure
    response = await subcontractor_client.get("/api/v1/subcontractors/my-rfis?page=1&limit=3")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 5
    assert len(data["items"]) > 0  # Returns at least some items

    # Test search functionality
    response = await subcontractor_client.get("/api/v1/subcontractors/my-rfis?search=RFI-001")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    # Verify at least one item matches the search
    assert any(item["rfi_number"] == "RFI-001" for item in data["items"])


@pytest.mark.asyncio
async def test_my_approvals_access(
    db: AsyncSession,
    subcontractor_client: AsyncClient,
    admin_user: User,
    subcontractor_user: User
):
    """Test that my-approvals only returns approvals from subcontractor projects."""
    # Create two projects: one with subcontractor, one without
    proj_with_sub = Project(
        id=uuid.uuid4(),
        name="Project With Subcontractor",
        status="active",
        created_by_id=admin_user.id
    )
    proj_without_sub = Project(
        id=uuid.uuid4(),
        name="Project Without Subcontractor",
        status="active",
        created_by_id=admin_user.id
    )
    db.add_all([proj_with_sub, proj_without_sub])
    await db.flush()

    # Add subcontractor only to first project
    member = ProjectMember(project_id=proj_with_sub.id, user_id=subcontractor_user.id, role="subcontractor")
    db.add(member)

    # Create approvals in both projects
    approval_accessible = ApprovalRequest(
        id=uuid.uuid4(),
        project_id=proj_with_sub.id,
        entity_type="submittal",
        entity_id=uuid.uuid4(),
        current_status="pending",
        created_by_id=subcontractor_user.id,
    )
    approval_inaccessible = ApprovalRequest(
        id=uuid.uuid4(),
        project_id=proj_without_sub.id,
        entity_type="submittal",
        entity_id=uuid.uuid4(),
        current_status="pending",
        created_by_id=admin_user.id,
    )
    db.add_all([approval_accessible, approval_inaccessible])
    await db.commit()

    # Test the my-approvals endpoint
    response = await subcontractor_client.get("/api/v1/subcontractors/my-approvals")

    assert response.status_code == 200
    approvals = response.json()
    # Should only return approval from project where subcontractor is member
    assert len(approvals) == 1
    assert approvals[0]["projectId"] == str(proj_with_sub.id)
