#!/usr/bin/env python3
"""
Test script to verify equipment_templates seed script idempotency.
Run this after setting up the database to confirm that running the seed
script multiple times does not create duplicate records.

Usage:
    cd backend
    python test_idempotency.py
"""
import asyncio
import sys
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.equipment_template import EquipmentTemplate
from app.db.seeds.equipment_templates import seed_equipment_templates


async def get_template_count():
    """Get the current count of equipment templates in the database."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count()).select_from(EquipmentTemplate))
        count = result.scalar()
        return count


async def test_idempotency():
    """
    Test that running the seed script multiple times is idempotent.

    Steps:
    1. Get initial count
    2. Run seed script first time
    3. Get count after first run
    4. Run seed script second time
    5. Get count after second run
    6. Verify counts are the same
    """
    print("=" * 60)
    print("IDEMPOTENCY TEST FOR EQUIPMENT TEMPLATES SEED SCRIPT")
    print("=" * 60)

    # Get initial count
    print("\n[1] Checking initial template count...")
    initial_count = await get_template_count()
    print(f"    Initial count: {initial_count}")

    # First run
    print("\n[2] Running seed script (first time)...")
    await seed_equipment_templates()
    count_after_first = await get_template_count()
    print(f"    Count after first run: {count_after_first}")

    # Second run
    print("\n[3] Running seed script (second time)...")
    await seed_equipment_templates()
    count_after_second = await get_template_count()
    print(f"    Count after second run: {count_after_second}")

    # Verify idempotency
    print("\n" + "=" * 60)
    print("VERIFICATION RESULTS")
    print("=" * 60)

    if count_after_first == count_after_second:
        print(f"✅ PASS: Idempotency verified!")
        print(f"   - Count after first run: {count_after_first}")
        print(f"   - Count after second run: {count_after_second}")
        print(f"   - No duplicates created")

        if count_after_first == 11:
            print(f"✅ PASS: Expected 11 templates found")
        else:
            print(f"⚠️  WARNING: Expected 11 templates, but found {count_after_first}")

        return True
    else:
        print(f"❌ FAIL: Idempotency check failed!")
        print(f"   - Count after first run: {count_after_first}")
        print(f"   - Count after second run: {count_after_second}")
        print(f"   - Duplicates were created!")
        return False


async def main():
    """Main entry point."""
    try:
        success = await test_idempotency()
        print("\n" + "=" * 60)
        if success:
            print("✅ All tests passed!")
            sys.exit(0)
        else:
            print("❌ Tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error during test execution: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
