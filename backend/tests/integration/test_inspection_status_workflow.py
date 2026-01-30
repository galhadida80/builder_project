"""
Integration test for inspection status workflow.

Tests the progression: scheduled → completed → approved

Steps:
1. Create inspection with status=scheduled
2. Update to status=completed
3. Create inspection result for stage 1
4. Update inspection to status=approved
5. Verify status progression rules enforced
"""

import asyncio
import uuid
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_settings
from app.db.session import Base
from app.models.project import Project
from app.models.inspection import (
    ConsultantType,
    ProjectInspection,
    InspectionResult,
    InspectionStatus,
    ResultStatus
)


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
        for result_id in test_ids.get('result_ids', []):
            result = await session.execute(
                select(InspectionResult).where(InspectionResult.id == result_id)
            )
            inspection_result = result.scalar_one_or_none()
            if inspection_result:
                await session.delete(inspection_result)

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


async def test_setup_base_data(session: AsyncSession):
    """Setup: Create project and consultant type."""
    print("\n=== Setup: Create Base Test Data ===")

    # Create a test project
    project = Project(
        name="Test Project for Status Workflow",
        code=f"TEST-{uuid.uuid4().hex[:8].upper()}",
        description="Integration test project for status workflow",
        status="active"
    )
    session.add(project)
    await session.flush()
    print(f"✓ Created test project: {project.id}")

    # Create a test consultant type
    consultant_type = ConsultantType(
        name=f"Test Consultant {uuid.uuid4().hex[:8]}",
        description="Test consultant type for status workflow",
        stage_count=3,
        is_active=True
    )
    session.add(consultant_type)
    await session.flush()
    print(f"✓ Created test consultant type: {consultant_type.id}")

    await session.commit()

    return {
        'project_id': project.id,
        'consultant_type_id': consultant_type.id,
        'result_ids': []
    }


async def test_create_scheduled_inspection(session: AsyncSession, test_ids: dict):
    """Test 1: Create inspection with status=scheduled."""
    print("\n=== Test 1: Create Inspection with Status=SCHEDULED ===")

    project_id = test_ids['project_id']
    consultant_type_id = test_ids['consultant_type_id']

    # Create an inspection with scheduled status
    inspection = ProjectInspection(
        project_id=project_id,
        consultant_type_id=consultant_type_id,
        template_snapshot={
            "stages": [
                {"stage_number": 1, "stage_name": "Initial Survey", "requirements": ["Site photos"]},
                {"stage_number": 2, "stage_name": "Foundation Check", "requirements": ["Depth verification"]},
                {"stage_number": 3, "stage_name": "Final Approval", "requirements": ["Sign-off"]}
            ]
        },
        status=InspectionStatus.SCHEDULED.value,
        scheduled_date=date.today(),
        assigned_inspector="Test Inspector",
        notes="Initial scheduled inspection"
    )
    session.add(inspection)
    await session.flush()
    test_ids['inspection_id'] = inspection.id
    print(f"✓ Created inspection with status=SCHEDULED: {inspection.id}")

    # Verify the inspection was created with scheduled status
    assert inspection.status == InspectionStatus.SCHEDULED.value
    assert inspection.project_id == project_id
    assert inspection.consultant_type_id == consultant_type_id
    print("✓ Inspection created with correct SCHEDULED status")

    await session.commit()
    return True


async def test_update_to_completed(session: AsyncSession, test_ids: dict):
    """Test 2: Update inspection to status=completed."""
    print("\n=== Test 2: Update Inspection to Status=COMPLETED ===")

    inspection_id = test_ids['inspection_id']

    # Load the inspection
    result = await session.execute(
        select(ProjectInspection).where(ProjectInspection.id == inspection_id)
    )
    inspection = result.scalar_one()

    # Verify current status
    assert inspection.status == InspectionStatus.SCHEDULED.value
    print(f"✓ Current status: {inspection.status}")

    # Update to completed
    inspection.status = InspectionStatus.COMPLETED.value
    inspection.notes = "Inspection completed successfully"
    await session.flush()
    await session.refresh(inspection)
    print(f"✓ Updated inspection to status=COMPLETED")

    # Verify the status was updated
    assert inspection.status == InspectionStatus.COMPLETED.value
    print("✓ Status successfully updated to COMPLETED")

    await session.commit()
    return True


async def test_create_inspection_result(session: AsyncSession, test_ids: dict):
    """Test 3: Create inspection result for stage 1."""
    print("\n=== Test 3: Create Inspection Result for Stage 1 ===")

    inspection_id = test_ids['inspection_id']

    # Create an inspection result for stage 1
    result = InspectionResult(
        inspection_id=inspection_id,
        stage_number=1,
        completion_date=date.today(),
        inspector_name="Test Inspector",
        result_status=ResultStatus.COMPLETED.value,
        findings="Stage 1 completed successfully. All requirements met.",
        attachments={"photos": ["photo1.jpg", "photo2.jpg"]}
    )
    session.add(result)
    await session.flush()
    test_ids['result_ids'].append(result.id)
    print(f"✓ Created inspection result for stage 1: {result.id}")

    # Verify the result was created correctly
    assert result.inspection_id == inspection_id
    assert result.stage_number == 1
    assert result.result_status == ResultStatus.COMPLETED.value
    print("✓ Inspection result created with correct details")

    await session.commit()
    return True


