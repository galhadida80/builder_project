"""
Integration tests for Near-Miss Anonymous Reporting

Tests the complete end-to-end flow:
1. Submit near-miss report anonymously
2. Verify no user attribution in DB
3. Verify near-miss appears in list
4. Verify reporter field is null/hidden
5. Verify anonymous filtering works
6. Verify statistics include anonymous count
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.project import Project, ProjectMember, UserRole
from app.models.area import ConstructionArea
from app.models.near_miss import NearMiss, NearMissSeverity
from app.models.contact import Contact
from app.models.user import User


@pytest.mark.asyncio
class TestNearMissAnonymousReportingE2E:
    """End-to-end integration tests for near-miss anonymous reporting"""

    @pytest.fixture
    async def test_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a test project"""
        project = Project(
            name="Near-Miss Anonymous Test Project",
            description="Test project for near-miss anonymous reporting E2E tests",
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
            name="Building B - Floor 5",
            area_code="BB-F5",
            floor_number=5,
            total_units=8,
        )
        db.add(area)
        await db.commit()
        await db.refresh(area)
        return area

    @pytest.fixture
    async def test_contact(
        self, db: AsyncSession, test_project: Project
    ) -> Contact:
        """Create a test contact"""
        contact = Contact(
            project_id=test_project.id,
            contact_name="Test Worker",
            contact_type="worker",
            email="worker@test.com",
            phone="050-9876543",
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    async def test_step_1_submit_anonymous_near_miss(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
        test_area: ConstructionArea,
        admin_user: User,
    ):
        """
        Step 1: Submit near-miss report anonymously
        """
        near_miss_data = {
            "title": "Unsecured ladder on site",
            "description": "Found an extension ladder leaning against the wall without proper securing. Could have fallen and injured someone.",
            "severity": "medium",
            "potential_consequence": "Serious injury from falling ladder",
            "occurred_at": "2026-03-01T08:15:00Z",
            "location": "Main entrance walkway",
            "area_id": str(test_area.id),
            "is_anonymous": True,
            "preventive_actions": "All ladders must be secured immediately. Conduct toolbox talk on ladder safety.",
        }

        response = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/near-misses",
            json=near_miss_data,
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()

        assert data["title"] == near_miss_data["title"]
        assert data["severity"] == "medium"
        assert data["isAnonymous"] is True
        assert data["reportedById"] is None
        assert "reportedBy" not in data or data["reportedBy"] is None
        assert "nearMissNumber" in data
        assert data["nearMissNumber"] > 0

        # Store near-miss ID for next tests
        self.anonymous_near_miss_id = data["id"]

    async def test_step_2_verify_no_user_attribution_in_db(
        self,
        db: AsyncSession,
        test_project: Project,
    ):
        """
        Step 2: Verify no user attribution in DB
        """
        result = await db.execute(
            select(NearMiss)
            .where(NearMiss.project_id == test_project.id)
            .where(NearMiss.is_anonymous == True)
            .order_by(NearMiss.created_at.desc())
        )
        near_miss = result.scalar_one_or_none()

        assert near_miss is not None, "Anonymous near-miss not found in database"
        assert near_miss.title == "Unsecured ladder on site"
        assert near_miss.is_anonymous is True
        assert near_miss.reported_by_id is None, "reported_by_id should be NULL for anonymous reports"
        assert near_miss.severity == NearMissSeverity.MEDIUM
        assert near_miss.near_miss_number == 1  # First near-miss in project

    async def test_step_3_verify_anonymous_near_miss_in_list(
        self,
        admin_client: AsyncClient,
        test_project: Project,
    ):
        """
        Step 3: Verify near-miss appears in list with anonymous flag
        """
        response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses"
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data) >= 1, "Expected at least one near-miss in the list"

        # Find the anonymous near-miss
        anonymous_near_miss = next(
            (nm for nm in data if nm.get("isAnonymous") is True), None
        )

        assert anonymous_near_miss is not None, "Anonymous near-miss not found in list"
        assert anonymous_near_miss["title"] == "Unsecured ladder on site"
        assert anonymous_near_miss["isAnonymous"] is True
        assert anonymous_near_miss["reportedById"] is None
        assert anonymous_near_miss.get("reportedBy") is None

    async def test_step_4_verify_reporter_field_hidden(
        self,
        admin_client: AsyncClient,
        test_project: Project,
    ):
        """
        Step 4: Verify reporter field is null/hidden in API response
        """
        # Get the near-miss by ID
        result = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses"
        )
        near_misses = result.json()
        anonymous_near_miss = next(
            (nm for nm in near_misses if nm.get("isAnonymous") is True), None
        )

        assert anonymous_near_miss is not None

        # Get individual near-miss detail
        detail_response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses/{anonymous_near_miss['id']}"
        )

        assert detail_response.status_code == 200
        detail_data = detail_response.json()

        # Verify reporter information is not exposed
        assert detail_data["isAnonymous"] is True
        assert detail_data["reportedById"] is None
        assert detail_data.get("reportedBy") is None, "reportedBy should not be populated for anonymous reports"

    async def test_step_5_anonymous_filter_works(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
        test_area: ConstructionArea,
        test_contact: Contact,
    ):
        """
        Step 5: Verify anonymous filtering works
        """
        # Create a non-anonymous near-miss for comparison
        non_anonymous_data = {
            "title": "Tripping hazard from cables",
            "description": "Extension cables running across walkway without protection",
            "severity": "low",
            "occurred_at": "2026-03-01T09:30:00Z",
            "location": "Workshop area",
            "area_id": str(test_area.id),
            "is_anonymous": False,
            "reported_by_id": str(test_contact.id),
        }

        response = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/near-misses",
            json=non_anonymous_data,
        )
        assert response.status_code == 201

        # Test filter: anonymous only
        anonymous_only_response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses?is_anonymous=true"
        )
        assert anonymous_only_response.status_code == 200
        anonymous_list = anonymous_only_response.json()

        # Verify all results are anonymous
        for nm in anonymous_list:
            assert nm["isAnonymous"] is True
            assert nm["reportedById"] is None

        # Test filter: non-anonymous only
        identified_only_response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses?is_anonymous=false"
        )
        assert identified_only_response.status_code == 200
        identified_list = identified_only_response.json()

        # Verify all results are identified
        for nm in identified_list:
            assert nm["isAnonymous"] is False
            assert nm.get("reportedBy") is not None or nm.get("reportedById") is not None

    async def test_step_6_statistics_include_anonymous_count(
        self,
        admin_client: AsyncClient,
        test_project: Project,
    ):
        """
        Step 6: Verify statistics include anonymous count
        """
        response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses/summary/stats"
        )

        assert response.status_code == 200
        stats = response.json()

        assert "anonymousCount" in stats
        assert stats["anonymousCount"] >= 1, "Expected at least 1 anonymous near-miss in statistics"
        assert stats["total"] >= 2, "Expected at least 2 total near-misses"

    async def test_step_7_cannot_assign_reporter_when_anonymous(
        self,
        admin_client: AsyncClient,
        test_project: Project,
        test_area: ConstructionArea,
        test_contact: Contact,
    ):
        """
        Step 7: Verify that reported_by_id is cleared when is_anonymous is true
        """
        # Try to create an anonymous near-miss with a reporter ID
        # The API should ignore/clear the reporter ID
        conflicting_data = {
            "title": "Conflict test: anonymous with reporter",
            "description": "This should be anonymous despite having reported_by_id",
            "severity": "low",
            "occurred_at": "2026-03-01T10:00:00Z",
            "area_id": str(test_area.id),
            "is_anonymous": True,
            "reported_by_id": str(test_contact.id),  # This should be ignored
        }

        response = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/near-misses",
            json=conflicting_data,
        )

        assert response.status_code == 201
        data = response.json()

        # The API should enforce anonymity by clearing reported_by_id
        assert data["isAnonymous"] is True
        assert data["reportedById"] is None, "reported_by_id should be NULL when is_anonymous is true"

    async def test_complete_flow_summary(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        """
        Summary test: Verify complete anonymous near-miss reporting flow
        """
        # Get all near-misses
        response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses"
        )
        assert response.status_code == 200
        near_misses = response.json()

        # Count anonymous reports
        anonymous_count = sum(1 for nm in near_misses if nm.get("isAnonymous") is True)
        identified_count = sum(1 for nm in near_misses if nm.get("isAnonymous") is False)

        assert anonymous_count >= 2, f"Expected at least 2 anonymous reports, got {anonymous_count}"
        assert identified_count >= 1, f"Expected at least 1 identified report, got {identified_count}"

        # Verify database consistency
        db_result = await db.execute(
            select(NearMiss).where(NearMiss.project_id == test_project.id)
        )
        db_near_misses = list(db_result.scalars().all())

        for nm in db_near_misses:
            if nm.is_anonymous:
                assert nm.reported_by_id is None, f"Near-miss {nm.id} is anonymous but has reported_by_id"

        # Verify summary statistics match
        stats_response = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/near-misses/summary/stats"
        )
        stats = stats_response.json()

        assert stats["anonymousCount"] == anonymous_count
        assert stats["total"] == len(near_misses)
