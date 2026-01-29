"""
Integration test for JSONB mutation tracking for templates.

Tests:
1. Create inspection stage template with JSONB stages
2. Update stage_definitions JSONB field
3. Commit and refresh session
4. Verify changes persisted (MutableDict tracking works)
"""

import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import flag_modified

from app.config import get_settings
from app.db.session import Base
from app.models.inspection import ConsultantType, InspectionStageTemplate


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
        if test_ids.get('template_id'):
            result = await session.execute(
                select(InspectionStageTemplate).where(InspectionStageTemplate.id == test_ids['template_id'])
            )
            template = result.scalar_one_or_none()
            if template:
                await session.delete(template)

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


async def test_create_template_with_jsonb_stages(session: AsyncSession):
    """Test 1: Create inspection stage template with JSONB stages."""
    print("\n=== Test 1: Create Inspection Stage Template with JSONB ===")

    # Create a test consultant type
    consultant_type = ConsultantType(
        name=f"Test Consultant JSONB {uuid.uuid4().hex[:8]}",
        description="Test consultant type for JSONB mutation tracking",
        stage_count=3,
        is_active=True
    )
    session.add(consultant_type)
    await session.flush()
    print(f"✓ Created test consultant type: {consultant_type.id}")

    # Create an inspection stage template with JSONB stages
    initial_stages = {
        "stages": [
            {
                "stage_number": 1,
                "stage_name": "Initial Survey",
                "requirements": ["Site photos", "Soil samples"]
            },
            {
                "stage_number": 2,
                "stage_name": "Foundation Check",
                "requirements": ["Depth verification", "Concrete strength"]
            },
            {
                "stage_number": 3,
                "stage_name": "Final Inspection",
                "requirements": ["Completion certificate"]
            }
        ]
    }

    template = InspectionStageTemplate(
        consultant_type_id=consultant_type.id,
        stage_definitions=initial_stages,
        version=1,
        is_active=True
    )
    session.add(template)
    await session.flush()
    await session.refresh(template)
    print(f"✓ Created test template: {template.id}")

    # Verify the template was created with correct JSONB data
    assert template.stage_definitions is not None
    assert "stages" in template.stage_definitions
    assert len(template.stage_definitions["stages"]) == 3
    assert template.stage_definitions["stages"][0]["stage_name"] == "Initial Survey"
    print("✓ Template created with correct JSONB data")

    await session.commit()

    return {
        'consultant_type_id': consultant_type.id,
        'template_id': template.id
    }


async def test_update_jsonb_field_inplace(session: AsyncSession, test_ids: dict):
    """Test 2: Update stage_definitions JSONB field with in-place mutation."""
    print("\n=== Test 2: Update JSONB Field (In-Place Mutation) ===")

    template_id = test_ids['template_id']

    # Load the template
    result = await session.execute(
        select(InspectionStageTemplate).where(InspectionStageTemplate.id == template_id)
    )
    template = result.scalar_one()

    # Store original data for comparison
    original_stages = template.stage_definitions.copy()
    print(f"✓ Loaded template with {len(original_stages['stages'])} stages")

    # Perform in-place mutation (this tests if MutableDict tracking works)
    template.stage_definitions["stages"][0]["stage_name"] = "Updated Initial Survey"
    template.stage_definitions["stages"].append({
        "stage_number": 4,
        "stage_name": "New Stage",
        "requirements": ["New requirement"]
    })

    print("✓ Modified JSONB field in-place:")
    print(f"  - Updated stage 1 name to: {template.stage_definitions['stages'][0]['stage_name']}")
    print(f"  - Added new stage 4: {template.stage_definitions['stages'][3]['stage_name']}")

    # Note: If MutableDict is not used, we would need to call:
    # flag_modified(template, 'stage_definitions')
    # But if MutableDict.as_mutable(JSONB) is properly configured,
    # SQLAlchemy should auto-detect the change

    await session.commit()
    print("✓ Committed changes")

    return True


