"""
Unit tests for ProjectInspection and InspectionFinding models

Tests verify:
1. Model instantiation
2. UUID generation
3. Enum validation
4. Relationship navigation
5. JSONB field storage
6. Cascade delete behavior
"""
import pytest
import uuid
from datetime import datetime
from sqlalchemy import select
from app.models.inspection import (
    ProjectInspection,
    InspectionFinding,
    InspectionStatus,
    FindingType
)


class TestProjectInspectionModel:
    """Unit tests for ProjectInspection model"""

    @pytest.mark.asyncio
    async def test_model_instantiation(self, db_session, sample_project):
        """Test: Both models can be created with valid data"""
        # Create ProjectInspection
        inspection = ProjectInspection(
            project_id=sample_project.id,
            status=InspectionStatus.SCHEDULED.value,
            notes="Test inspection"
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        assert inspection.id is not None
        assert inspection.project_id == sample_project.id
        assert inspection.status == "scheduled"
        assert inspection.notes == "Test inspection"

        # Create InspectionFinding
        finding = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.PASS.value,
            description="Test finding"
        )
        db_session.add(finding)
        await db_session.commit()
        await db_session.refresh(finding)

        assert finding.id is not None
        assert finding.inspection_id == inspection.id
        assert finding.finding_type == "pass"
        assert finding.description == "Test finding"

    @pytest.mark.asyncio
    async def test_uuid_generation(self, db_session, sample_project):
        """Test: Primary keys auto-generate UUIDs"""
        # Create inspection without explicitly setting ID
        inspection = ProjectInspection(
            project_id=sample_project.id,
            status=InspectionStatus.NOT_SCHEDULED.value
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        # Verify UUID was auto-generated
        assert inspection.id is not None
        assert isinstance(inspection.id, uuid.UUID)

        # Create finding without explicitly setting ID
        finding = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.PASS.value,
            description="Test"
        )
        db_session.add(finding)
        await db_session.commit()
        await db_session.refresh(finding)

        # Verify UUID was auto-generated
        assert finding.id is not None
        assert isinstance(finding.id, uuid.UUID)

        # Verify UUIDs are unique
        assert inspection.id != finding.id

    @pytest.mark.asyncio
    async def test_enum_validation(self, db_session, sample_project):
        """Test: Status and finding_type enums accept only valid values"""
        # Test all InspectionStatus values
        status_values = [s.value for s in InspectionStatus]
        assert len(status_values) == 6
        assert "not_scheduled" in status_values
        assert "scheduled" in status_values
        assert "in_progress" in status_values
        assert "completed" in status_values
        assert "approved" in status_values
        assert "failed" in status_values

        # Test all FindingType values
        finding_types = [f.value for f in FindingType]
        assert len(finding_types) == 4
        assert "pass" in finding_types
        assert "minor_issue" in finding_types
        assert "major_issue" in finding_types
        assert "critical" in finding_types

        # Test enum usage in model
        inspection = ProjectInspection(
            project_id=sample_project.id,
            status=InspectionStatus.COMPLETED.value
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        assert inspection.status == "completed"

        # Test finding type enum
        finding = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.CRITICAL.value,
            description="Critical issue"
        )
        db_session.add(finding)
        await db_session.commit()
        await db_session.refresh(finding)

        assert finding.finding_type == "critical"

    @pytest.mark.asyncio
    async def test_relationship_navigation(self, db_session, sample_project):
        """Test: Can access ProjectInspection from InspectionFinding and vice versa"""
        # Create inspection
        inspection = ProjectInspection(
            project_id=sample_project.id,
            status=InspectionStatus.IN_PROGRESS.value
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        # Create findings
        finding1 = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.MINOR_ISSUE.value,
            description="Minor issue found"
        )
        finding2 = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.MAJOR_ISSUE.value,
            description="Major issue found"
        )
        db_session.add_all([finding1, finding2])
        await db_session.commit()
        await db_session.refresh(finding1)
        await db_session.refresh(finding2)

        # Test bidirectional navigation
        # InspectionFinding → ProjectInspection
        assert finding1.inspection is not None
        assert finding1.inspection.id == inspection.id

        # ProjectInspection → InspectionFinding
        await db_session.refresh(inspection, ["inspection_findings"])
        assert len(inspection.inspection_findings) == 2
        finding_ids = {f.id for f in inspection.inspection_findings}
        assert finding1.id in finding_ids
        assert finding2.id in finding_ids

    @pytest.mark.asyncio
    async def test_jsonb_field_storage(self, db_session, sample_project):
        """Test: JSONB fields store and retrieve dict/list data"""
        # Create inspection with JSONB data
        inspection = ProjectInspection(
            project_id=sample_project.id,
            findings={"total": 5, "critical": 1, "minor": 4},
            documents=["doc1.pdf", "doc2.pdf", "photo1.jpg"],
            additional_data={
                "weather": "sunny",
                "inspector_notes": "All systems operational",
                "checklist": ["item1", "item2", "item3"]
            }
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        # Retrieve and verify
        stmt = select(ProjectInspection).where(ProjectInspection.id == inspection.id)
        result = await db_session.execute(stmt)
        retrieved = result.scalar_one()

        assert retrieved.findings["total"] == 5
        assert retrieved.findings["critical"] == 1
        assert len(retrieved.documents) == 3
        assert "doc1.pdf" in retrieved.documents
        assert retrieved.additional_data["weather"] == "sunny"
        assert len(retrieved.additional_data["checklist"]) == 3

        # Test InspectionFinding JSONB field
        finding = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.PASS.value,
            description="Test",
            photos=["photo1.jpg", "photo2.jpg", "photo3.jpg"]
        )
        db_session.add(finding)
        await db_session.commit()
        await db_session.refresh(finding)

        stmt = select(InspectionFinding).where(InspectionFinding.id == finding.id)
        result = await db_session.execute(stmt)
        retrieved_finding = result.scalar_one()

        assert len(retrieved_finding.photos) == 3
        assert "photo1.jpg" in retrieved_finding.photos

    @pytest.mark.asyncio
    async def test_timestamps_auto_populated(self, db_session, sample_project):
        """Test: created_at and updated_at are automatically set"""
        inspection = ProjectInspection(
            project_id=sample_project.id,
            status=InspectionStatus.SCHEDULED.value
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        # Verify timestamps are set
        assert inspection.created_at is not None
        assert inspection.updated_at is not None
        assert isinstance(inspection.created_at, datetime)
        assert isinstance(inspection.updated_at, datetime)

    @pytest.mark.asyncio
    async def test_optional_fields(self, db_session, sample_project):
        """Test: Optional fields can be None"""
        # Create inspection with only required fields
        inspection = ProjectInspection(
            project_id=sample_project.id
        )
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        # Verify optional fields are None or have defaults
        assert inspection.area_id is None
        assert inspection.inspector_id is None
        assert inspection.scheduled_date is None
        assert inspection.scheduled_time is None
        assert inspection.completed_at is None
        assert inspection.notes is None


class TestInspectionFindingModel:
    """Unit tests for InspectionFinding model"""

    @pytest.mark.asyncio
    async def test_finding_creation(self, db_session, sample_project):
        """Test: InspectionFinding can be created and persisted"""
        inspection = ProjectInspection(project_id=sample_project.id)
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        finding = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.CRITICAL.value,
            description="Critical issue found",
            location="Area A, Floor 3"
        )
        db_session.add(finding)
        await db_session.commit()
        await db_session.refresh(finding)

        assert finding.id is not None
        assert finding.finding_type == "critical"
        assert finding.description == "Critical issue found"
        assert finding.location == "Area A, Floor 3"

    @pytest.mark.asyncio
    async def test_cascade_delete(self, db_session, sample_project):
        """Test: Findings are deleted when inspection is deleted (CASCADE)"""
        inspection = ProjectInspection(project_id=sample_project.id)
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        finding1 = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.PASS.value,
            description="Finding 1"
        )
        finding2 = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.MINOR_ISSUE.value,
            description="Finding 2"
        )
        db_session.add_all([finding1, finding2])
        await db_session.commit()
        await db_session.refresh(finding1)
        await db_session.refresh(finding2)

        finding1_id = finding1.id
        finding2_id = finding2.id

        # Delete inspection (should cascade delete findings)
        await db_session.delete(inspection)
        await db_session.commit()

        # Verify findings are deleted
        stmt1 = select(InspectionFinding).where(InspectionFinding.id == finding1_id)
        result1 = await db_session.execute(stmt1)
        assert result1.scalar_one_or_none() is None

        stmt2 = select(InspectionFinding).where(InspectionFinding.id == finding2_id)
        result2 = await db_session.execute(stmt2)
        assert result2.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_finding_optional_fields(self, db_session, sample_project):
        """Test: InspectionFinding optional fields can be None"""
        inspection = ProjectInspection(project_id=sample_project.id)
        db_session.add(inspection)
        await db_session.commit()
        await db_session.refresh(inspection)

        # Create finding with only required fields
        finding = InspectionFinding(
            inspection_id=inspection.id,
            finding_type=FindingType.PASS.value,
            description="Test finding"
        )
        db_session.add(finding)
        await db_session.commit()
        await db_session.refresh(finding)

        # Verify optional fields are None or have defaults
        assert finding.location is None
        assert finding.resolution is None
        assert finding.resolved_at is None
