"""
Integration test for Area-Inspection filtering.

Tests:
1. Create inspection with area_id
2. GET /projects/{id}/areas/{area_id}/inspections
3. Verify only inspections for that area returned
4. Create inspection without area_id (project-wide)
5. Verify it doesn't appear in area-specific query
"""

import asyncio
import uuid
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings
from app.db.session import Base
from app.models.project import Project
from app.models.area import ConstructionArea
from app.models.inspection import ConsultantType, ProjectInspection, InspectionStatus


async def setup_database():
    """Create test database engine and session."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)

    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    return engine, SessionLocal


async def cleanup_test_data(session: AsyncSession, test_ids: dict):
    """Clean up test data created during the test."""
    try:
        # Delete in reverse order of dependencies
        for inspection_id in test_ids.get('inspection_ids', []):
            result = await session.execute(
                select(ProjectInspection).where(ProjectInspection.id == inspection_id)
            )
            inspection = result.scalar_one_or_none()
            if inspection:
                await session.delete(inspection)

        for area_id in test_ids.get('area_ids', []):
            result = await session.execute(
                select(ConstructionArea).where(ConstructionArea.id == area_id)
            )
            area = result.scalar_one_or_none()
            if area:
                await session.delete(area)

        if test_ids.get('project_id'):
            result = await session.execute(
                select(Project).where(Project.id == test_ids['project_id'])
            )
            project = result.scalar_one_or_none()
            if project:
                await session.delete(project)

        if test_ids.get('consultant_type_id'):
            result = await session.execute(
                select(ConsultantType).where(ConsultantType.id == test_ids['consultant_type_id'])
            )
            consultant_type = result.scalar_one_or_none()
            if consultant_type:
                await session.delete(consultant_type)

        await session.commit()
        print("✓ Cleaned up test data")
    except Exception as e:
        await session.rollback()
        print(f"Warning: Cleanup failed: {e}")


async def test_setup_base_data(session: AsyncSession):
    """Setup: Create project, consultant type, and areas."""
    print("\n=== Setup: Create Base Test Data ===")

    # Create a test project
    project = Project(
        name="Test Project for Area Filtering",
        code=f"TEST-{uuid.uuid4().hex[:8].upper()}",
        description="Integration test project for area-based filtering",
        status="active"
    )
    session.add(project)
    await session.flush()
    print(f"✓ Created test project: {project.id}")

    # Create a test consultant type
    consultant_type = ConsultantType(
        name=f"Test Consultant {uuid.uuid4().hex[:8]}",
        description="Test consultant type for area filtering",
        stage_count=2,
        is_active=True
    )
    session.add(consultant_type)
    await session.flush()
    print(f"✓ Created test consultant type: {consultant_type.id}")

    # Create test areas
    area1 = ConstructionArea(
        project_id=project.id,
        name=f"Area 1 - {uuid.uuid4().hex[:6]}",
        area_type="apartment",
        floor_number=1,
        area_code="A1",
        total_units=1
    )
    session.add(area1)
    await session.flush()
    print(f"✓ Created test area 1: {area1.id}")

    area2 = ConstructionArea(
        project_id=project.id,
        name=f"Area 2 - {uuid.uuid4().hex[:6]}",
        area_type="apartment",
        floor_number=2,
        area_code="A2",
        total_units=1
    )
    session.add(area2)
    await session.flush()
    print(f"✓ Created test area 2: {area2.id}")

    await session.commit()

    return {
        'project_id': project.id,
        'consultant_type_id': consultant_type.id,
        'area_ids': [area1.id, area2.id],
        'inspection_ids': []
    }


async def test_create_area_inspection(session: AsyncSession, test_ids: dict):
    """Test 1: Create inspection with area_id."""
    print("\n=== Test 1: Create Inspection with Area ID ===")

    project_id = test_ids['project_id']
    consultant_type_id = test_ids['consultant_type_id']
    area1_id = test_ids['area_ids'][0]

    # Create an inspection for area 1
    inspection1 = ProjectInspection(
        project_id=project_id,
        consultant_type_id=consultant_type_id,
        area_id=area1_id,
        template_snapshot={"stages": [{"stage_number": 1, "stage_name": "Initial Survey"}]},
        status=InspectionStatus.SCHEDULED.value,
        scheduled_date=date.today(),
        notes="Area 1 inspection"
    )
    session.add(inspection1)
    await session.flush()
    test_ids['inspection_ids'].append(inspection1.id)
    print(f"✓ Created inspection for area 1: {inspection1.id}")

    # Verify the inspection was created with correct area_id
    assert inspection1.area_id == area1_id
    assert inspection1.project_id == project_id
    print("✓ Inspection created with correct area_id")

    await session.commit()
    return True


async def test_get_area_inspections(session: AsyncSession, test_ids: dict):
    """Test 2: GET /projects/{id}/areas/{area_id}/inspections."""
    print("\n=== Test 2: Query Inspections by Area ID ===")

    project_id = test_ids['project_id']
    area1_id = test_ids['area_ids'][0]

    # Query inspections for area 1 (simulating the API endpoint)
    result = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id, ProjectInspection.area_id == area1_id)
        .order_by(ProjectInspection.created_at.desc())
    )
    area1_inspections = result.scalars().all()

    print(f"✓ Found {len(area1_inspections)} inspection(s) for area {area1_id}")

    # Verify we found our inspection
    assert len(area1_inspections) >= 1, "Should find at least one inspection for area 1"

    # Verify all inspections belong to area 1
    for inspection in area1_inspections:
        assert inspection.area_id == area1_id, f"All inspections should have area_id={area1_id}"
        assert inspection.project_id == project_id, f"All inspections should have project_id={project_id}"

    print(f"✓ All inspections correctly filtered by area_id={area1_id}")
    return True


async def test_create_project_wide_inspection(session: AsyncSession, test_ids: dict):
    """Test 3: Create inspection without area_id (project-wide)."""
    print("\n=== Test 3: Create Project-Wide Inspection (no area_id) ===")

    project_id = test_ids['project_id']
    consultant_type_id = test_ids['consultant_type_id']

    # Create a project-wide inspection (without area_id)
    project_wide_inspection = ProjectInspection(
        project_id=project_id,
        consultant_type_id=consultant_type_id,
        area_id=None,  # Project-wide inspection
        template_snapshot={"stages": [{"stage_number": 1, "stage_name": "Project-Wide Survey"}]},
        status=InspectionStatus.SCHEDULED.value,
        scheduled_date=date.today(),
        notes="Project-wide inspection (not tied to specific area)"
    )
    session.add(project_wide_inspection)
    await session.flush()
    test_ids['inspection_ids'].append(project_wide_inspection.id)
    print(f"✓ Created project-wide inspection: {project_wide_inspection.id}")

    # Verify the inspection was created without area_id
    assert project_wide_inspection.area_id is None
    assert project_wide_inspection.project_id == project_id
    print("✓ Project-wide inspection created without area_id")

    await session.commit()
    return True


async def test_verify_project_wide_not_in_area_query(session: AsyncSession, test_ids: dict):
    """Test 4: Verify project-wide inspection doesn't appear in area-specific query."""
    print("\n=== Test 4: Verify Project-Wide Inspection Not in Area Query ===")

    project_id = test_ids['project_id']
    area1_id = test_ids['area_ids'][0]
    area2_id = test_ids['area_ids'][1]
    project_wide_inspection_id = test_ids['inspection_ids'][-1]  # Last inspection created

    # Query inspections for area 1
    result_area1 = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id, ProjectInspection.area_id == area1_id)
    )
    area1_inspections = result_area1.scalars().all()

    # Query inspections for area 2
    result_area2 = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id, ProjectInspection.area_id == area2_id)
    )
    area2_inspections = result_area2.scalars().all()

    # Verify project-wide inspection does not appear in area-specific queries
    area1_inspection_ids = [insp.id for insp in area1_inspections]
    area2_inspection_ids = [insp.id for insp in area2_inspections]

    assert project_wide_inspection_id not in area1_inspection_ids, "Project-wide inspection should not appear in area 1 query"
    assert project_wide_inspection_id not in area2_inspection_ids, "Project-wide inspection should not appear in area 2 query"

    print(f"✓ Project-wide inspection not found in area 1 query (correct)")
    print(f"✓ Project-wide inspection not found in area 2 query (correct)")

    # Query all project inspections (without area filter)
    result_all = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id)
    )
    all_inspections = result_all.scalars().all()

    # Verify project-wide inspection IS in project-level query
    all_inspection_ids = [insp.id for insp in all_inspections]
    assert project_wide_inspection_id in all_inspection_ids, "Project-wide inspection should appear in project-level query"
    print(f"✓ Project-wide inspection found in project-level query (correct)")

    return True