async def test_verify_changes_persisted(session: AsyncSession, test_ids: dict):
    """Test 3: Verify changes persisted after commit and refresh."""
    print("\n=== Test 3: Verify Changes Persisted ===")

    template_id = test_ids['template_id']

    # Refresh the session to ensure we're reading from database
    await session.close()

    # Create a new session to verify persistence
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with SessionLocal() as new_session:
        # Load the template in a fresh session
        result = await new_session.execute(
            select(InspectionStageTemplate).where(InspectionStageTemplate.id == template_id)
        )
        template = result.scalar_one()

        # Verify the changes persisted
        assert template.stage_definitions is not None
        assert "stages" in template.stage_definitions
        assert len(template.stage_definitions["stages"]) == 4, \
            f"Expected 4 stages, but found {len(template.stage_definitions['stages'])}"

        stage_1_name = template.stage_definitions["stages"][0]["stage_name"]
        assert stage_1_name == "Updated Initial Survey", \
            f"Expected 'Updated Initial Survey', but found '{stage_1_name}'"

        stage_4_name = template.stage_definitions["stages"][3]["stage_name"]
        assert stage_4_name == "New Stage", \
            f"Expected 'New Stage', but found '{stage_4_name}'"

        print("✓ Changes persisted correctly:")
        print(f"  - Stage 1 name updated to: {stage_1_name}")
        print(f"  - New stage 4 added: {stage_4_name}")
        print(f"  - Total stages: {len(template.stage_definitions['stages'])}")

        await engine.dispose()

    print("✓ JSONB mutation tracking verified - MutableDict wrapper is working!")
    return True


async def test_update_with_flag_modified(session: AsyncSession, test_ids: dict):
    """Test 4: Verify flag_modified() as alternative to MutableDict."""
    print("\n=== Test 4: Update with flag_modified() ===")

    template_id = test_ids['template_id']

    # Load the template
    result = await session.execute(
        select(InspectionStageTemplate).where(InspectionStageTemplate.id == template_id)
    )
    template = result.scalar_one()

    print(f"✓ Loaded template with {len(template.stage_definitions['stages'])} stages")

    # Perform in-place mutation
    template.stage_definitions["stages"][1]["stage_name"] = "Updated Foundation Check"

    # Explicitly mark the field as modified (alternative to MutableDict)
    flag_modified(template, 'stage_definitions')

    print("✓ Modified JSONB field and called flag_modified()")
    print(f"  - Updated stage 2 name to: {template.stage_definitions['stages'][1]['stage_name']}")

    await session.commit()
    print("✓ Committed changes with flag_modified()")

    # Verify in a new session
    await session.close()

    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with SessionLocal() as new_session:
        result = await new_session.execute(
            select(InspectionStageTemplate).where(InspectionStageTemplate.id == template_id)
        )
        template = result.scalar_one()

        stage_2_name = template.stage_definitions["stages"][1]["stage_name"]
        assert stage_2_name == "Updated Foundation Check", \
            f"Expected 'Updated Foundation Check', but found '{stage_2_name}'"

        print(f"✓ Changes persisted with flag_modified(): {stage_2_name}")

        await engine.dispose()

    return True


async def run_all_tests():
    """Run all integration tests."""
    print("=" * 60)
    print("JSONB Mutation Tracking Tests")
    print("=" * 60)

    engine, SessionLocal = await setup_database()
    test_ids = {}

    async with SessionLocal() as session:
        try:
            # Test 1: Create template with JSONB stages
            test_ids = await test_create_template_with_jsonb_stages(session)

            # Test 2: Update JSONB field with in-place mutation
            await test_update_jsonb_field_inplace(session, test_ids)

            # Test 3: Verify changes persisted
            await test_verify_changes_persisted(session, test_ids)

            # Test 4: Update with flag_modified() as alternative
            await test_update_with_flag_modified(session, test_ids)

            print("\n" + "=" * 60)
            print("✓ All tests passed!")
            print("=" * 60)
            print("\nKey Findings:")
            print("- JSONB fields support in-place mutations")
            print("- Changes persist correctly after commit/refresh")
            print("- Both MutableDict and flag_modified() approaches work")
            print("- SQLAlchemy properly tracks JSONB changes")

            return True

        except AssertionError as e:
            print(f"\n✗ Test assertion failed: {e}")
            print("\nNote: If this test fails, it may indicate that:")
            print("- MutableDict.as_mutable(JSONB) is not configured in the model")
            print("- JSONB changes are not being tracked automatically")
            print("- You need to explicitly call flag_modified() after mutations")
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