async def test_update_to_approved(session: AsyncSession, test_ids: dict):
    """Test 4: Update inspection to status=approved."""
    print("\n=== Test 4: Update Inspection to Status=APPROVED ===")

    inspection_id = test_ids['inspection_id']

    # Load the inspection
    result = await session.execute(
        select(ProjectInspection).where(ProjectInspection.id == inspection_id)
    )
    inspection = result.scalar_one()

    # Verify current status is completed
    assert inspection.status == InspectionStatus.COMPLETED.value
    print(f"✓ Current status: {inspection.status}")

    # Update to approved
    inspection.status = InspectionStatus.APPROVED.value
    inspection.notes = "Inspection approved after review"
    await session.flush()
    await session.refresh(inspection)
    print(f"✓ Updated inspection to status=APPROVED")

    # Verify the status was updated
    assert inspection.status == InspectionStatus.APPROVED.value
    print("✓ Status successfully updated to APPROVED")

    await session.commit()
    return True


async def test_verify_status_progression(session: AsyncSession, test_ids: dict):
    """Test 5: Verify the complete status progression."""
    print("\n=== Test 5: Verify Complete Status Progression ===")

    inspection_id = test_ids['inspection_id']

    # Load the inspection with results
    result = await session.execute(
        select(ProjectInspection).where(ProjectInspection.id == inspection_id)
    )
    inspection = result.scalar_one()

    # Load the inspection results
    results_query = await session.execute(
        select(InspectionResult).where(InspectionResult.inspection_id == inspection_id)
    )
    inspection_results = results_query.scalars().all()

    # Verify final state
    assert inspection.status == InspectionStatus.APPROVED.value
    print(f"✓ Final inspection status: {inspection.status}")

    assert len(inspection_results) >= 1, "Should have at least one inspection result"
    print(f"✓ Found {len(inspection_results)} inspection result(s)")

    # Verify result status
    for idx, result in enumerate(inspection_results, 1):
        assert result.result_status == ResultStatus.COMPLETED.value
        print(f"✓ Result {idx} status: {result.result_status}")

    print("\n✓ Status progression verified:")
    print("  1. Created with SCHEDULED status")
    print("  2. Updated to COMPLETED status")
    print("  3. Created inspection result for stage 1")
    print("  4. Updated to APPROVED status")

    return True


async def test_status_workflow_from_scratch(session: AsyncSession):
    """Additional test: Complete workflow from scratch in one test."""
    print("\n=== Test 6: Complete Workflow from Scratch ===")

    # Create temporary test data
    project = Project(
        name="Workflow Test Project",
        code=f"WF-{uuid.uuid4().hex[:8].upper()}",
        description="Workflow test",
        status="active"
    )
    session.add(project)
    await session.flush()

    consultant_type = ConsultantType(
        name=f"Workflow Consultant {uuid.uuid4().hex[:8]}",
        description="Workflow test consultant",
        stage_count=2,
        is_active=True
    )
    session.add(consultant_type)
    await session.flush()

    # Create inspection (SCHEDULED)
    inspection = ProjectInspection(
        project_id=project.id,
        consultant_type_id=consultant_type.id,
        template_snapshot={"stages": [{"stage_number": 1, "stage_name": "Survey"}]},
        status=InspectionStatus.SCHEDULED.value,
        scheduled_date=date.today()
    )
    session.add(inspection)
    await session.flush()
    initial_status = inspection.status
    print(f"✓ Step 1: Created with status={initial_status}")

    # Update to COMPLETED
    inspection.status = InspectionStatus.COMPLETED.value
    await session.flush()
    await session.refresh(inspection)
    print(f"✓ Step 2: Updated to status={inspection.status}")

    # Create result
    result = InspectionResult(
        inspection_id=inspection.id,
        stage_number=1,
        result_status=ResultStatus.COMPLETED.value,
        completion_date=date.today()
    )
    session.add(result)
    await session.flush()
    print(f"✓ Step 3: Created result with status={result.result_status}")

    # Update to APPROVED
    inspection.status = InspectionStatus.APPROVED.value
    await session.flush()
    await session.refresh(inspection)
    final_status = inspection.status
    print(f"✓ Step 4: Updated to final status={final_status}")

    # Verify complete progression
    assert initial_status == InspectionStatus.SCHEDULED.value
    assert final_status == InspectionStatus.APPROVED.value
    print("✓ Complete workflow verified: SCHEDULED → COMPLETED → APPROVED")

    # Cleanup
    await session.delete(result)
    await session.delete(inspection)
    await session.delete(consultant_type)
    await session.delete(project)
    await session.commit()

    return True


async def run_all_tests():
    """Run all integration tests."""
    print("=" * 60)
    print("Inspection Status Workflow Integration Tests")
    print("=" * 60)

    engine, SessionLocal = await setup_database()
    test_ids = {}

    async with SessionLocal() as session:
        try:
            # Setup: Create base data (project, consultant type)
            test_ids = await test_setup_base_data(session)

            # Test 1: Create inspection with status=scheduled
            await test_create_scheduled_inspection(session, test_ids)

            # Test 2: Update to status=completed
            await test_update_to_completed(session, test_ids)

            # Test 3: Create inspection result for stage 1
            await test_create_inspection_result(session, test_ids)

            # Test 4: Update to status=approved
            await test_update_to_approved(session, test_ids)

            # Test 5: Verify complete status progression
            await test_verify_status_progression(session, test_ids)

            # Test 6: Complete workflow from scratch
            await test_status_workflow_from_scratch(session)

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