async def test_multiple_area_inspections(session: AsyncSession, test_ids: dict):
    """Test 5: Create inspections for multiple areas and verify isolation."""
    print("\n=== Test 5: Multiple Area Inspections (Verify Isolation) ===")

    project_id = test_ids['project_id']
    consultant_type_id = test_ids['consultant_type_id']
    area1_id = test_ids['area_ids'][0]
    area2_id = test_ids['area_ids'][1]

    # Create an inspection for area 2
    inspection_area2 = ProjectInspection(
        project_id=project_id,
        consultant_type_id=consultant_type_id,
        area_id=area2_id,
        template_snapshot={"stages": [{"stage_number": 1, "stage_name": "Area 2 Survey"}]},
        status=InspectionStatus.SCHEDULED.value,
        scheduled_date=date.today(),
        notes="Area 2 specific inspection"
    )
    session.add(inspection_area2)
    await session.flush()
    test_ids['inspection_ids'].append(inspection_area2.id)
    print(f"✓ Created inspection for area 2: {inspection_area2.id}")

    await session.commit()

    # Query inspections for area 1
    result_area1 = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id, ProjectInspection.area_id == area1_id)
    )
    area1_inspections = result_area1.scalars().all()

    # Query inspections for area 2
    result_area2 = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id, ProjectInspection.area_id == area2_id)
    )
    area2_inspections = result_area2.scalars().all()

    # Verify area 2 inspection is NOT in area 1 results
    area1_inspection_ids = [insp.id for insp in area1_inspections]
    assert inspection_area2.id not in area1_inspection_ids, "Area 2 inspection should not appear in area 1 query"
    print(f"✓ Area 2 inspection not found in area 1 query (correct isolation)")

    # Verify area 2 inspection IS in area 2 results
    area2_inspection_ids = [insp.id for insp in area2_inspections]
    assert inspection_area2.id in area2_inspection_ids, "Area 2 inspection should appear in area 2 query"
    print(f"✓ Area 2 inspection found in area 2 query (correct)")

    print(f"✓ Area inspection isolation verified: Area 1 has {len(area1_inspections)} inspection(s), Area 2 has {len(area2_inspections)} inspection(s)")

    return True


