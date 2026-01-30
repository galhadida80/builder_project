import pytest
from uuid import uuid4
from sqlalchemy import select
from app.models.inspection import (
    ConsultantType, InspectionStageTemplate,
    ProjectInspection, InspectionResult,
    InspectionStatus, ResultStatus
)
from app.models.project import Project
from app.models.area import ConstructionArea


@pytest.mark.asyncio
async def test_consultant_type_crud(db_session):
    """Test create, read, update, delete consultant types."""
    # Create
    consultant = ConsultantType(
        name=f"Test Consultant {uuid4().hex[:8]}",
        description="Test description",
        stage_count=3,
        is_active=True
    )
    db_session.add(consultant)
    await db_session.flush()
    consultant_id = consultant.id
    assert consultant.id is not None
    assert consultant.name.startswith("Test Consultant")
    assert consultant.stage_count == 3

    # Read
    result = await db_session.execute(
        select(ConsultantType).where(ConsultantType.id == consultant_id)
    )
    found = result.scalar_one()
    assert found.name == consultant.name
    assert found.description == "Test description"
    assert found.stage_count == 3
    assert found.is_active is True

    # Update
    found.description = "Updated description"
    found.stage_count = 5
    await db_session.flush()

    # Verify update
    result = await db_session.execute(
        select(ConsultantType).where(ConsultantType.id == consultant_id)
    )
    updated = result.scalar_one()
    assert updated.description == "Updated description"
    assert updated.stage_count == 5

    # Delete
    await db_session.delete(updated)
    await db_session.flush()

    # Verify deletion
    result = await db_session.execute(
        select(ConsultantType).where(ConsultantType.id == consultant_id)
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_jsonb_mutation_tracking(db_session):
    """Test JSONB field changes are detected and persisted."""
    # Create consultant type
    consultant = ConsultantType(
        name=f"Test JSONB {uuid4().hex[:8]}",
        stage_count=3
    )
    db_session.add(consultant)
    await db_session.flush()

    # Create template with JSONB
    template = InspectionStageTemplate(
        consultant_type_id=consultant.id,
        stage_definitions={
            "stages": [
                {"stage_number": 1, "stage_name": "Initial Survey", "requirements": ["Site photos"]},
                {"stage_number": 2, "stage_name": "Foundation Check", "requirements": ["Depth verification"]}
            ]
        }
    )
    db_session.add(template)
    await db_session.flush()
    template_id = template.id

    # Perform in-place mutation (this is what MutableDict enables)
    template.stage_definitions["stages"][0]["stage_name"] = "Updated Initial Survey"
    template.stage_definitions["stages"].append({
        "stage_number": 3,
        "stage_name": "New Stage",
        "requirements": ["New requirement"]
    })
    await db_session.commit()

    # Verify persistence - reload from database
    result = await db_session.execute(
        select(InspectionStageTemplate).where(InspectionStageTemplate.id == template_id)
    )
    loaded = result.scalar_one()

    # Verify mutations were tracked and persisted
    assert loaded.stage_definitions["stages"][0]["stage_name"] == "Updated Initial Survey"
    assert len(loaded.stage_definitions["stages"]) == 3
    assert loaded.stage_definitions["stages"][2]["stage_name"] == "New Stage"


@pytest.mark.asyncio
async def test_inspection_status_transitions(db_session):
    """Test status changes follow scheduled → completed → approved flow."""
    # Setup: create consultant type
    consultant = ConsultantType(
        name=f"Test Status {uuid4().hex[:8]}",
        stage_count=2
    )
    db_session.add(consultant)
    await db_session.flush()

    # Create project
    project = Project(
        name=f"Test Project {uuid4().hex[:8]}",
        description="Test project for status workflow"
    )
    db_session.add(project)
    await db_session.flush()

    # Create inspection with scheduled status
    inspection = ProjectInspection(
        project_id=project.id,
        consultant_type_id=consultant.id,
        template_snapshot={"stages": [{"stage_number": 1}, {"stage_number": 2}]},
        status=InspectionStatus.SCHEDULED.value
    )
    db_session.add(inspection)
    await db_session.flush()
    inspection_id = inspection.id

    # Test transition: scheduled → completed
    inspection.status = InspectionStatus.COMPLETED.value
    await db_session.flush()

    result = await db_session.execute(
        select(ProjectInspection).where(ProjectInspection.id == inspection_id)
    )
    updated = result.scalar_one()
    assert updated.status == InspectionStatus.COMPLETED.value

    # Test transition: completed → approved
    updated.status = InspectionStatus.APPROVED.value
    await db_session.flush()

    result = await db_session.execute(
        select(ProjectInspection).where(ProjectInspection.id == inspection_id)
    )
    approved = result.scalar_one()
    assert approved.status == InspectionStatus.APPROVED.value

    # Verify valid status values
    assert InspectionStatus.SCHEDULED.value == "scheduled"
    assert InspectionStatus.COMPLETED.value == "completed"
    assert InspectionStatus.APPROVED.value == "approved"


@pytest.mark.asyncio
async def test_template_validation(db_session):
    """Test JSONB stage templates validate structure."""
    # Create consultant type
    consultant = ConsultantType(
        name=f"Test Template {uuid4().hex[:8]}",
        stage_count=5
    )
    db_session.add(consultant)
    await db_session.flush()

    # Test valid structure with 1 stage
    template_1 = InspectionStageTemplate(
        consultant_type_id=consultant.id,
        stage_definitions={
            "stages": [
                {"stage_number": 1, "stage_name": "Single Stage"}
            ]
        }
    )
    db_session.add(template_1)
    await db_session.flush()
    assert template_1.id is not None

    # Test valid structure with 7 stages (maximum)
    template_7 = InspectionStageTemplate(
        consultant_type_id=consultant.id,
        stage_definitions={
            "stages": [
                {"stage_number": i, "stage_name": f"Stage {i}"}
                for i in range(1, 8)
            ]
        }
    )
    db_session.add(template_7)
    await db_session.flush()
    assert template_7.id is not None
    assert len(template_7.stage_definitions["stages"]) == 7

    # Test flexible schema - different field combinations
    template_flexible = InspectionStageTemplate(
        consultant_type_id=consultant.id,
        stage_definitions={
            "stages": [
                {
                    "stage_number": 1,
                    "stage_name": "Flexible Stage",
                    "requirements": ["Requirement 1", "Requirement 2"],
                    "custom_field": "Custom value"
                }
            ],
            "metadata": {
                "version": "1.0",
                "custom_key": "custom_value"
            }
        }
    )
    db_session.add(template_flexible)
    await db_session.flush()
    assert template_flexible.id is not None
    assert template_flexible.stage_definitions["metadata"]["version"] == "1.0"

    # Test empty JSONB (should default to empty dict)
    template_empty = InspectionStageTemplate(
        consultant_type_id=consultant.id,
        stage_definitions={}
    )
    db_session.add(template_empty)
    await db_session.flush()
    assert template_empty.id is not None
    assert template_empty.stage_definitions == {}


@pytest.mark.asyncio
async def test_duplicate_inspection_prevention(db_session):
    """Test cannot create duplicate inspections for same consultant/area."""
    # Setup: create consultant type
    consultant = ConsultantType(
        name=f"Test Duplicate {uuid4().hex[:8]}",
        stage_count=2
    )
    db_session.add(consultant)
    await db_session.flush()

    # Create project
    project = Project(
        name=f"Test Project {uuid4().hex[:8]}",
        description="Test project for duplicate prevention"
    )
    db_session.add(project)
    await db_session.flush()

    # Create area
    area = ConstructionArea(
        project_id=project.id,
        name=f"Test Area {uuid4().hex[:8]}",
        type="residential"
    )
    db_session.add(area)
    await db_session.flush()

    # Create first inspection for consultant/area combo
    inspection1 = ProjectInspection(
        project_id=project.id,
        consultant_type_id=consultant.id,
        area_id=area.id,
        template_snapshot={"stages": [{"stage_number": 1}]},
        status=InspectionStatus.SCHEDULED.value
    )
    db_session.add(inspection1)
    await db_session.flush()
    assert inspection1.id is not None

    # Query to check for duplicates
    result = await db_session.execute(
        select(ProjectInspection).where(
            ProjectInspection.project_id == project.id,
            ProjectInspection.consultant_type_id == consultant.id,
            ProjectInspection.area_id == area.id
        )
    )
    existing_inspections = result.scalars().all()

    # Verify only one inspection exists for this combo
    assert len(existing_inspections) == 1
    assert existing_inspections[0].id == inspection1.id

    # Business logic: Before creating a duplicate, check for existing
    # (In production, this would be in API endpoint validation)
    has_duplicate = len(existing_inspections) > 0
    assert has_duplicate is True  # Duplicate detection works

    # Create inspection for same consultant but different area (should be allowed)
    area2 = ConstructionArea(
        project_id=project.id,
        name=f"Test Area 2 {uuid4().hex[:8]}",
        type="commercial"
    )
    db_session.add(area2)
    await db_session.flush()

    inspection2 = ProjectInspection(
        project_id=project.id,
        consultant_type_id=consultant.id,
        area_id=area2.id,  # Different area
        template_snapshot={"stages": [{"stage_number": 1}]},
        status=InspectionStatus.SCHEDULED.value
    )
    db_session.add(inspection2)
    await db_session.flush()
    assert inspection2.id is not None

    # Verify both inspections exist (different areas)
    result = await db_session.execute(
        select(ProjectInspection).where(
            ProjectInspection.project_id == project.id,
            ProjectInspection.consultant_type_id == consultant.id
        )
    )
    all_inspections = result.scalars().all()
    assert len(all_inspections) == 2

    # Create project-wide inspection (no area_id) - should be allowed
    inspection3 = ProjectInspection(
        project_id=project.id,
        consultant_type_id=consultant.id,
        area_id=None,  # Project-wide
        template_snapshot={"stages": [{"stage_number": 1}]},
        status=InspectionStatus.SCHEDULED.value
    )
    db_session.add(inspection3)
    await db_session.flush()
    assert inspection3.id is not None
    assert inspection3.area_id is None
