import pytest
from httpx import AsyncClient
from app.main import app
from app.models.inspection import InspectionConsultantType, Inspection
from app.models.audit import AuditLog
from datetime import datetime


@pytest.mark.asyncio
async def test_create_consultant_type(db_session, test_user):
    """Test POST /inspection-consultant-types"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/inspection-consultant-types",
            json={"name": "Structural Engineer", "description": "Test"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Structural Engineer"


@pytest.mark.asyncio
async def test_list_pending_inspections(db_session, test_project, test_user):
    """Test GET /projects/{project_id}/inspections/pending"""
    # Create consultant type and inspections with different statuses
    consultant_type = InspectionConsultantType(name="Test Type")
    db_session.add(consultant_type)
    await db_session.flush()

    inspection_pending = Inspection(
        project_id=test_project.id,
        consultant_type_id=consultant_type.id,
        scheduled_date=datetime.utcnow(),
        status="pending"
    )
    inspection_completed = Inspection(
        project_id=test_project.id,
        consultant_type_id=consultant_type.id,
        scheduled_date=datetime.utcnow(),
        status="completed"
    )
    db_session.add_all([inspection_pending, inspection_completed])
    await db_session.commit()

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(f"/api/v1/projects/{test_project.id}/inspections/pending")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # Only pending inspection
        assert data[0]["status"] == "pending"


@pytest.mark.asyncio
async def test_get_inspection_history(db_session, test_project, test_user):
    """Test GET /projects/{project_id}/inspections/{inspection_id}/history"""
    # Create consultant type
    consultant_type = InspectionConsultantType(name="Test Type")
    db_session.add(consultant_type)
    await db_session.flush()

    # Create inspection
    inspection = Inspection(
        project_id=test_project.id,
        consultant_type_id=consultant_type.id,
        scheduled_date=datetime.utcnow(),
        status="pending"
    )
    db_session.add(inspection)
    await db_session.flush()

    # Create audit log for inspection creation
    audit = AuditLog(
        project_id=test_project.id,
        user_id=test_user.id,
        entity_type="inspection",
        entity_id=inspection.id,
        action="create",
        new_values={"status": "pending"}
    )
    db_session.add(audit)
    await db_session.commit()

    # Test endpoint
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/inspections/{inspection.id}/history"
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Verify first event
        event = data[0]
        assert event["entityType"] == "inspection"
        assert event["entityId"] == str(inspection.id)
        assert event["action"] == "create"
        assert "user" in event
        assert event["user"]["id"] == str(test_user.id)
