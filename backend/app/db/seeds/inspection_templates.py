"""Seed script for inspection consultant types and stages

Data source: פיקוחים עליונים - כמות בדיקות.xlsx
"""
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.inspection import ConsultantType, InspectionStage


async def seed_inspection_templates():
    """Seed inspection consultant types and their stages"""
    async with AsyncSessionLocal() as session:
        try:
            # Check if data already exists (idempotent)
            result = await session.execute(select(ConsultantType))
            existing_count = len(result.scalars().all())

            if existing_count > 0:
                print(f"Inspection templates already seeded ({existing_count} consultant types exist)")
                return

            # Define consultant types with stages
            # Data from: פיקוחים עליונים - כמות בדיקות.xlsx
            consultant_data = [
                {
                    "name_en": "Agronomist",
                    "name_he": "אגרונום",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"}
                    ]
                },
                {
                    "name_en": "Soil",
                    "name_he": "קרקע",
                    "stages": [
                        {"stage_number": 1, "name_en": "Drilling", "name_he": "קידוחים"},
                        {"stage_number": 2, "name_en": "Anchors", "name_he": "עוגנים"},
                        {"stage_number": 3, "name_en": "Steel Supports", "name_he": "תמיכות פלדה"},
                        {"stage_number": 4, "name_en": "Excavation", "name_he": "חפירה"}
                    ]
                },
                {
                    "name_en": "Hydrologist",
                    "name_he": "הידרולוג",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"}
                    ]
                },
                {
                    "name_en": "Waterproofing",
                    "name_he": "איטום",
                    "stages": [
                        {"stage_number": 1, "name_en": "Foundation Slab", "name_he": "רפסודה"},
                        {"stage_number": 2, "name_en": "Retaining Walls", "name_he": "קירות דיפון"},
                        {"stage_number": 3, "name_en": "Wet Rooms", "name_he": "חדרים רטובים"},
                        {"stage_number": 4, "name_en": "Roofs", "name_he": "גגות"},
                        {"stage_number": 5, "name_en": "Basement Ceiling", "name_he": "תקרת מרתף"}
                    ]
                },
                {
                    "name_en": "Structural",
                    "name_he": "קונסטרוקטור",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"},
                        {"stage_number": 5, "name_en": "Stage 5", "name_he": "שלב 5"}
                    ]
                },
                {
                    "name_en": "Architect",
                    "name_he": "אדריכל",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"},
                        {"stage_number": 5, "name_en": "Stage 5", "name_he": "שלב 5"},
                        {"stage_number": 6, "name_en": "Stage 6", "name_he": "שלב 6"}
                    ]
                },
                {
                    "name_en": "Electrical",
                    "name_he": "חשמל",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"},
                        {"stage_number": 5, "name_en": "Stage 5", "name_he": "שלב 5"},
                        {"stage_number": 6, "name_en": "Stage 6", "name_he": "שלב 6"}
                    ]
                },
                {
                    "name_en": "Plumbing",
                    "name_he": "אינסטלציה",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"},
                        {"stage_number": 5, "name_en": "Stage 5", "name_he": "שלב 5"},
                        {"stage_number": 6, "name_en": "Stage 6", "name_he": "שלב 6"},
                        {"stage_number": 7, "name_en": "Stage 7", "name_he": "שלב 7"}
                    ]
                },
                {
                    "name_en": "HVAC",
                    "name_he": "מיזוג אוויר",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"}
                    ]
                },
                {
                    "name_en": "Safety",
                    "name_he": "בטיחות",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"},
                        {"stage_number": 5, "name_en": "Stage 5", "name_he": "שלב 5"}
                    ]
                },
                {
                    "name_en": "Accessibility",
                    "name_he": "נגישות",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"}
                    ]
                },
                {
                    "name_en": "Traffic",
                    "name_he": "תנועה",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"}
                    ]
                },
                # TODO: Protection (מיגון) consultant type has TBD stage count - skipped for now
                {
                    "name_en": "Lighting",
                    "name_he": "תאורה",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"}
                    ]
                },
                {
                    "name_en": "Signage",
                    "name_he": "שילוט",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"}
                    ]
                },
                {
                    "name_en": "Radiation",
                    "name_he": "קרינה",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"}
                    ]
                },
                {
                    "name_en": "Aluminum",
                    "name_he": "אלומיניום",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"}
                    ]
                },
                {
                    "name_en": "Acoustics",
                    "name_he": "אקוסטיקה",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"}
                    ]
                },
                {
                    "name_en": "Green Building",
                    "name_he": "בנייה ירוקה/תרמי",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"},
                        {"stage_number": 4, "name_en": "Stage 4", "name_he": "שלב 4"}
                    ]
                },
                {
                    "name_en": "Development",
                    "name_he": "פיתוח",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"}
                    ]
                },
                {
                    "name_en": "Interior Design",
                    "name_he": "עיצוב פנים",
                    "stages": [
                        {"stage_number": 1, "name_en": "Stage 1", "name_he": "שלב 1"},
                        {"stage_number": 2, "name_en": "Stage 2", "name_he": "שלב 2"},
                        {"stage_number": 3, "name_en": "Stage 3", "name_he": "שלב 3"}
                    ]
                }
            ]

            # Create consultant types and their stages
            total_stages = 0
            for data in consultant_data:
                consultant = ConsultantType(
                    name_en=data["name_en"],
                    name_he=data["name_he"]
                )
                session.add(consultant)
                await session.flush()  # Get the ID for foreign key relationships

                for stage_data in data["stages"]:
                    stage = InspectionStage(
                        consultant_type_id=consultant.id,
                        stage_number=stage_data["stage_number"],
                        name_en=stage_data["name_en"],
                        name_he=stage_data["name_he"]
                    )
                    session.add(stage)
                    total_stages += 1

            await session.commit()
            print(f"Successfully seeded {len(consultant_data)} consultant types with {total_stages} total stages")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding inspection templates: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_inspection_templates())
