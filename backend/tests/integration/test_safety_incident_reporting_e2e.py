"""
Integration tests for Safety Incident Reporting Flow

Tests the complete end-to-end flow:
1. Create safety incident via API
2. Verify incident appears in backend DB
3. Verify incident shows in incidents list
4. Upload photo to incident
5. Verify notification broadcast works
6. Generate safety compliance report PDF
"""

import pytest
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.project import Project, ProjectMember, UserRole
from app.models.area import ConstructionArea
from app.models.safety_incident import SafetyIncident, IncidentSeverity, IncidentStatus
from app.models.user import User
from app.models.file import File
from app.services.safety_report_service import generate_safety_compliance_report
from app.services.storage_service import get_storage_backend


@pytest.mark.asyncio
class TestSafetyIncidentReportingE2E:
    """End-to-end integration tests for safety incident reporting flow"""

    @pytest.fixture
    async def test_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a test project"""
        project = Project(
            name="Safety Test Project",
            description="Test project for safety incident reporting E2E tests",
            status="active",
            created_by_id=admin_user.id,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        # Add admin user as project member
        project_member = ProjectMember(
            project_id=project.id,
            user_id=admin_user.id,
            role=UserRole.PROJECT_ADMIN
        )
        db.add(project_member)
        await db.commit()

        return project

    @pytest.fixture
    async def test_area(
        self, db: AsyncSession, test_project: Project
    ) -> ConstructionArea:
        """Create a construction area for testing"""
        area = ConstructionArea(
            project_id=test_project.id,
            name="Building A - Floor 3",
            area_code="BA-F3",
            floor_number=3,
            total_units=12,
        )
        db.add(area)
        await db.commit()
        await db.refresh(area)
        return area

    async def test_step_1_create_incident_via_api(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
        test_area: ConstructionArea,
        admin_user: User,
    ):
        """
        Step 1: Create safety incident via API
        """
        incident_data = {
            "title": "Worker fall from scaffolding",
            "description": "Worker slipped and fell from second level scaffolding. Minor injuries reported.",
            "severity": "high",
            "status": "open",
            "occurred_at": "2026-03-01T10:30:00Z",
            "location": "Building A - Floor 3 - East Wing",
            "area_id": str(test_area.id),
            "witnesses": [
                {
                    "name": "John Doe",
                    "role": "Site Supervisor",
                    "statement": "I saw the worker lose balance and fall approximately 2 meters."
                }
            ],
            "root_cause": "Wet scaffolding surface not clearly marked",
            "corrective_actions": "Install non-slip surface, add warning signs, conduct safety briefing",
        }

        response = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/safety-incidents",
            json=incident_data,
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()

        assert data["title"] == incident_data["title"]
        assert data["severity"] == "high"
        assert data["status"] == "open"
        assert "incidentNumber" in data
        assert data["incidentNumber"] > 0

        # Store incident ID for next tests
        self.incident_id = data["id"]

    async def test_step_2_verify_incident_in_db(
        self,
        db: AsyncSession,
        test_project: Project,
    ):
        """
        Step 2: Verify incident appears in backend DB
        """
        result = await db.execute(
            select(SafetyIncident)
            .where(SafetyIncident.project_id == test_project.id)
            .order_by(SafetyIncident.created_at.desc())
        )
        incident = result.scalar_one_or_none()

        assert incident is not None, "Incident not found in database"
        assert incident.title == "Worker fall from scaffolding"
        assert incident.severity == IncidentSeverity.HIGH
        assert incident.status == IncidentStatus.OPEN
        assert incident.incident_number == 1  # First incident in project
        assert incident.root_cause == "Wet scaffolding surface not clearly marked"
        assert len(incident.witnesses) == 1
        assert incident.witnesses[0]["name"] == "John Doe"

    async def test_step_3_verify_incident_in_list(
        self,
        admin_client: AsyncClient,
        test_project: Project,
    ):
        """
        Step 3: Verify incident shows in incidents list
        """
        response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/safety-incidents"
        )

        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert len(data["items"]) == 1

        incident = data["items"][0]
        assert incident["title"] == "Worker fall from scaffolding"
        assert incident["severity"] == "high"
        assert incident["incidentNumber"] == 1

        # Test filtering by severity
        response_high = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/safety-incidents?severity=high"
        )
        assert response_high.status_code == 200
        assert len(response_high.json()["items"]) == 1

        # Test filtering by status
        response_open = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/safety-incidents?status=open"
        )
        assert response_open.status_code == 200
        assert len(response_open.json()["items"]) == 1

        # Test search
        response_search = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/safety-incidents?search=scaffolding"
        )
        assert response_search.status_code == 200
        assert len(response_search.json()["items"]) == 1

    async def test_step_4_upload_photo_to_incident(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        """
        Step 4: Upload photo to incident
        """
        # First, get the incident from DB
        result = await db.execute(
            select(SafetyIncident)
            .where(SafetyIncident.project_id == test_project.id)
        )
        incident = result.scalar_one()

        # Simulate photo upload using multipart form data
        files = {
            "file": ("incident_photo.jpg", b"fake-image-data", "image/jpeg")
        }
        data = {
            "entity_type": "safety_incident",
            "entity_id": str(incident.id),
            "description": "Photo of damaged scaffolding",
        }

        response = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/files",
            files=files,
            data=data,
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        file_data = response.json()

        assert file_data["entityType"] == "safety_incident"
        assert file_data["entityId"] == str(incident.id)
        assert file_data["fileType"] == "image/jpeg"

        # Verify file in database
        file_result = await db.execute(
            select(File)
            .where(
                File.entity_type == "safety_incident",
                File.entity_id == incident.id
            )
        )
        uploaded_file = file_result.scalar_one_or_none()

        assert uploaded_file is not None
        assert uploaded_file.file_type == "image/jpeg"
        assert uploaded_file.file_size > 0

    async def test_step_5_verify_notification_broadcast(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
        test_area: ConstructionArea,
    ):
        """
        Step 5: Verify notification broadcast works
        Note: This test verifies the API creates incidents without errors.
        WebSocket broadcast testing requires a running WebSocket server.
        """
        # Create another incident with critical severity
        critical_incident_data = {
            "title": "Chemical spill in storage area",
            "description": "Hazardous chemical container leaked in storage room. Area evacuated.",
            "severity": "critical",
            "status": "open",
            "occurred_at": "2026-03-01T14:45:00Z",
            "location": "Storage Room B",
            "area_id": str(test_area.id),
            "root_cause": "Damaged container seal",
            "corrective_actions": "Immediate cleanup, replace all containers, conduct safety audit",
        }

        response = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/safety-incidents",
            json=critical_incident_data,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["severity"] == "critical"
        assert data["incidentNumber"] == 2  # Second incident

        # Verify incident was created (notification would be broadcast in real app)
        result = await db.execute(
            select(SafetyIncident)
            .where(SafetyIncident.title == "Chemical spill in storage area")
        )
        critical_incident = result.scalar_one_or_none()

        assert critical_incident is not None
        assert critical_incident.severity == IncidentSeverity.CRITICAL

    async def test_step_6_generate_safety_compliance_report_pdf(
        self,
        db: AsyncSession,
        test_project: Project,
    ):
        """
        Step 6: Generate safety compliance report PDF
        """
        from app.services.storage_service import get_storage_backend as _get_storage
        storage = _get_storage()

        # Generate PDF report
        pdf_bytes = await generate_safety_compliance_report(
            db=db,
            storage=storage,
            project_id=test_project.id,
            language="en",
        )

        assert pdf_bytes is not None
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b"%PDF"  # PDF signature

        # Generate Hebrew version
        pdf_bytes_he = await generate_safety_compliance_report(
            db=db,
            storage=storage,
            project_id=test_project.id,
            language="he",
        )

        assert pdf_bytes_he is not None
        assert len(pdf_bytes_he) > 0
        assert pdf_bytes_he[:4] == b"%PDF"

    async def test_complete_flow_summary(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        """
        Summary test: Verify complete incident reporting flow
        """
        # Get incident summary
        response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/safety-incidents-summary"
        )

        assert response.status_code == 200
        summary = response.json()

        assert summary["totalIncidents"] >= 2
        assert summary["criticalIncidents"] >= 1
        assert summary["highIncidents"] >= 1
        assert summary["openIncidents"] >= 2

        # Get safety KPI
        kpi_response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/safety/kpi"
        )

        assert kpi_response.status_code == 200
        kpi = kpi_response.json()

        assert kpi["safetyIncidents"]["total"] >= 2
        assert kpi["safetyIncidents"]["bySeverity"]["critical"] >= 1
        assert kpi["safetyIncidents"]["bySeverity"]["high"] >= 1
        assert kpi["safetyIncidents"]["byStatus"]["open"] >= 2