async def run_all_tests():
    """Run all integration tests."""
    print("=" * 60)
    print("Area-Inspection Filtering Integration Tests")
    print("=" * 60)

    engine, SessionLocal = await setup_database()
    test_ids = {}

    async with SessionLocal() as session:
        try:
            # Setup: Create base data (project, consultant type, areas)
            test_ids = await test_setup_base_data(session)

            # Test 1: Create inspection with area_id
            await test_create_area_inspection(session, test_ids)

            # Test 2: GET inspections by area_id
            await test_get_area_inspections(session, test_ids)

            # Test 3: Create project-wide inspection (without area_id)
            await test_create_project_wide_inspection(session, test_ids)

            # Test 4: Verify project-wide inspection doesn't appear in area-specific query
            await test_verify_project_wide_not_in_area_query(session, test_ids)

            # Test 5: Create inspections for multiple areas and verify isolation
            await test_multiple_area_inspections(session, test_ids)

            print("\n" + "=" * 60)
            print("✓ All tests passed!")
            print("=" * 60)

            return True

        except AssertionError as e:
            print(f"\n✗ Test assertion failed: {e}")
            return False

        except Exception as e:
            print(f"\n✗ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
            return False

        finally:
            # Cleanup test data
            await cleanup_test_data(session, test_ids)
            await engine.dispose()


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)
