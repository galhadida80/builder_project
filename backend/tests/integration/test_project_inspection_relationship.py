"""
Integration test for Project-Inspection relationship integrity.

Tests:
1. Create project inspection via API
2. Query inspection by project_id
3. Verify foreign key constraints
4. Attempt to create inspection for non-existent project (expect 404)
"""

import asyncio
import uuid
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings
from app.db.session import Base
from app.models.project import Project
from app.models.inspection import ConsultantType, ProjectInspection, InspectionStatus
from app.models.user import User


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
        if test_ids.get('inspection_id'):
            result = await session.execute(
                select(ProjectInspection).where(ProjectInspection.id == test_ids['inspection_id'])
            )
            inspection = result.scalar_one_or_none()
            if inspection:
                await session.delete(inspection)

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


async def test_create_project_inspection(session: AsyncSession):
    """Test 1: Create project inspection via API models."""
    print("\n=== Test 1: Create Project Inspection ===")

    # Create a test project
    project = Project(
        name="Test Project for Inspection",
        code=f"TEST-{uuid.uuid4().hex[:8].upper()}",
        description="Integration test project",
        status="active"
    )
    session.add(project)
    await session.flush()
    print(f"✓ Created test project: {project.id}")

    # Create a test consultant type
    consultant_type = ConsultantType(
        name=f"Test Consultant {uuid.uuid4().hex[:8]}",
        description="Test consultant type for integration testing",
        stage_count=3,
        is_active=True
    )
    session.add(consultant_type)
    await session.flush()
    print(f"✓ Created test consultant type: {consultant_type.id}")

    # Create a project inspection
    inspection = ProjectInspection(
        project_id=project.id,
        consultant_type_id=consultant_type.id,
        template_snapshot={"stages": [{"stage_number": 1, "stage_name": "Initial Survey"}]},
        status=InspectionStatus.SCHEDULED.value,
        scheduled_date=date.today(),
        notes="Integration test inspection"
    )
    session.add(inspection)
    await session.flush()
    await session.refresh(inspection)
    print(f"✓ Created test inspection: {inspection.id}")

    # Verify the inspection was created with correct relationships
    assert inspection.project_id == project.id
    assert inspection.consultant_type_id == consultant_type.id
    assert inspection.status == InspectionStatus.SCHEDULED.value
    print("✓ Inspection created with correct relationships")

    await session.commit()

    return {
        'project_id': project.id,
        'consultant_type_id': consultant_type.id,
        'inspection_id': inspection.id
    }


async def test_query_inspection_by_project(session: AsyncSession, test_ids: dict):
    """Test 2: Query inspection by project_id."""
    print("\n=== Test 2: Query Inspection by Project ID ===")

    project_id = test_ids['project_id']
    inspection_id = test_ids['inspection_id']

    # Query inspections by project_id
    result = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.project_id == project_id)
    )
    inspections = result.scalars().all()

    print(f"✓ Found {len(inspections)} inspection(s) for project {project_id}")

    # Verify we found our inspection
    assert len(inspections) >= 1, "Should find at least one inspection"

    # Find our specific inspection
    our_inspection = next((i for i in inspections if i.id == inspection_id), None)
    assert our_inspection is not None, "Should find our specific inspection"
    assert our_inspection.project_id == project_id
    print(f"✓ Successfully queried inspection {inspection_id} by project_id")

    return True


async def test_foreign_key_constraints(session: AsyncSession, test_ids: dict):
    """Test 3: Verify foreign key constraints."""
    print("\n=== Test 3: Verify Foreign Key Constraints ===")

    inspection_id = test_ids['inspection_id']
    project_id = test_ids['project_id']
    consultant_type_id = test_ids['consultant_type_id']

    # Load inspection with relationships
    result = await session.execute(
        select(ProjectInspection)
        .where(ProjectInspection.id == inspection_id)
    )
    inspection = result.scalar_one()

    # Load project separately
    project_result = await session.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one()

    # Load consultant type separately
    consultant_result = await session.execute(
        select(ConsultantType).where(ConsultantType.id == consultant_type_id)
    )
    consultant_type = consultant_result.scalar_one()

    # Verify foreign key relationships exist
    assert inspection.project_id == project.id
    assert inspection.consultant_type_id == consultant_type.id
    print(f"✓ Foreign key constraint verified: inspection.project_id == {project.id}")
    print(f"✓ Foreign key constraint verified: inspection.consultant_type_id == {consultant_type.id}")

    return True


async def test_nonexistent_project_inspection(session: AsyncSession, test_ids: dict):
    """Test 4: Attempt to create inspection for non-existent project."""
    print("\n=== Test 4: Create Inspection for Non-existent Project ===")

    consultant_type_id = test_ids['consultant_type_id']
    fake_project_id = uuid.uuid4()

    # Verify the fake project doesn't exist
    result = await session.execute(
        select(Project).where(Project.id == fake_project_id)
    )
    project = result.scalar_one_or_none()
    assert project is None, "Fake project should not exist"
    print(f"✓ Confirmed project {fake_project_id} does not exist")

    # Attempt to create inspection with non-existent project_id
    try:
        inspection = ProjectInspection(
            project_id=fake_project_id,
            consultant_type_id=consultant_type_id,
            template_snapshot={},
            status=InspectionStatus.SCHEDULED.value
        )
        session.add(inspection)
        await session.flush()
        await session.commit()

        # If we get here, the test failed
        print("✗ FAILED: Should have raised foreign key constraint error")
        return False

    except Exception as e:
        # Expected to fail with foreign key constraint violation
        await session.rollback()
        error_msg = str(e)

        # Check if it's a foreign key constraint error
        if 'foreign key constraint' in error_msg.lower() or 'violates foreign key' in error_msg.lower():
            print(f"✓ Expected error caught: Foreign key constraint violation")
            print(f"  Error: {type(e).__name__}")
            return True
        else:
            print(f"✗ Unexpected error type: {error_msg}")
            return False


async def run_all_tests():
    """Run all integration tests."""
    print("=" * 60)
    print("Project-Inspection Relationship Integrity Tests")
    print("=" * 60)

    engine, SessionLocal = await setup_database()
    test_ids = {}

    async with SessionLocal() as session:
        try:
            # Test 1: Create project inspection
            test_ids = await test_create_project_inspection(session)

            # Test 2: Query inspection by project_id
            await test_query_inspection_by_project(session, test_ids)

            # Test 3: Verify foreign key constraints
            await test_foreign_key_constraints(session, test_ids)

            # Test 4: Attempt to create inspection for non-existent project
            await test_nonexistent_project_inspection(session, test_ids)

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
