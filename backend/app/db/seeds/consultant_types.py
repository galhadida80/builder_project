"""
Seed script to populate consultant types.
Run with: python -m app.db.seeds.consultant_types
"""
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.equipment_template import ConsultantType

# Consultant types based on Israeli construction industry standards
CONSULTANT_TYPES = [
    # Structural
    {"name": "קונסטרוקטור", "name_he": "קונסטרוקטור", "category": "structural"},
    {"name": "יועץ קרקע", "name_he": "יועץ קרקע", "category": "structural"},

    # Architecture
    {"name": "אדריכל", "name_he": "אדריכל", "category": "architecture"},

    # MEP (Mechanical, Electrical, Plumbing)
    {"name": "יועץ אינסטלציה", "name_he": "יועץ אינסטלציה", "category": "plumbing"},
    {"name": "יועץ חשמל", "name_he": "יועץ חשמל", "category": "electrical"},
    {"name": "יועץ מיזוג", "name_he": "יועץ מיזוג", "category": "hvac"},

    # Safety
    {"name": "יועץ בטיחות אש", "name_he": "יועץ בטיחות אש", "category": "fire_safety"},
    {"name": "יועץ ממ\"ד", "name_he": "יועץ ממ\"ד", "category": "safe_room"},

    # Environmental
    {"name": "בניה ירוקה", "name_he": "בניה ירוקה", "category": "environmental"},
    {"name": "יועץ אקוסטיקה", "name_he": "יועץ אקוסטיקה", "category": "environmental"},

    # Specialty
    {"name": "יועץ מעליות", "name_he": "יועץ מעליות", "category": "specialty"},
    {"name": "יועץ תקשורת", "name_he": "יועץ תקשורת", "category": "specialty"},

    # Management
    {"name": "מנהל פרויקט", "name_he": "מנהל פרויקט", "category": "management"},
]


async def seed_consultant_types():
    """
    Seed consultant types.
    This function is idempotent - running it multiple times won't create duplicates.
    """
    async with AsyncSessionLocal() as session:
        try:
            types_created = 0
            types_skipped = 0

            for type_data in CONSULTANT_TYPES:
                # Check if consultant type already exists by name (idempotent)
                result = await session.execute(
                    select(ConsultantType).where(ConsultantType.name == type_data["name"])
                )
                existing_type = result.scalar_one_or_none()

                if existing_type:
                    types_skipped += 1
                    continue

                # Create new consultant type
                consultant_type = ConsultantType(
                    name=type_data["name"],
                    name_he=type_data["name_he"],
                    category=type_data["category"]
                )
                session.add(consultant_type)
                types_created += 1

            await session.commit()

            print(f"Successfully seeded {types_created} consultant types")
            if types_skipped > 0:
                print(f"Skipped {types_skipped} existing consultant types")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding consultant types: {e}")
            raise


def main():
    """Entry point for running the seed script."""
    asyncio.run(seed_consultant_types())


if __name__ == "__main__":
    main()
